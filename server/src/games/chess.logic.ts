import { IGameLogic, GameMove, GameState } from './game.logic.interface';
import { Room } from '../socket';
import { ChessEngine, Position, PieceColor, ChessBoard, ChessPiece, PieceType } from './chess-engine';

type ChessState = {
    board: ChessBoard;
    currentPlayer: PieceColor;
    moveHistory: ChessMove[];
    moveCount: number;
    isGameOver: boolean;
    winner?: string;
    isDraw: boolean;
    turn: string;
    lastMove?: {
        from: Position;
        to: Position;
    };
};

type ChessMove = {
    from: Position;
    to: Position;
    promotion?: PieceType;
};

function positionFromAlgebraic(algebraic: string): Position {
    const col = algebraic.charCodeAt(0) - 97;
    const row = 8 - parseInt(algebraic[1]);
    return { row, col };
}

function positionToAlgebraic(pos: Position): string {
    const col = String.fromCharCode(97 + pos.col);
    const row = (8 - pos.row).toString();
    return col + row;
}

function convertEngineMove(move: any): ChessMove {
    if (typeof move.from === 'string') {
        return {
            from: positionFromAlgebraic(move.from),
            to: positionFromAlgebraic(move.to),
            promotion: move.promotion as PieceType
        };
    }
    return move;
}

function createEngineFromState(gameState: ChessState): ChessEngine {
    const engine = new ChessEngine();
    
    for (const move of gameState.moveHistory) {
        engine.makeMove(move.from, move.to, move.promotion);
    }
    
    return engine;
}

export const chessLogic: IGameLogic = {
    createInitialState(players: Room['players']): ChessState {
        console.log('[Chess] Creating initial state for players:', players.length);
        
        const engine = new ChessEngine();
        
        return {
            board: engine.getBoard(),
            currentPlayer: 'white',
            moveHistory: [],
            moveCount: 0,
            isGameOver: false,
            isDraw: false,
            // @ts-ignore
            turn: players[0]?.user._id.toString()
        };
    },

    processMove(gameState: ChessState, move: ChessMove, playerId: string, players: Room['players']) {
        console.log('[Chess] Processing move:', { move, playerId, currentPlayer: gameState.currentPlayer });
        
        const playerIndex = players.findIndex(p => (p.user as any)._id.toString() === playerId);
        if (playerIndex === -1) {
            console.log('[Chess] Player not found');
            return { newState: gameState, error: "Player not found.", turnShouldSwitch: false };
        }

        const expectedColor: PieceColor = playerIndex === 0 ? 'white' : 'black';
        
        if (gameState.currentPlayer !== expectedColor) {
            console.log('[Chess] Wrong player turn. Expected:', expectedColor, 'Actual:', gameState.currentPlayer);
            return { newState: gameState, error: "Not your turn.", turnShouldSwitch: false };
        }

        const engine = createEngineFromState(gameState);
        
        const convertedMove = convertEngineMove(move);
        
        const possibleMoves = engine.getPossibleMoves(convertedMove.from);
        const isValidMove = possibleMoves.some(pos =>
            pos.row === convertedMove.to.row && pos.col === convertedMove.to.col
        );
        
        if (!isValidMove) {
            console.log('[Chess] Invalid move');
            return { newState: gameState, error: "Invalid move.", turnShouldSwitch: false };
        }

        const moveSuccess = engine.makeMove(
            convertedMove.from,
            convertedMove.to,
            convertedMove.promotion
        );
        
        if (!moveSuccess) {
            console.log('[Chess] Move execution failed');
            return { newState: gameState, error: "Move cannot be executed.", turnShouldSwitch: false };
        }

        const gameStatus = engine.getGameStatus();

        let nextTurn = gameState.turn;
        if (!gameStatus.isGameOver) {
            const nextPlayerIndex = playerIndex === 0 ? 1 : 0;
            const nextPlayer = players[nextPlayerIndex];
            nextTurn = nextPlayer ? (nextPlayer.user as any)._id.toString() : gameState.turn;
        }
        
        const newGameState: ChessState = {
            board: engine.getBoard(),
            currentPlayer: engine.getCurrentPlayer(),
            moveHistory: [...gameState.moveHistory, convertedMove],
            moveCount: gameState.moveCount + 1,
            isGameOver: gameStatus.isGameOver,
            isDraw: gameStatus.isDraw,
            turn: nextTurn,
            lastMove: {
                from: convertedMove.from,
                to: convertedMove.to
            }
        };

        if (gameStatus.isGameOver && !gameStatus.isDraw && gameStatus.winner) {
            const winnerIndex = gameStatus.winner === 'white' ? 0 : 1;
            const winner = players[winnerIndex];
            if (winner) {
                newGameState.winner = (winner.user as any)._id.toString();
            }
        }

        console.log('[Chess] Move processed successfully. New player:', newGameState.currentPlayer);
        console.log('[Chess] Game status:', { isGameOver: gameStatus.isGameOver, isDraw: gameStatus.isDraw });
        
        return { newState: newGameState, error: undefined, turnShouldSwitch: true };
    },

    checkGameEnd(gameState: ChessState, players: Room['players']) {
        console.log('[Chess] Checking game end. Game over:', gameState.isGameOver);
        
        if (!gameState.isGameOver) {
            return { isGameOver: false, isDraw: false };
        }

        return { 
            isGameOver: true, 
            winnerId: gameState.winner,
            isDraw: gameState.isDraw 
        };
    },
    
    makeBotMove(gameState: ChessState, playerIndex: 0 | 1): GameMove {
        console.log('[Chess] Bot making move for player:', playerIndex);
        
        const expectedColor: PieceColor = playerIndex === 0 ? 'white' : 'black';
        
        if (gameState.currentPlayer !== expectedColor) {
            console.log(`[Chess] Bot move requested but it's not bot's turn. Expected: ${expectedColor}, Actual: ${gameState.currentPlayer}`);
            return {};
        }

        const engine = createEngineFromState(gameState);
        
        const allMoves: { from: Position; to: Position; piece: ChessPiece }[] = [];
        
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = gameState.board[row][col];
                if (piece && piece.color === expectedColor) {
                    const possibleMoves = engine.getPossibleMoves({ row, col });
                    for (const move of possibleMoves) {
                        allMoves.push({
                            from: { row, col },
                            to: move,
                            piece
                        });
                    }
                }
            }
        }

        console.log('[Chess] Available moves for bot:', allMoves.length);
        
        if (allMoves.length > 0) {
            const captureMoves = allMoves.filter(move => {
                const targetPiece = gameState.board[move.to.row][move.to.col];
                return targetPiece && targetPiece.color !== expectedColor;
            });
            
            let selectedMove;
            if (captureMoves.length > 0) {
                selectedMove = captureMoves[Math.floor(Math.random() * captureMoves.length)];
                console.log('[Chess] Bot chose capture move');
            } else {
                selectedMove = allMoves[Math.floor(Math.random() * allMoves.length)];
                console.log('[Chess] Bot chose random move');
            }
            
            const botMove = {
                from: selectedMove.from,
                to: selectedMove.to
            };
            
            console.log('[Chess] Bot move:', botMove);
            return botMove;
        }
        
        console.log('[Chess] No moves available for bot');
        return {};
    }
};