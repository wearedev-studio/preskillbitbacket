import { IGameLogic, GameMove, GameState } from './game.logic.interface';
import { Room } from '../socket';
import { DominoEngine, Domino, DominoGameState } from './domino-engine';

type DominoMove = {
    type: 'PLAY' | 'DRAW' | 'PASS';
    domino?: Domino;
    side?: 'left' | 'right';
};

export const dominoLogic: IGameLogic = {
    createInitialState(players: Room['players']): DominoGameState {
        console.log('[Domino] Creating initial state for players:', players.length);
        
        if (players.length < 2) {
            console.log('[Domino] Not enough players to start game');
            // Return a basic state for single player waiting
            return {
                players: [
                    { hand: [], score: 0 },
                    { hand: [], score: 0 }
                ],
                boneyard: [],
                board: [],
                placedDominoes: [],
                currentPlayerIndex: 0,
                turn: players.length > 0 ? (players[0].user as any)._id.toString() : '',
                gameOver: false,
                mustDraw: false,
                gamePhase: 'DEALING',
                lastAction: 'Waiting for players',
                chainEnds: {
                    left: { value: -1, position: { x: 0, y: 0 }, direction: 'left' },
                    right: { value: -1, position: { x: 0, y: 0 }, direction: 'right' }
                }
            };
        }
        
        const engine = new DominoEngine();
        const gameState = engine.getGameState();
        
        // Set the turn to the starting player
        const startingPlayerIndex = gameState.currentPlayerIndex;
        gameState.turn = (players[startingPlayerIndex].user as any)._id.toString();
        
        console.log('[Domino] Initial state created:', {
            turn: gameState.turn,
            currentPlayerIndex: gameState.currentPlayerIndex,
            player1Hand: gameState.players[0]?.hand?.length,
            player2Hand: gameState.players[1]?.hand?.length,
            boneyardSize: gameState.boneyard?.length
        });
        
        return gameState;
    },

    processMove(gameState: DominoGameState, move: DominoMove, playerId: string, players: Room['players']) {
        console.log('[Domino] Processing move:', { move, playerId, currentPlayerIndex: gameState.currentPlayerIndex, turn: gameState.turn });
        
        const playerIndex = players.findIndex(p => (p.user as any)._id.toString() === playerId);
        if (playerIndex === -1) {
            console.log('[Domino] Player not found');
            return { newState: gameState, error: "Player not found.", turnShouldSwitch: false };
        }

        // Check if it's the player's turn - allow if turn is empty (game just started)
        if (gameState.turn && gameState.turn !== playerId) {
            console.log('[Domino] Not player\'s turn. Expected:', gameState.turn, 'Actual:', playerId);
            return { newState: gameState, error: "It's not your turn.", turnShouldSwitch: false };
        }

        // Check if it's the correct player's turn based on game state
        if (playerIndex !== gameState.currentPlayerIndex) {
            console.log('[Domino] Wrong player index. Expected:', gameState.currentPlayerIndex, 'Actual:', playerIndex);
            return { newState: gameState, error: "It's not your turn.", turnShouldSwitch: false };
        }

        // Create engine instance with current state
        const engine = new DominoEngine();
        // Set the engine state to current game state
        (engine as any).gameState = { ...gameState };

        // Process the move
        const moveResult = engine.makeMove(move, playerIndex);
        
        if (!moveResult.success) {
            console.log('[Domino] Invalid move:', moveResult.error);
            return { newState: gameState, error: moveResult.error || "Invalid move.", turnShouldSwitch: false };
        }

        const newGameState = engine.getGameState();
        
        // Determine next turn
        let nextTurn = gameState.turn;
        let turnShouldSwitch = false;
        
        if (!newGameState.gameOver) {
            const nextPlayerIndex = newGameState.currentPlayerIndex;
            const nextPlayer = players[nextPlayerIndex];
            if (nextPlayer) {
                nextTurn = (nextPlayer.user as any)._id.toString();
                turnShouldSwitch = nextTurn !== playerId;
            }
        }

        newGameState.turn = nextTurn;

        console.log('[Domino] Move processed successfully. Next turn:', nextTurn, 'Current player index:', newGameState.currentPlayerIndex);
        
        return { newState: newGameState, error: undefined, turnShouldSwitch };
    },

    checkGameEnd(gameState: DominoGameState, players: Room['players']) {
        console.log('[Domino] Checking game end. Game over:', gameState.gameOver);
        
        if (!gameState.gameOver) {
            return { isGameOver: false, isDraw: false };
        }

        // Determine winner
        let winnerId: string | undefined;
        let isDraw = false;
        
        if (gameState.winner) {
            const winnerIndex = parseInt(gameState.winner.replace('player', ''));
            const winner = players[winnerIndex];
            if (winner) {
                winnerId = (winner.user as any)._id.toString();
            }
        } else {
            // Check if it's a draw (blocked game with equal points)
            const player1Points = gameState.players[0].hand.reduce((sum, d) => sum + d.left + d.right, 0);
            const player2Points = gameState.players[1].hand.reduce((sum, d) => sum + d.left + d.right, 0);
            isDraw = player1Points === player2Points;
        }

        return { 
            isGameOver: true, 
            winnerId,
            isDraw
        };
    },
    
    makeBotMove(gameState: DominoGameState, playerIndex: 0 | 1): GameMove {
        console.log('[Domino] Bot making move for player:', playerIndex);
        
        // Check if it's bot's turn
        if (playerIndex !== gameState.currentPlayerIndex) {
            console.log('[Domino] Bot move requested but it\'s not bot\'s turn');
            return {};
        }

        // Create engine instance to get valid moves
        const engine = new DominoEngine();
        (engine as any).gameState = { ...gameState };
        
        const validMoves = engine.getValidMoves(playerIndex);
        console.log('[Domino] Available moves for bot:', validMoves.length);
        
        if (validMoves.length === 0) {
            return {};
        }

        // Bot AI strategy for Domino
        let selectedMove;
        
        // Prioritize playing dominoes over drawing
        const playMoves = validMoves.filter(move => move.type === 'PLAY');
        const drawMoves = validMoves.filter(move => move.type === 'DRAW');
        const passMoves = validMoves.filter(move => move.type === 'PASS');
        
        if (playMoves.length > 0) {
            // Strategy: prefer playing dominoes with higher pip count to get rid of high-value dominoes
            playMoves.sort((a, b) => {
                const aValue = a.domino.left + a.domino.right;
                const bValue = b.domino.left + b.domino.right;
                return bValue - aValue; // Higher value first
            });
            
            selectedMove = playMoves[0];
        } else if (drawMoves.length > 0) {
            selectedMove = drawMoves[0];
        } else if (passMoves.length > 0) {
            selectedMove = passMoves[0];
        }
        
        if (selectedMove) {
            console.log('[Domino] Bot selected move:', selectedMove.type);
            return {
                type: selectedMove.type,
                domino: selectedMove.domino,
                side: selectedMove.side
            };
        }
        
        console.log('[Domino] No valid moves for bot');
        return {};
    }
};