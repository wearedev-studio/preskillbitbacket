import React, { useState, useCallback, useMemo, useEffect } from 'react';
import styles from './BackgammonBoard.module.css';

// Types for backgammon
type PlayerColor = 'white' | 'black';

interface BackgammonPiece {
    color: PlayerColor;
}

interface Point {
    pieces: BackgammonPiece[];
}

interface DiceRoll {
    dice: [number, number];
    availableMoves: number[];
}

interface BackgammonGameState {
    board: Point[];
    bar: { white: BackgammonPiece[]; black: BackgammonPiece[] };
    home: { white: BackgammonPiece[]; black: BackgammonPiece[] };
    currentPlayer: PlayerColor;
    diceRoll: DiceRoll | null;
    moveHistory: any[];
    turnPhase: 'ROLLING' | 'MOVING';
}

interface BackgammonMove {
    from: number;
    to: number;
    dieValue: number;
}

interface BackgammonBoardProps {
    gameState: BackgammonGameState;
    onMove: (move: BackgammonMove) => void;
    onRollDice: () => void;
    isMyTurn: boolean;
    isGameFinished: boolean;
    myPlayerIndex: 0 | 1;
}

const BackgammonBoard: React.FC<BackgammonBoardProps> = ({
    gameState,
    onMove,
    onRollDice,
    isMyTurn,
    isGameFinished,
    myPlayerIndex
}) => {
    const [selectedPoint, setSelectedPoint] = useState<number | null>(null);
    const [possibleMoves, setPossibleMoves] = useState<number[]>([]);
    const [isRollingDice, setIsRollingDice] = useState(false);
    const [movingPiece, setMovingPiece] = useState<{from: number, to: number} | null>(null);

    console.log('[BackgammonBoard] Render:', {
        isMyTurn,
        isGameFinished,
        myPlayerIndex,
        currentPlayer: gameState.currentPlayer,
        turnPhase: gameState.turnPhase,
        diceRoll: gameState.diceRoll
    });

    const myColor: PlayerColor = myPlayerIndex === 0 ? 'white' : 'black';

    const getPossibleMovesForPoint = useCallback((from: number): number[] => {
        if (!gameState.diceRoll || !isMyTurn || gameState.turnPhase !== 'MOVING') {
            return [];
        }

        const moves: number[] = [];
        const direction = myColor === 'white' ? 1 : -1;

        if (from === -1) {
            if (gameState.bar[myColor].length === 0) return [];
            
            for (const dieValue of gameState.diceRoll.availableMoves) {
                const to = myColor === 'white' ? dieValue - 1 : 24 - dieValue;
                if (canPlacePieceOnPoint(to)) {
                    moves.push(to);
                }
            }
            return moves;
        }

        if (from < 0 || from >= 24) return [];
        if (gameState.board[from].pieces.length === 0) return [];
        if (gameState.board[from].pieces[gameState.board[from].pieces.length - 1].color !== myColor) return [];

        if (gameState.bar[myColor].length > 0) return [];

        for (const dieValue of gameState.diceRoll.availableMoves) {
            const to = from + (dieValue * direction);

            if (to >= 0 && to < 24 && canPlacePieceOnPoint(to)) {
                moves.push(to);
            }

            if (areAllPiecesInHome() && 
                ((myColor === 'white' && to >= 24) || (myColor === 'black' && to < 0))) {
                moves.push(-2);
            }
        }

        return moves;
    }, [gameState, isMyTurn, myColor]);

    const canPlacePieceOnPoint = useCallback((pointIndex: number): boolean => {
        if (pointIndex < 0 || pointIndex >= 24) return false;
        
        const point = gameState.board[pointIndex];
        if (point.pieces.length === 0) return true;
        if (point.pieces[0].color === myColor) return true;
        if (point.pieces.length === 1) return true; 
        
        return false;
    }, [gameState.board, myColor]);

    const areAllPiecesInHome = useCallback((): boolean => {
        const homeRange = myColor === 'white' ? [18, 19, 20, 21, 22, 23] : [0, 1, 2, 3, 4, 5];
        
        if (gameState.bar[myColor].length > 0) return false;

        let piecesOnBoard = 0;
        for (let i = 0; i < 24; i++) {
            const piecesOfColor = gameState.board[i].pieces.filter(p => p.color === myColor).length;
            if (piecesOfColor > 0) {
                if (!homeRange.includes(i)) return false;
                piecesOnBoard += piecesOfColor;
            }
        }

        return piecesOnBoard + gameState.home[myColor].length === 15;
    }, [gameState, myColor]);

    const handlePointClick = useCallback((pointIndex: number) => {
        console.log('[BackgammonBoard] Point clicked:', pointIndex);
        
        if (!isMyTurn || isGameFinished || gameState.turnPhase !== 'MOVING') {
            console.log('[BackgammonBoard] Click ignored - not my turn or wrong phase');
            return;
        }

        if (selectedPoint !== null) {
            console.log('[BackgammonBoard] Attempting move from', selectedPoint, 'to', pointIndex);
            
            if (selectedPoint === pointIndex) {
                console.log('[BackgammonBoard] Deselecting point');
                setSelectedPoint(null);
                setPossibleMoves([]);
                return;
            }

            const isValidMove = possibleMoves.includes(pointIndex);

            if (isValidMove && gameState.diceRoll) {
                const direction = myColor === 'white' ? 1 : -1;
                let dieValue = 0;

                if (selectedPoint === -1) {
                    dieValue = myColor === 'white' ? pointIndex + 1 : 24 - pointIndex;
                } else if (pointIndex === -2) {
                    const distance = myColor === 'white' ? 24 - selectedPoint : selectedPoint + 1;
                    dieValue = gameState.diceRoll.availableMoves.find(die => die >= distance) || 0;
                } else {
                    dieValue = (pointIndex - selectedPoint) * direction;
                }

                if (gameState.diceRoll.availableMoves.includes(dieValue)) {
                    const move: BackgammonMove = {
                        from: selectedPoint,
                        to: pointIndex,
                        dieValue
                    };

                    console.log('[BackgammonBoard] Sending move:', move);
                    handleMoveWithAnimation(move);
                } else {
                    console.log('[BackgammonBoard] Invalid die value:', dieValue);
                }
            } else {
                selectPoint(pointIndex);
            }
            return;
        }

        selectPoint(pointIndex);
    }, [isMyTurn, isGameFinished, selectedPoint, possibleMoves, gameState, myColor, onMove]);

    const selectPoint = useCallback((pointIndex: number) => {
        if (pointIndex === -1) {
            if (gameState.bar[myColor].length === 0) return;
            console.log('[BackgammonBoard] Selecting bar');
            setSelectedPoint(-1);
            const moves = getPossibleMovesForPoint(-1);
            setPossibleMoves(moves);
            return;
        }

        if (pointIndex < 0 || pointIndex >= 24) return;
        const point = gameState.board[pointIndex];
        if (point.pieces.length === 0) return;
        if (point.pieces[point.pieces.length - 1].color !== myColor) return;

        console.log('[BackgammonBoard] Selecting point', pointIndex);
        setSelectedPoint(pointIndex);
        const moves = getPossibleMovesForPoint(pointIndex);
        setPossibleMoves(moves);
    }, [gameState, myColor, getPossibleMovesForPoint]);

    const handleBearOffClick = useCallback(() => {
        if (selectedPoint !== null && possibleMoves.includes(-2)) {
            handlePointClick(-2);
        }
    }, [selectedPoint, possibleMoves, handlePointClick]);

    const handleRollDice = useCallback(() => {
        setIsRollingDice(true);
        onRollDice();
        
        setTimeout(() => {
            setIsRollingDice(false);
        }, 1500);
    }, [onRollDice]);

    const animateMove = useCallback((from: number, to: number) => {
        setMovingPiece({ from, to });
        setTimeout(() => {
            setMovingPiece(null);
        }, 500);
    }, []);

    const handleMoveWithAnimation = useCallback((move: BackgammonMove) => {
        animateMove(move.from, move.to);
        setTimeout(() => {
            onMove(move);
            setSelectedPoint(null);
            setPossibleMoves([]);
        }, 250);
    }, [onMove, animateMove]);

    const renderPiece = useCallback((piece: BackgammonPiece, index: number, pointIndex?: number) => {
        const isMoving = movingPiece && pointIndex !== undefined &&
            (pointIndex === movingPiece.from || pointIndex === movingPiece.to);
        
        const pieceClass = `${styles.piece} ${piece.color === 'white' ? styles.whitePiece : styles.blackPiece} ${
            isMoving ? styles.pieceMoving : ''
        }`;
        
        return (
            <div key={index} className={pieceClass} />
        );
    }, [movingPiece]);

    const renderPoint = useCallback((pointIndex: number, isTop: boolean) => {
        const point = gameState.board[pointIndex];
        const isSelected = selectedPoint === pointIndex;
        const isPossibleMove = possibleMoves.includes(pointIndex);
        const isDark = pointIndex % 2 === 1;

        let pointClass = `${styles.point}`;
        if (isDark) pointClass += ` ${styles.darkPoint}`;
        else pointClass += ` ${styles.lightPoint}`;
        if (isSelected) pointClass += ` ${styles.selectedPoint}`;
        if (isPossibleMove) pointClass += ` ${styles.possibleMove}`;

        const triangleClass = `${styles.pointTriangle} ${isTop ? styles.topTriangle : styles.bottomTriangle}`;
        const piecesClass = `${styles.piecesContainer} ${isTop ? styles.topPiecesContainer : styles.bottomPiecesContainer}`;

        return (
            <div
                key={pointIndex}
                className={pointClass}
                onClick={() => handlePointClick(pointIndex)}
            >
                <div className={triangleClass} />
                <div className={piecesClass}>
                    {point.pieces.slice(0, 5).map((piece, index) => renderPiece(piece, index, pointIndex))}
                    {point.pieces.length > 5 && (
                        <div className={styles.pieceCount}>
                            {point.pieces.length}
                        </div>
                    )}
                </div>
            </div>
        );
    }, [gameState.board, selectedPoint, possibleMoves, handlePointClick, renderPiece]);

    const renderDice = useCallback(() => {
        if (!gameState.diceRoll && !isRollingDice) return null;

        return (
            <div className={styles.diceContainer}>
                {isRollingDice ? (
                    <>
                        <div className={`${styles.die} ${styles.diceRolling}`}>
                            ?
                        </div>
                        <div className={`${styles.die} ${styles.diceRolling}`}>
                            ?
                        </div>
                    </>
                ) : gameState.diceRoll ? (
                    <>
                        {gameState.diceRoll.dice.map((die, index) => (
                            <div key={index} className={styles.die}>
                                {die}
                            </div>
                        ))}
                        {gameState.diceRoll.availableMoves.map((move, index) => (
                            <div key={`move-${index}`} className={`${styles.die} ${styles.usedDie}`}>
                                {move}
                            </div>
                        ))}
                    </>
                ) : null}
            </div>
        );
    }, [gameState.diceRoll, isRollingDice]);

    return (
        <div className={styles.backgammonBoard}>
            <div className={styles.gameInfo}>
                <div className={styles.playerInfo}>
                    <div className={styles.playerName}>
                        {myPlayerIndex === 0 ? 'You' : 'Opponent'}
                    </div>
                    <div className={styles.playerColor}>
                        White (moves first)
                    </div>
                </div>

                <div className={styles.diceSection}>
                    {isMyTurn && gameState.turnPhase === 'ROLLING' && !isGameFinished && (
                        <button
                            onClick={handleRollDice}
                            className={styles.rollButton}
                            disabled={isRollingDice}
                        >
                            {isRollingDice ? 'Rolling...' : 'Roll Dice'}
                        </button>
                    )}
                    {renderDice()}
                </div>

                <div className={styles.playerInfo}>
                    <div className={styles.playerName}>
                        {myPlayerIndex === 1 ? 'You' : 'Opponent'}
                    </div>
                    <div className={styles.playerColor}>
                        Black
                    </div>
                </div>
            </div>

            <div className={styles.boardContainer}>
                <div className={styles.pointNumbers}>
                    {Array.from({ length: 24 }, (_, i) => {
                        const pointNum = i < 12 ? 12 - i : i + 1;
                        return (
                            <div key={i} className={styles.pointNumber}>
                                {pointNum}
                            </div>
                        );
                    })}
                </div>

                <div className={styles.boardGrid}>
                    <div className={styles.topSection}>
                        <div className={styles.leftQuadrant}>
                            {Array.from({ length: 6 }, (_, i) => renderPoint(12 - i - 1, true))}
                        </div>
                        
                        <div className={styles.rightQuadrant}>
                            {Array.from({ length: 6 }, (_, i) => renderPoint(6 - i - 1, true))}
                        </div>
                    </div>

                    <div className={styles.middleBar}>
                        <span style={{ color: '#e2e8f0', fontWeight: 'bold', fontSize: 'clamp(10px, 2vw, 14px)' }}>
                            BAR
                        </span>
                    </div>

                    <div className={styles.bottomSection}>
                        <div className={styles.leftQuadrant}>
                            {Array.from({ length: 6 }, (_, i) => renderPoint(12 + i, false))}
                        </div>
                        
                        <div className={styles.rightQuadrant}>
                            {Array.from({ length: 6 }, (_, i) => renderPoint(18 + i, false))}
                        </div>
                    </div>
                </div>

                <div
                    className={styles.bar}
                    onClick={() => handlePointClick(-1)}
                >
                    <div className={styles.barPieces}>
                        {gameState.bar.white.map((piece, index) => renderPiece(piece, index, -1))}
                    </div>
                    <div className={styles.barPieces}>
                        {gameState.bar.black.map((piece, index) => renderPiece(piece, index, -1))}
                    </div>
                </div>

                <div
                    className={styles.bearOffZone}
                    onClick={handleBearOffClick}
                >
                    <div className={styles.bearOffLabel}>BEAR OFF</div>
                    <div className={styles.bearOffPieces}>
                        {gameState.home.white.map((piece, index) => renderPiece(piece, index, -2))}
                    </div>
                    <div className={styles.bearOffPieces}>
                        {gameState.home.black.map((piece, index) => renderPiece(piece, index, -2))}
                    </div>
                </div>
            </div>

            <div className={`${styles.gameStatus} ${
                isGameFinished ? styles.gameFinished : 
                isMyTurn ? styles.myTurn : styles.opponentTurn
            }`}>
                {isGameFinished ? (
                    <span>Game Finished</span>
                ) : isMyTurn ? (
                    gameState.turnPhase === 'ROLLING' ? 
                        <span>🎲 Your Turn - Roll Dice</span> :
                        <span>🟢 Your Turn - Make Moves</span>
                ) : (
                    <span>🟡 Opponent's Turn</span>
                )}
            </div>

            {gameState.moveHistory && gameState.moveHistory.length > 0 && (
                <div className={styles.moveHistory}>
                    <strong>Move History:</strong> {gameState.moveHistory.length} moves
                </div>
            )}
        </div>
    );
};

export default BackgammonBoard;