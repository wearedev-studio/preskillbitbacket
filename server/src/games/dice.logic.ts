import { IGameLogic, GameMove, GameState } from './game.logic.interface';
import { Room } from '../socket';
import { DiceGameEngine, DiceGameState, DiceMove } from './dice-engine';

export interface IDiceGameState {
    currentPlayer: number;
    scores: [number, number];
    turnScore: number;
    dice: number[];
    selectedDice: boolean[];
    availableDice: number;
    gamePhase: 'ROLLING' | 'SELECTING' | 'BANKING' | 'FINISHED';
    winner: number | null;
    canRoll: boolean;
    canBank: boolean;
    mustRoll: boolean;
    lastRoll: number[];
    rollCount: number;
    turn: string;
}

export class DiceGameLogic implements IGameLogic {
    public createInitialState(players: Room['players']): IDiceGameState {
        return {
            currentPlayer: 0,
            scores: [0, 0],
            turnScore: 0,
            dice: [1, 2, 3, 4, 5, 6], // Start with visible dice
            selectedDice: [false, false, false, false, false, false],
            availableDice: 6,
            gamePhase: 'ROLLING',
            winner: null,
            canRoll: true,
            canBank: false,
            mustRoll: true,
            lastRoll: [],
            rollCount: 0,
            turn: (players[0].user as any)._id.toString()
        };
    }

    public processMove(gameState: GameState, move: GameMove, playerId: string, players: Room['players']): { newState: GameState; error?: string; turnShouldSwitch: boolean } {
        const diceState = gameState as IDiceGameState;
        
        // Validate it's the player's turn
        if (diceState.turn !== playerId) {
            return {
                newState: diceState,
                error: 'Not your turn',
                turnShouldSwitch: false
            };
        }

        // Validate and process move directly without engine
        const diceMove = this.convertToDiceMove(move);
        if (!diceMove) {
            return {
                newState: diceState,
                error: 'Invalid move format',
                turnShouldSwitch: false
            };
        }

        console.log(`[Dice] Processing move:`, diceMove, 'for player:', playerId);

        // Process move directly
        const result = this.processMoveDirect(diceState, diceMove, playerId, players);
        
        return result;
    }

    public checkGameEnd(gameState: GameState, players: Room['players']): { isGameOver: boolean; winnerId?: string; isDraw: boolean } {
        const diceState = gameState as IDiceGameState;
        
        if (diceState.winner !== null) {
            return {
                isGameOver: true,
                winnerId: (players[diceState.winner].user as any)._id.toString(),
                isDraw: false
            };
        }

        return {
            isGameOver: false,
            isDraw: false
        };
    }

    public makeBotMove(gameState: GameState, playerIndex: 0 | 1): GameMove {
        const diceState = gameState as IDiceGameState;
        
        console.log(`[Bot] Making move for player ${playerIndex}, current player: ${diceState.currentPlayer}, phase: ${diceState.gamePhase}`);
        
        if (playerIndex !== diceState.currentPlayer) {
            console.log('[Bot] Not bot\'s turn, returning default roll');
            return { type: 'ROLL' };
        }

        switch (diceState.gamePhase) {
            case 'ROLLING':
                console.log('[Bot] Rolling dice');
                return { type: 'ROLL' };

            case 'SELECTING':
                // Bot strategy: Select the highest scoring combination
                const availableDice = diceState.dice
                    .map((value, index) => ({ value, index }))
                    .filter((_, index) => !diceState.selectedDice[index]);

                console.log('[Bot] Available dice for selection:', availableDice);
                const bestSelection = this.getBestSelection(availableDice);
                console.log('[Bot] Best selection found:', bestSelection);
                
                if (bestSelection.length > 0) {
                    return {
                        type: 'SELECT_DICE',
                        diceIndices: bestSelection
                    };
                } else {
                    console.log('[Bot] No valid selection found, defaulting to roll');
                    return { type: 'ROLL' };
                }

            case 'BANKING':
                // Bot strategy: Bank if safe, continue if risky but potentially rewarding
                const riskThreshold = this.calculateRiskThreshold(diceState, playerIndex);
                console.log(`[Bot] Banking decision - turn score: ${diceState.turnScore}, threshold: ${riskThreshold}, canRoll: ${diceState.canRoll}`);
                
                if (diceState.turnScore >= riskThreshold || !diceState.canRoll) {
                    console.log('[Bot] Banking points');
                    return { type: 'BANK_POINTS' };
                } else {
                    console.log('[Bot] Rolling again');
                    return { type: 'ROLL' };
                }
        }

        console.log('[Bot] Default case, returning roll');
        return { type: 'ROLL' };
    }

