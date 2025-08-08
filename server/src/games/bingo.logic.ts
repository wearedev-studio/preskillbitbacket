import { IGameLogic, GameMove, GameState } from './game.logic.interface';
import { Room } from '../socket';
import { BingoGameEngine, BingoGameState, BingoMove } from './bingo-engine';

export interface IBingoGameState extends BingoGameState {
    turn: string;
}

export class BingoGameLogic implements IGameLogic {
    public createInitialState(players: Room['players']): IBingoGameState {
        const engine = new BingoGameEngine();
        const playerIds = players.map(p => (p.user as any)._id.toString());
        const engineState = engine.initializeGame(playerIds);
        
        return {
            ...engineState,
            turn: playerIds[0]
        };
    }

    public processMove(gameState: GameState, move: GameMove, playerId: string, players: Room['players']): { newState: GameState; error?: string; turnShouldSwitch: boolean } {
        const bingoState = gameState as IBingoGameState;
        
        const bingoMove = this.convertToBingoMove(move);
        if (!bingoMove) {
            return {
                newState: bingoState,
                error: 'Invalid move format',
                turnShouldSwitch: false
            };
        }

        console.log(`[Bingo] Processing move:`, bingoMove, 'for player:', playerId);

        const result = this.processMoveDirect(bingoState, bingoMove, playerId, players);
        return result;
    }

    public checkGameEnd(gameState: GameState, players: Room['players']): { isGameOver: boolean; winnerId?: string; isDraw: boolean } {
        const bingoState = gameState as IBingoGameState;
        
        if (bingoState.winner !== null) {
            return {
                isGameOver: true,
                winnerId: (players[bingoState.winner].user as any)._id.toString(),
                isDraw: false
            };
        }

        // Check for draw (all numbers called, no winner)
        if (bingoState.calledNumbers.length >= 75 && bingoState.winner === null) {
            return {
                isGameOver: true,
                isDraw: true
            };
        }

        return {
            isGameOver: false,
            isDraw: false
        };
    }

    public makeBotMove(gameState: GameState, playerIndex: 0 | 1): GameMove {
        const bingoState = gameState as IBingoGameState;
        
        console.log(`[Bot] Making bingo move for player ${playerIndex}, phase: ${bingoState.gamePhase}`);
        
        const players = bingoState.players;
        if (!players || !players[playerIndex]) {
            console.log('[Bot] No player data available');
            return { type: 'CALL_NUMBER' };
        }

        switch (bingoState.gamePhase) {
            case 'CALLING':
                // Bot automatically calls next number
                console.log('[Bot] Calling next number');
                return { type: 'CALL_NUMBER' };

            case 'MARKING':
                // Bot strategy: Mark the called number if it's on their card
                const currentNumber = bingoState.currentNumber;
                if (currentNumber !== null) {
                    const botCard = bingoState.players[playerIndex].card;
                    const hasNumber = this.isNumberOnCard(botCard, currentNumber);
                    
                    // Check if already marked
                    const botMarkedNumbers = bingoState.players[playerIndex].markedNumbers;
                    const isAlreadyMarked = botMarkedNumbers instanceof Set ?
                        botMarkedNumbers.has(currentNumber) :
                        Array.isArray(botMarkedNumbers) ? (botMarkedNumbers as number[]).includes(currentNumber) : false;
                    
                    if (hasNumber && !isAlreadyMarked) {
                        console.log(`[Bot] Marking number ${currentNumber}`);
                        
                        // Check if bot can win after marking this number
                        const tempMarked = new Set(botMarkedNumbers instanceof Set ? botMarkedNumbers : (Array.isArray(botMarkedNumbers) ? botMarkedNumbers : []));
                        tempMarked.add(currentNumber);
                        
                        const engine = new BingoGameEngine();
                        engine.state = { ...bingoState };
                        engine.state.players[playerIndex].markedNumbers = tempMarked;
                        
                        const hasWin = engine.checkForWin(playerIndex);
                        if (hasWin) {
                            console.log('[Bot] Can win after marking - will claim BINGO!');
                            // First mark the number, then claim bingo in next move
                            return { type: 'MARK_NUMBER', number: currentNumber };
                        }
                        
                        return { type: 'MARK_NUMBER', number: currentNumber };
                    }
                }
                
                // Check if bot can claim bingo with current marked numbers
                const engine = new BingoGameEngine();
                engine.state = bingoState;
                const hasWin = engine.checkForWin(playerIndex);
                if (hasWin) {
                    console.log('[Bot] Claiming BINGO!');
                    return { type: 'CLAIM_BINGO' };
                }
                
                // If no number to mark and can't win, continue the game
                console.log('[Bot] Nothing to do in marking phase, continuing game');
                return { type: 'CONTINUE_GAME' };

            default:
                console.log('[Bot] Default case, calling number');
                return { type: 'CALL_NUMBER' };
        }
    }

