import { IGameLogic, GameMove, GameState } from './game.logic.interface';
import { Room } from '../socket';

type Piece = {
    playerIndex: 0 | 1;
    isKing: boolean;
};

type CheckersState = {
    board: (Piece | null)[];
    turn: string;
    mustCaptureWith: number | null;
};

type CheckersMove = {
    from: number;
    to: number;
    isCapture: boolean;

};

function getMovesForPiece(board: (Piece | null)[], fromIndex: number): CheckersMove[] {
    const piece = board[fromIndex];
    if (!piece) return [];

    const moves: CheckersMove[] = [];
    const fromRow = Math.floor(fromIndex / 8);
    const fromCol = fromIndex % 8;
    
    if (!piece.isKing) {
        const moveDirection = piece.playerIndex === 0 ? -1 : 1;
        for (const dCol of [-1, 1]) {
            const toRow = fromRow + moveDirection;
            const toCol = fromCol + dCol;
            const toIndex = toRow * 8 + toCol;
            if (toRow >= 0 && toRow < 8 && toCol >= 0 && toCol < 8 && board[toIndex] === null) {
                moves.push({ from: fromIndex, to: toIndex, isCapture: false });
            }
        }
        for (const dRow of [-1, 1]) {
            for (const dCol of [-1, 1]) {
                const capturedRow = fromRow + dRow;
                const capturedCol = fromCol + dCol;
                const capturedIndex = capturedRow * 8 + capturedCol;
                const toRow = fromRow + dRow * 2;
                const toCol = fromCol + dCol * 2;
                const toIndex = toRow * 8 + toCol;

                if (toRow >= 0 && toRow < 8 && toCol >= 0 && toCol < 8 && board[toIndex] === null) {
                    const capturedPiece = board[capturedIndex];
                    if (capturedPiece && capturedPiece.playerIndex !== piece.playerIndex) {
                        moves.push({ from: fromIndex, to: toIndex, isCapture: true });
                    }
                }
            }
        }
    }
    else {
        for (const dRow of [-1, 1]) {
            for (const dCol of [-1, 1]) {
                let capturedPiece: Piece | null = null;
                let capturedIndex: number | null = null;
                
                for (let i = 1; i < 8; i++) {
                    const currentRow = fromRow + dRow * i;
                    const currentCol = fromCol + dCol * i;
                    const currentIndex = currentRow * 8 + currentCol;

                    if (currentRow < 0 || currentRow >= 8 || currentCol < 0 || currentCol >= 8) break;

                    const currentPiece = board[currentIndex];
                    
                    if (currentPiece) {
                        if (currentPiece.playerIndex === piece.playerIndex) {
                            break;
                        }
                        if (capturedPiece) {
                            break;
                        }
                        capturedPiece = currentPiece;
                        capturedIndex = currentIndex;
                    } else {
                        if (capturedPiece) {
                            moves.push({ from: fromIndex, to: currentIndex, isCapture: true });
                        } else {
                            moves.push({ from: fromIndex, to: currentIndex, isCapture: false });
                        }
                    }
                }
            }
        }
    }
    return moves;
}

function getAllLegalMoves(board: (Piece | null)[], playerIndex: 0 | 1): CheckersMove[] {
    let allMoves: CheckersMove[] = [];
    for (let i = 0; i < 64; i++) {
        if (board[i] && board[i]?.playerIndex === playerIndex) {
            allMoves.push(...getMovesForPiece(board, i));
        }
    }
    const mandatoryCaptures = allMoves.filter(move => move.isCapture);
    return mandatoryCaptures.length > 0 ? mandatoryCaptures : allMoves;
}