    private setEngineState(engine: any, state: IDiceGameState): void {
        // Properly restore the engine state
        engine.state = {
            currentPlayer: state.currentPlayer,
            scores: [...state.scores], // Copy arrays
            turnScore: state.turnScore,
            dice: [...state.dice],
            selectedDice: [...state.selectedDice],
            availableDice: state.availableDice,
            gamePhase: state.gamePhase,
            winner: state.winner,
            canRoll: state.canRoll,
            canBank: state.canBank,
            mustRoll: state.mustRoll,
            lastRoll: [...state.lastRoll],
            rollCount: state.rollCount
        };
        console.log('[Bot] Engine state set:', engine.state);
    }

    private convertToGameState(engineState: DiceGameState, players: Room['players']): IDiceGameState {
        return {
            ...engineState,
            turn: (players[engineState.currentPlayer].user as any)._id.toString()
        };
    }

    private convertToDiceMove(move: GameMove): DiceMove | null {
        const moveObj = move as any;
        
        if (!moveObj || typeof moveObj.type !== 'string') {
            return null;
        }

        switch (moveObj.type) {
            case 'ROLL':
            case 'BANK_POINTS':
                return { type: moveObj.type };
            case 'SELECT_DICE':
                if (Array.isArray(moveObj.diceIndices)) {
                    return {
                        type: moveObj.type,
                        diceIndices: moveObj.diceIndices
                    };
                }
                return null;
            default:
                return null;
        }
    }

    private getPlayerIndex(playerId: string): number {
        return parseInt(playerId) % 2;
    }

    private isValidMove(move: any): boolean {
        if (!move || typeof move.type !== 'string') {
            return false;
        }

        switch (move.type) {
            case 'ROLL':
            case 'BANK_POINTS':
                return true;
            case 'SELECT_DICE':
                return Array.isArray(move.diceIndices) && 
                       move.diceIndices.every((i: any) => typeof i === 'number' && i >= 0 && i < 6);
            default:
                return false;
        }
    }

    private generateValidSelections(availableDice: { value: number; index: number }[]): number[][] {
        const selections: number[][] = [];
        const dice = availableDice.map(d => d.value);
        const indices = availableDice.map(d => d.index);

        // Generate all possible combinations and check which ones score
        for (let i = 1; i < (1 << dice.length); i++) {
            const combination: number[] = [];
            const combinationIndices: number[] = [];
            
            for (let j = 0; j < dice.length; j++) {
                if (i & (1 << j)) {
                    combination.push(dice[j]);
                    combinationIndices.push(indices[j]);
                }
            }

            if (this.calculateSelectionPoints(combination) > 0) {
                selections.push(combinationIndices);
            }
        }

        return selections;
    }

    private getBestSelection(availableDice: { value: number; index: number }[]): number[] {
        const validSelections = this.generateValidSelections(availableDice);
        let bestSelection: number[] = [];
        let bestScore = 0;

        for (const selection of validSelections) {
            const dice = selection.map(i => availableDice.find(d => d.index === i)!.value);
            const score = this.calculateSelectionPoints(dice);
            
            if (score > bestScore) {
                bestScore = score;
                bestSelection = selection;
            }
        }

        return bestSelection;
    }

