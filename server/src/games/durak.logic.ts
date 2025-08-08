import { IGameLogic, GameMove, GameState } from './game.logic.interface';
import { Room } from '../socket';
import { DurakEngine, Card, DurakGameState } from './durak-engine';

type DurakMove = {
    type: 'ATTACK' | 'DEFEND' | 'PASS' | 'TAKE';
    card?: Card;
    attackIndex?: number;
};

export const durakLogic: IGameLogic = {
    createInitialState(players: Room['players']): DurakGameState {
        console.log('[Durak] Creating initial state for Attack/Defense Durak with players:', players.length);
        
        if (players.length < 2) {
            console.log('[Durak] Not enough players to start game');
            // Return a basic state for single player waiting
            return {
                deck: [],
                trumpSuit: 'hearts',
                trumpCard: null,
                players: [
                    { hand: [], isAttacker: true },
                    { hand: [], isAttacker: false }
                ],
                table: [],
                phase: 'DEALING',
                turn: players.length > 0 ? (players[0].user as any)._id.toString() : '',
                currentAttackerIndex: 0,
                currentDefenderIndex: 1,
                gameOver: false,
                lastAction: 'Waiting for players'
            };
        }
        
        const engine = new DurakEngine();
        const gameState = engine.getGameState();
        
        // Set the turn to the first player (attacker)
        gameState.turn = (players[0].user as any)._id.toString();
        gameState.phase = 'ATTACKING'; // Make sure we start in attacking phase
        
        console.log('[Durak] Initial state created for Attack/Defense Durak:', {
            turn: gameState.turn,
            phase: gameState.phase,
            player1Hand: gameState.players[0]?.hand?.length,
            player2Hand: gameState.players[1]?.hand?.length,
            trumpSuit: gameState.trumpSuit,
            currentAttacker: gameState.currentAttackerIndex,
            currentDefender: gameState.currentDefenderIndex
        });
        
        return gameState;
    },

    processMove(gameState: DurakGameState, move: DurakMove, playerId: string, players: Room['players']) {
        console.log('[Durak] Processing move for Attack/Defense Durak:', { move, playerId, phase: gameState.phase });
        
        const playerIndex = players.findIndex(p => (p.user as any)._id.toString() === playerId);
        if (playerIndex === -1) {
            console.log('[Durak] Player not found');
            return { newState: gameState, error: "Player not found.", turnShouldSwitch: false };
        }

        // Check if it's the player's turn
        if (gameState.turn !== playerId) {
            console.log('[Durak] Not player\'s turn. Expected:', gameState.turn, 'Actual:', playerId);
            return { newState: gameState, error: "It's not your turn.", turnShouldSwitch: false };
        }

        // Validate move based on current phase and player role
        if (gameState.phase === 'ATTACKING' && playerIndex !== gameState.currentAttackerIndex) {
            return { newState: gameState, error: "You are not the attacker.", turnShouldSwitch: false };
        }
        
        if (gameState.phase === 'DEFENDING' && playerIndex !== gameState.currentDefenderIndex) {
            return { newState: gameState, error: "You are not the defender.", turnShouldSwitch: false };
        }

        // Create engine instance with current state
        const engine = new DurakEngine();
        // Set the engine state to current game state
        (engine as any).gameState = { ...gameState };

        // Process the move
        const moveResult = engine.makeMove(move, playerIndex);
        
        if (!moveResult.success) {
            console.log('[Durak] Invalid move:', moveResult.error);
            return { newState: gameState, error: moveResult.error || "Invalid move.", turnShouldSwitch: false };
        }

        const newGameState = engine.getGameState();
        
        // Determine next turn
        let nextTurn = gameState.turn;
        let turnShouldSwitch = false;
        
        if (!newGameState.gameOver) {
            if (newGameState.phase === 'ATTACKING') {
                // Attacker's turn
                const attackerIndex = newGameState.currentAttackerIndex;
                const attacker = players[attackerIndex];
                if (attacker) {
                    nextTurn = (attacker.user as any)._id.toString();
                    turnShouldSwitch = nextTurn !== playerId;
                }
            } else if (newGameState.phase === 'DEFENDING') {
                // Defender's turn
                const defenderIndex = newGameState.currentDefenderIndex;
                const defender = players[defenderIndex];
                if (defender) {
                    nextTurn = (defender.user as any)._id.toString();
                    turnShouldSwitch = nextTurn !== playerId;
                }
            }
        }

        newGameState.turn = nextTurn;

        console.log('[Durak] Move processed successfully. Phase:', newGameState.phase, 'Next turn:', nextTurn, 'Attacker:', newGameState.currentAttackerIndex, 'Defender:', newGameState.currentDefenderIndex);
        
        return { newState: newGameState, error: undefined, turnShouldSwitch };
    },

    checkGameEnd(gameState: DurakGameState, players: Room['players']) {
        console.log('[Durak] Checking game end for Attack/Defense Durak. Game over:', gameState.gameOver);
        
        if (!gameState.gameOver) {
            return { isGameOver: false, isDraw: false };
        }

        // In Attack/Defense Durak, the player who gets rid of all cards first wins
        let winnerId: string | undefined;
        
        if (gameState.winner) {
            const winnerIndex = parseInt(gameState.winner.replace('player', ''));
            const winner = players[winnerIndex];
            if (winner) {
                winnerId = (winner.user as any)._id.toString();
            }
        }

        return { 
            isGameOver: true, 
            winnerId,
            isDraw: false // Durak doesn't have draws
        };
    },
    
    makeBotMove(gameState: DurakGameState, playerIndex: 0 | 1): GameMove {
        console.log('[Durak] Bot making move for Attack/Defense Durak, player:', playerIndex);
        
        // Check if it's bot's turn
        const expectedPlayerId = gameState.turn;
        const botIsAttacker = playerIndex === gameState.currentAttackerIndex;
        const botIsDefender = playerIndex === gameState.currentDefenderIndex;
        
        if (!botIsAttacker && !botIsDefender) {
            console.log('[Durak] Bot move requested but it\'s not bot\'s turn');
            return {};
        }

        // Create engine instance to get valid moves
        const engine = new DurakEngine();
        (engine as any).gameState = { ...gameState };
        
        const validMoves = engine.getValidMoves(playerIndex);
        console.log('[Durak] Available moves for bot:', validMoves.length);
        
        if (validMoves.length === 0) {
            return {};
        }

        // Bot AI strategy for Attack/Defense Durak
        let selectedMove;
        
        if (gameState.phase === 'ATTACKING') {
            // Attack strategy: prefer lowest value cards, avoid trump cards unless necessary
            const attackMoves = validMoves.filter(move => move.type === 'ATTACK');
            const passMoves = validMoves.filter(move => move.type === 'PASS');
            
            if (attackMoves.length > 0) {
                // Sort by card value (prefer lower cards) and trump status (prefer non-trump)
                attackMoves.sort((a, b) => {
                    const aIsTrump = a.card.suit === gameState.trumpSuit;
                    const bIsTrump = b.card.suit === gameState.trumpSuit;
                    
                    if (aIsTrump !== bIsTrump) {
                        return aIsTrump ? 1 : -1; // Prefer non-trump
                    }
                    
                    return a.card.value - b.card.value; // Prefer lower value
                });
                
                // 70% chance to attack, 30% chance to pass if possible
                if (passMoves.length > 0 && Math.random() < 0.3) {
                    selectedMove = passMoves[0];
                } else {
                    selectedMove = attackMoves[0];
                }
            } else if (passMoves.length > 0) {
                selectedMove = passMoves[0];
            }
        } else if (gameState.phase === 'DEFENDING') {
            // Defense strategy: use minimal cards to defend, take if defense is too costly
            const defendMoves = validMoves.filter(move => move.type === 'DEFEND');
            const takeMoves = validMoves.filter(move => move.type === 'TAKE');
            
            if (defendMoves.length > 0) {
                // Count undefended attacks
                const undefendedAttacks = gameState.table.filter(pair => pair.defendCard === null).length;
                
                // If too many attacks to defend (more than 3), consider taking
                if (undefendedAttacks > 3 && Math.random() < 0.6) {
                    selectedMove = takeMoves[0];
                } else {
                    // Sort defend moves by card value (prefer lower cards) and trump status
                    defendMoves.sort((a, b) => {
                        const aIsTrump = a.card.suit === gameState.trumpSuit;
                        const bIsTrump = b.card.suit === gameState.trumpSuit;
                        
                        if (aIsTrump !== bIsTrump) {
                            return aIsTrump ? 1 : -1; // Prefer non-trump
                        }
                        
                        return a.card.value - b.card.value; // Prefer lower value
                    });
                    
                    selectedMove = defendMoves[0];
                }
            } else {
                selectedMove = takeMoves[0];
            }
        }
        
        if (selectedMove) {
            console.log('[Durak] Bot selected move:', selectedMove.type);
            return {
                type: selectedMove.type,
                card: selectedMove.card,
                attackIndex: selectedMove.attackIndex
            };
        }
        
        console.log('[Durak] No valid moves for bot');
        return {};
    }
};