    private convertToBingoMove(move: GameMove): BingoMove | null {
        const moveObj = move as any;
        
        if (!moveObj || typeof moveObj.type !== 'string') {
            return null;
        }

        switch (moveObj.type) {
            case 'CALL_NUMBER':
            case 'CLAIM_BINGO':
            case 'CONTINUE_GAME':
                return { type: moveObj.type };
            case 'MARK_NUMBER':
                if (typeof moveObj.number === 'number') {
                    return {
                        type: moveObj.type,
                        number: moveObj.number
                    };
                }
                return null;
            default:
                return null;
        }
    }

    private processMoveDirect(gameState: IBingoGameState, move: BingoMove, playerId: string, players: Room['players']): { newState: IBingoGameState; error?: string; turnShouldSwitch: boolean } {
        const newState = { ...gameState };
        const engine = new BingoGameEngine();
        engine.state = newState;
        
        const playerIndex = players.findIndex(p => (p.user as any)._id.toString() === playerId);
        if (playerIndex === -1) {
            return { newState: gameState, error: 'Player not found', turnShouldSwitch: false };
        }

        console.log(`[Bingo] Processing direct move: ${move.type}, current phase: ${newState.gamePhase}`);

        switch (move.type) {
            case 'CALL_NUMBER':
                // Auto-call numbers - any player can trigger this
                const callResult = engine.callNextNumber();
                if (!callResult.success) {
                    return { newState: gameState, error: callResult.error, turnShouldSwitch: false };
                }

                newState.currentNumber = callResult.number!;
                newState.calledNumbers = [...engine.state.calledNumbers];
                newState.gamePhase = 'MARKING';
                newState.callHistory = [...engine.state.callHistory];

                console.log(`[Bingo] Called number: ${callResult.number}`);
                
                return { newState, turnShouldSwitch: false };

            case 'MARK_NUMBER':
                // Players can mark numbers anytime during MARKING phase
                if (!move.number) {
                    return { newState: gameState, error: 'Number is required', turnShouldSwitch: false };
                }

                const markResult = engine.markNumber(playerIndex, move.number);
                if (!markResult.success) {
                    return { newState: gameState, error: markResult.error, turnShouldSwitch: false };
                }

                newState.players[playerIndex].markedNumbers = new Set(engine.state.players[playerIndex].markedNumbers);
                console.log(`[Bingo] Player ${playerIndex} marked number: ${move.number}`);

                return { newState, turnShouldSwitch: false };

            case 'CONTINUE_GAME':
                // Continue to next number calling phase
                if (newState.gamePhase === 'MARKING') {
                    newState.gamePhase = 'CALLING';
                    console.log(`[Bingo] Continuing game - back to CALLING phase`);
                }
                return { newState, turnShouldSwitch: false };

            case 'CLAIM_BINGO':
                // Players can claim BINGO anytime
                const claimResult = engine.claimBingo(playerIndex);
                if (!claimResult.success) {
                    return { newState: gameState, error: claimResult.error, turnShouldSwitch: false };
                }

                if (claimResult.isWinner) {
                    newState.winner = playerIndex;
                    newState.gamePhase = 'FINISHED';
                    newState.players[playerIndex].hasWon = true;
                    console.log(`[Bingo] Player ${playerIndex} won with BINGO!`);
                    return { newState, turnShouldSwitch: false };
                } else {
                    // False bingo claim, continue game
                    return { newState, error: 'No winning pattern found', turnShouldSwitch: false };
                }

            default:
                return { newState: gameState, error: 'Invalid move type', turnShouldSwitch: false };
        }
    }

    private switchPlayerDirect(gameState: IBingoGameState, players: Room['players']): void {
        gameState.currentPlayer = gameState.currentPlayer === 0 ? 1 : 0;
        gameState.gamePhase = 'CALLING';
        gameState.turn = (players[gameState.currentPlayer].user as any)._id.toString();
        
        console.log(`[Bingo] Switched to player ${gameState.currentPlayer}, turn: ${gameState.turn}`);
    }

    private isNumberOnCard(card: any, number: number): boolean {
        return (
            card.B.includes(number) ||
            card.I.includes(number) ||
            card.N.includes(number) ||
            card.G.includes(number) ||
            card.O.includes(number)
        );
    }

    private markNumberForBot(gameState: IBingoGameState, playerIndex: number, number: number): { success: boolean; error?: string } {
        const player = gameState.players[playerIndex];
        if (!player) {
            return { success: false, error: 'Invalid player' };
        }

        if (!gameState.calledNumbers.includes(number)) {
            return { success: false, error: 'Number has not been called' };
        }

        const hasNumber = this.isNumberOnCard(player.card, number);
        if (!hasNumber) {
            return { success: false, error: 'Number not on card' };
        }

        player.markedNumbers.add(number);
        return { success: true };
    }
}