    private calculateSelectionPoints(dice: number[]): number {
        if (dice.length === 0) return 0;

        const counts = this.getDiceCounts(dice);
        let points = 0;

        // Check for special combinations first
        if (dice.length === 6) {
            if (this.isStraight(dice)) return 1500;
            if (this.isThreePairs(dice)) return 1500;
        }

        // Check for multiples of same number
        for (let num = 1; num <= 6; num++) {
            const count = counts[num];
            if (count >= 3) {
                if (count === 6) {
                    points += 3000;
                } else if (count === 5) {
                    points += 2000;
                } else if (count === 4) {
                    points += 1000;
                } else if (count === 3) {
                    if (num === 1) {
                        points += 1000;
                    } else {
                        points += num * 100;
                    }
                }
                
                // Add remaining singles
                const remaining = count - 3;
                if (num === 1) {
                    points += remaining * 100;
                } else if (num === 5) {
                    points += remaining * 50;
                }
            } else {
                // Just singles
                if (num === 1) {
                    points += count * 100;
                } else if (num === 5) {
                    points += count * 50;
                }
            }
        }

        return points;
    }

    private getDiceCounts(dice: number[]): Record<number, number> {
        const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
        dice.forEach(die => counts[die]++);
        return counts;
    }

    private isStraight(dice: number[]): boolean {
        if (dice.length !== 6) return false;
        const sorted = [...dice].sort();
        return sorted.join('') === '123456';
    }

    private isThreePairs(dice: number[]): boolean {
        if (dice.length !== 6) return false;
        const counts = this.getDiceCounts(dice);
        const pairs = Object.values(counts).filter(count => count === 2);
        return pairs.length === 3;
    }

    private calculateRiskThreshold(gameState: DiceGameState, playerIndex: number): number {
        const currentScore = gameState.scores[playerIndex];
        const opponentScore = gameState.scores[1 - playerIndex];
        const turnScore = gameState.turnScore;

        // Conservative play when ahead
        if (currentScore > opponentScore + 2000) {
            return Math.min(500, turnScore);
        }

        // Aggressive play when behind
        if (currentScore < opponentScore - 2000) {
            return Math.max(1000, turnScore * 2);
        }

        // Balanced play
        if (turnScore < 300) return 500;
        if (turnScore < 600) return 750;
        return 1000;
    }

