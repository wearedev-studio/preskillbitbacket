import React, { useState, useMemo } from 'react';
import styles from './CheckersBoard.module.css';

type Piece = {
    playerIndex: 0 | 1;
    isKing: boolean;
};
type CheckersGameState = {
    board: (Piece | null)[];
};
type CheckersMove = {
    from: number;
    to: number;
};

interface CheckersBoardProps {
    gameState: CheckersGameState;
    onMove: (move: CheckersMove) => void;
    isMyTurn: boolean;
    isGameFinished: boolean;
    myPlayerIndex: 0 | 1;
}

const CheckersBoard: React.FC<CheckersBoardProps> = ({ gameState, onMove, isMyTurn, isGameFinished, myPlayerIndex }) => {
    const [selectedPiece, setSelectedPiece] = useState<number | null>(null);
    const [draggedPiece, setDraggedPiece] = useState<number | null>(null);
    const [dragOverSquare, setDragOverSquare] = useState<number | null>(null);

    const getPossibleMoves = (fromIndex: number): number[] => {
        const piece = gameState.board[fromIndex];
        if (!piece || piece.playerIndex !== myPlayerIndex) return [];

        const moves: number[] = [];
        const fromRow = Math.floor(fromIndex / 8);
        const fromCol = fromIndex % 8;

        if (!piece.isKing) {
            const moveDirection = piece.playerIndex === 0 ? -1 : 1;
            for (const dCol of [-1, 1]) {
                const toRow = fromRow + moveDirection;
                const toCol = fromCol + dCol;
                const toIndex = toRow * 8 + toCol;
                
                if (toRow >= 0 && toRow < 8 && toCol >= 0 && toCol < 8) {
                    const isDark = (toRow + toCol) % 2 !== 0;
                    if (isDark && !gameState.board[toIndex]) {
                        moves.push(toIndex);
                    }
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

                    if (toRow >= 0 && toRow < 8 && toCol >= 0 && toCol < 8) {
                        const isDark = (toRow + toCol) % 2 !== 0;
                        if (isDark && !gameState.board[toIndex]) {
                            const capturedPiece = gameState.board[capturedIndex];
                            if (capturedPiece && capturedPiece.playerIndex !== piece.playerIndex) {
                                moves.push(toIndex);
                            }
                        }
                    }
                }
            }
        } else {
            for (const dRow of [-1, 1]) {
                for (const dCol of [-1, 1]) {
                    for (let i = 1; i < 8; i++) {
                        const toRow = fromRow + dRow * i;
                        const toCol = fromCol + dCol * i;
                        const toIndex = toRow * 8 + toCol;

                        if (toRow < 0 || toRow >= 8 || toCol < 0 || toCol >= 8) break;

                        const isDark = (toRow + toCol) % 2 !== 0;
                        if (!isDark) continue;

                        const targetPiece = gameState.board[toIndex];
                        if (!targetPiece) {
                            moves.push(toIndex);
                        } else {
                            break;
                        }
                    }

                    let capturedPiece: Piece | null = null;
                    let capturedIndex: number | null = null;
                    
                    for (let i = 1; i < 8; i++) {
                        const currentRow = fromRow + dRow * i;
                        const currentCol = fromCol + dCol * i;
                        const currentIndex = currentRow * 8 + currentCol;

                        if (currentRow < 0 || currentRow >= 8 || currentCol < 0 || currentCol >= 8) break;

                        const isDark = (currentRow + currentCol) % 2 !== 0;
                        if (!isDark) continue;

                        const currentPiece = gameState.board[currentIndex];
                        
                        if (currentPiece) {
                            if (currentPiece.playerIndex === piece.playerIndex) {
                                break;
                            }
                            if (capturedPiece) {
                                break;
                            }
                            capturedPiece = currentPiece;
                            capturedIndex = currentIndex;
                        } else if (capturedPiece) {
                            moves.push(currentIndex);
                        }
                    }
                }
            }
        }

        return moves;
    };

    const possibleMoves = useMemo(() => {
        if (selectedPiece === null || !isMyTurn || isGameFinished) return [];
        return getPossibleMoves(selectedPiece);
    }, [selectedPiece, gameState.board, isMyTurn, isGameFinished, myPlayerIndex]);

    const handleSquareClick = (index: number) => {
        if (!isMyTurn || isGameFinished) return;

        const piece = gameState.board[index];

        if (selectedPiece !== null) {
            if (selectedPiece === index) {
                setSelectedPiece(null);
                return;
            }
            
            if (piece && piece.playerIndex === myPlayerIndex) {
                setSelectedPiece(index);
                return;
            }
            
            if (possibleMoves.includes(index)) {
                onMove({ from: selectedPiece, to: index });
                setSelectedPiece(null);
            } else {
                setSelectedPiece(null);
            }
        } else if (piece && piece.playerIndex === myPlayerIndex) {
            setSelectedPiece(index);
        }
    };

    const handleDragStart = (e: React.DragEvent, index: number) => {
        if (!isMyTurn || isGameFinished) {
            e.preventDefault();
            return;
        }

        const piece = gameState.board[index];
        if (!piece || piece.playerIndex !== myPlayerIndex) {
            e.preventDefault();
            return;
        }

        setDraggedPiece(index);
        setSelectedPiece(index);
        
        e.dataTransfer.setData('text/plain', index.toString());
        e.dataTransfer.effectAllowed = 'move';
        
        const dragImage = e.currentTarget.cloneNode(true) as HTMLElement;
        dragImage.style.transform = 'rotate(5deg) scale(1.1)';
        dragImage.style.opacity = '0.8';
        document.body.appendChild(dragImage);
        e.dataTransfer.setDragImage(dragImage, 25, 25);
        
        setTimeout(() => document.body.removeChild(dragImage), 0);
    };

    const handleDragEnd = () => {
        setDraggedPiece(null);
        setDragOverSquare(null);
    };

    const handleDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        
        if (draggedPiece !== null && possibleMoves.includes(index)) {
            e.dataTransfer.dropEffect = 'move';
            setDragOverSquare(index);
        } else {
            e.dataTransfer.dropEffect = 'none';
            setDragOverSquare(null);
        }
    };

    const handleDragLeave = () => {
        setDragOverSquare(null);
    };

    const handleDrop = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        
        const fromIndex = parseInt(e.dataTransfer.getData('text/plain'));
        
        if (fromIndex !== null && possibleMoves.includes(index)) {
            onMove({ from: fromIndex, to: index });
            setSelectedPiece(null);
        }
        
        setDraggedPiece(null);
        setDragOverSquare(null);
    };

    return (
        <div className={styles.boardContainer}>
            <div style={{
                marginBottom: '15px',
                textAlign: 'center',
                fontSize: '16px',
                fontWeight: '500',
                color: isMyTurn ? '#059669' : '#64748b'
            }}>
                {isGameFinished ? (
                    <span style={{ color: '#dc2626' }}>Game Finished</span>
                ) : isMyTurn ? (
                    <span>Your Turn</span>
                ) : (
                    <span>Opponent's Turn</span>
                )}
            </div>
            
            <div className={styles.board}>
                {gameState.board.map((piece, index) => {
                    const row = Math.floor(index / 8);
                    const col = index % 8;
                    const isDark = (row + col) % 2 !== 0;
                    const isSelected = index === selectedPiece;
                    const isPossibleMove = possibleMoves.includes(index);
                    const isDraggedOver = dragOverSquare === index;
                    const isDragging = draggedPiece === index;

                    const squareClasses = [
                        styles.square,
                        isDark ? styles.dark : styles.light,
                        isSelected ? styles.selected : '',
                        isPossibleMove ? styles.possibleMove : '',
                        isDraggedOver ? styles.dragOver : '',
                        isDragging ? styles.dragging : ''
                    ].filter(Boolean).join(' ');

                    return (
                        <div
                            key={index}
                            className={squareClasses}
                            onClick={() => handleSquareClick(index)}
                            onDragOver={(e) => handleDragOver(e, index)}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => handleDrop(e, index)}
                        >
                            {piece && (
                                <div
                                    className={`${styles.piece} ${piece.playerIndex === 0 ? styles.player1 : styles.player0}`}
                                    draggable={isMyTurn && !isGameFinished && piece.playerIndex === myPlayerIndex}
                                    onDragStart={(e) => handleDragStart(e, index)}
                                    onDragEnd={handleDragEnd}
                                >
                                    {piece.isKing && <span style={{ fontSize: 'inherit' }}>👑</span>}
                                </div>
                            )}
                            
                            {isPossibleMove && !piece && (
                                <div className={styles.moveIndicator}></div>
                            )}
                            
                            {isPossibleMove && piece && piece.playerIndex !== myPlayerIndex && (
                                <div className={styles.captureIndicator}></div>
                            )}
                        </div>
                    );
                })}
            </div>
            
            <div style={{
                marginTop: '15px',
                display: 'flex',
                justifyContent: 'center',
                gap: '20px',
                fontSize: '12px',
                color: '#64748b'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <div style={{
                        width: '16px',
                        height: '16px',
                        borderRadius: '50%',
                        backgroundColor: '#f5f5f5',
                        border: '1px solid #ccc'
                    }}></div>
                    <span>White {myPlayerIndex === 0 ? '(You)' : ''}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <div style={{
                        width: '16px',
                        height: '16px',
                        borderRadius: '50%',
                        backgroundColor: '#1e1e1e',
                        border: '1px solid #333'
                    }}></div>
                    <span>Black {myPlayerIndex === 1 ? '(You)' : ''}</span>
                </div>
            </div>
        </div>
    );
};

export default CheckersBoard;