export const checkersLogic: IGameLogic = {
    createInitialState(players: Room['players']): CheckersState {
        const board: (Piece | null)[] = Array(64).fill(null);
        for (let i = 0; i < 64; i++) {
            const row = Math.floor(i / 8);
            const col = i % 8;
            if ((row + col) % 2 !== 0) {
                if (row >= 5) board[i] = { playerIndex: 0, isKing: false };
                else if (row <= 2) board[i] = { playerIndex: 1, isKing: false };
            }
        }
        
        // @ts-ignore
        return { board, turn: players[0].user._id.toString(), mustCaptureWith: null };
    },

     processMove(gameState: CheckersState, move: CheckersMove, playerId: string, players: Room['players']) {
        if (gameState.turn !== playerId) {
            return { newState: gameState, error: "Not your turn.", turnShouldSwitch: false };
        }
        // @ts-ignore
        const playerIndex = players.findIndex(p => p.user._id.toString() === playerId) as 0 | 1;
        const legalMoves = getAllLegalMoves(gameState.board, playerIndex);

        if (gameState.mustCaptureWith !== null && move.from !== gameState.mustCaptureWith) {
             return { newState: gameState, error: "You must continue capturing with the same piece.", turnShouldSwitch: false };
        }
        
        const isMoveLegal = legalMoves.some(m => m.from === move.from && m.to === move.to);
        if (!isMoveLegal) {
            return { newState: gameState, error: "Invalid move. You may need to make a capture.", turnShouldSwitch: false };
        }

        const { from, to } = move;
        const newBoard = [...gameState.board];
        const piece = newBoard[from]!;
        newBoard[to] = piece;
        newBoard[from] = null;

        const isCapture = Math.abs(Math.floor(from / 8) - Math.floor(to / 8)) >= 2;
        if (isCapture) {
            const dRow = Math.sign(to - from);
            const dCol = Math.sign((to % 8) - (from % 8));
            let capturedIndex = -1;
            for (let i = from + dRow*8 + dCol; i !== to; i += dRow*8 + dCol) {
                if (newBoard[i] !== null) {
                    capturedIndex = i;
                    break;
                }
            }
            if (capturedIndex !== -1) {
                newBoard[capturedIndex] = null;
            }
        }
        
        const toRow = Math.floor(to / 8);
        if (!piece.isKing && ((piece.playerIndex === 0 && toRow === 0) || (piece.playerIndex === 1 && toRow === 7))) {
            newBoard[to]!.isKing = true;
        }

        let turnShouldSwitch = true;
        let nextMustCaptureWith: number | null = null;
        if (isCapture) {
            const nextCaptures = getMovesForPiece(newBoard, to).filter(m => m.isCapture);
            if (nextCaptures.length > 0) {
                turnShouldSwitch = false;
                nextMustCaptureWith = to;
            }
        }
        
        const newState: CheckersState = { ...gameState, board: newBoard, mustCaptureWith: nextMustCaptureWith };

        if (turnShouldSwitch) {
            // @ts-ignore
            const nextPlayer = players.find(p => p.user._id.toString() !== playerId)!;
            // @ts-ignore
            newState.turn = nextPlayer.user._id.toString();
        } else {
            newState.turn = playerId;
        }

        return { newState, error: undefined, turnShouldSwitch };
    },

    checkGameEnd(gameState: CheckersState, players: Room['players']) {
        const board = gameState.board;
        const currentPlayerId = gameState.turn;

        let player0Pieces = 0;
        let player1Pieces = 0;
        for (const piece of board) {
            if (piece) {
                if (piece.playerIndex === 0) player0Pieces++;
                else player1Pieces++;
            }
        }

        if (player0Pieces === 0) {
            // @ts-ignore
            return { isGameOver: true, winnerId: players[1].user._id.toString(), isDraw: false };
        }
        if (player1Pieces === 0) {
            // @ts-ignore
            return { isGameOver: true, winnerId: players[0].user._id.toString(), isDraw: false };
        }
        
        // @ts-ignore
        const currentPlayerIndex = players.findIndex(p => p.user._id.toString() === currentPlayerId) as 0 | 1;
        // @ts-ignore
        const nextPlayer = players.find(p => p.user._id.toString() !== currentPlayerId);
        // @ts-ignore
        const nextPlayerIndex = players.findIndex(p => p.user._id.toString() === nextPlayer?.user._id.toString()) as 0 | 1;

        if (!nextPlayer) {
            return { isGameOver: true, winnerId: currentPlayerId, isDraw: false };
        }

        const legalMovesForCurrentPlayer = getAllLegalMoves(board, currentPlayerIndex);
        if (legalMovesForCurrentPlayer.length === 0) {
            // @ts-ignore
            return { isGameOver: true, winnerId: nextPlayer.user._id.toString(), isDraw: false };
        }

        const legalMovesForNextPlayer = getAllLegalMoves(board, nextPlayerIndex);
        if (legalMovesForNextPlayer.length === 0) {
            return { isGameOver: true, winnerId: currentPlayerId, isDraw: false };
        }

        return { isGameOver: false, isDraw: false };
    },
    
    makeBotMove(gameState: CheckersState, playerIndex: 0 | 1): GameMove {
        const legalMoves = getAllLegalMoves(gameState.board, playerIndex);
        if (legalMoves.length > 0) {
            return legalMoves[Math.floor(Math.random() * legalMoves.length)];
        }
        return {}; 
    }
};