    private processMoveDirect(gameState: IDiceGameState, move: DiceMove, playerId: string, players: Room['players']): { newState: IDiceGameState; error?: string; turnShouldSwitch: boolean } {
        const newState = { ...gameState };
        
        console.log(`[Dice] Processing direct move: ${move.type}, current phase: ${newState.gamePhase}`);

        switch (move.type) {
            case 'ROLL':
                if (!newState.canRoll) {
                    return { newState: gameState, error: 'Cannot roll dice now', turnShouldSwitch: false };
                }

                // Roll available dice
                const newDice = [...newState.dice];
                for (let i = 0; i < 6; i++) {
                    if (!newState.selectedDice[i]) {
                        newDice[i] = Math.floor(Math.random() * 6) + 1;
                    }
                }

                newState.dice = newDice;
                newState.lastRoll = newDice.filter((_, i) => !newState.selectedDice[i]);
                newState.rollCount++;
                newState.gamePhase = 'SELECTING';
                newState.canRoll = false;

                // Check if any scoring combinations exist
                const availableDice = newState.dice.filter((_, i) => !newState.selectedDice[i]);
                const hasScoring = this.hasAnyScoring(availableDice);

                if (!hasScoring) {
                    // Farkle! Lose all turn points
                    console.log('[Dice] Farkle! No scoring dice');
                    newState.turnScore = 0;
                    newState.gamePhase = 'ROLLING';
                    this.switchPlayerDirect(newState, players);
                    return { newState, turnShouldSwitch: true };
                }

                console.log('[Dice] Roll successful, available dice:', availableDice);
                return { newState, turnShouldSwitch: false };

            case 'SELECT_DICE':
                if (newState.gamePhase !== 'SELECTING') {
                    return { newState: gameState, error: 'Cannot select dice now', turnShouldSwitch: false };
                }

                const diceIndices = move.diceIndices || [];
                
                // Validate selection
                const availableIndices = diceIndices.filter(i => !newState.selectedDice[i]);
                if (availableIndices.length !== diceIndices.length) {
                    return { newState: gameState, error: 'Cannot select already selected dice', turnShouldSwitch: false };
                }

                // Calculate points for selected dice
                const selectedValues = diceIndices.map(i => newState.dice[i]);
                const points = this.calculateSelectionPoints(selectedValues);

                if (points === 0) {
                    return { newState: gameState, error: 'Selected dice do not score any points', turnShouldSwitch: false };
                }

                // Mark dice as selected
                diceIndices.forEach(i => {
                    newState.selectedDice[i] = true;
                });

                newState.turnScore += points;
                newState.availableDice = newState.selectedDice.filter(selected => !selected).length;

                // If all dice are selected, reset for hot dice
                if (newState.availableDice === 0) {
                    newState.selectedDice = [false, false, false, false, false, false];
                    newState.availableDice = 6;
                }

                newState.gamePhase = 'BANKING';
                newState.canRoll = true;
                newState.canBank = this.canPlayerBankDirect(newState);

                console.log(`[Dice] Selected dice for ${points} points, turn score now: ${newState.turnScore}`);
                return { newState, turnShouldSwitch: false };

            case 'BANK_POINTS':
                if (!newState.canBank) {
                    return { newState: gameState, error: 'Cannot bank points now', turnShouldSwitch: false };
                }

                // Add turn score to total score
                newState.scores[newState.currentPlayer] += newState.turnScore;
                console.log(`[Dice] Banked ${newState.turnScore} points, total now: ${newState.scores[newState.currentPlayer]}`);

                // Check for win condition
                if (newState.scores[newState.currentPlayer] >= 10000) {
                    newState.winner = newState.currentPlayer;
                    newState.gamePhase = 'FINISHED';
                    return { newState, turnShouldSwitch: false };
                }

                // Reset for next player
                newState.turnScore = 0;
                newState.gamePhase = 'ROLLING';
                this.switchPlayerDirect(newState, players);

                return { newState, turnShouldSwitch: true };

            default:
                return { newState: gameState, error: 'Invalid move type', turnShouldSwitch: false };
        }
    }

    private switchPlayerDirect(gameState: IDiceGameState, players: Room['players']): void {
        gameState.currentPlayer = gameState.currentPlayer === 0 ? 1 : 0;
        gameState.selectedDice = [false, false, false, false, false, false];
        gameState.availableDice = 6;
        gameState.canRoll = true;
        gameState.canBank = false;
        gameState.rollCount = 0;
        gameState.mustRoll = gameState.scores[gameState.currentPlayer] < 500;
        gameState.turn = (players[gameState.currentPlayer].user as any)._id.toString();
        
        console.log(`[Dice] Switched to player ${gameState.currentPlayer}, turn: ${gameState.turn}`);
    }

    private canPlayerBankDirect(gameState: IDiceGameState): boolean {
        // Must have at least 500 total points to get on board
        const totalIfBanked = gameState.scores[gameState.currentPlayer] + gameState.turnScore;
        return totalIfBanked >= 500 && gameState.turnScore > 0;
    }

    private hasAnyScoring(dice: number[]): boolean {
        // Check for any scoring combinations
        const counts = this.getDiceCounts(dice);
        
        // Singles (1s and 5s)
        if (counts[1] > 0 || counts[5] > 0) return true;
        
        // Three or more of a kind
        for (let i = 1; i <= 6; i++) {
            if (counts[i] >= 3) return true;
        }
        
        // Straight
        if (this.isStraight(dice)) return true;
        
        // Three pairs
        if (this.isThreePairs(dice)) return true;
        
        return false;
    }
}