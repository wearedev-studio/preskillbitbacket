import React, { useState, useCallback, useMemo } from 'react';
import styles from './DominoBoard.module.css';
import { Domino, PlacedDomino, DominoGameState } from '../../types/entities';

export interface DominoMove {
    type: 'PLAY' | 'DRAW' | 'PASS';
    domino?: Domino;
    side?: 'left' | 'right';
}

interface DominoBoardProps {
    gameState: DominoGameState;
    onMove: (move: DominoMove) => void;
    isMyTurn: boolean;
    isGameFinished: boolean;
    myPlayerIndex: 0 | 1;
}

const DominoBoard: React.FC<DominoBoardProps> = ({
    gameState,
    onMove,
    isMyTurn,
    isGameFinished,
    myPlayerIndex
}) => {
    const [selectedDomino, setSelectedDomino] = useState<Domino | null>(null);
    const [draggedDomino, setDraggedDomino] = useState<{
        domino: Domino;
        mousePos: { x: number; y: number };
    } | null>(null);
    const [hoveredSide, setHoveredSide] = useState<'left' | 'right' | null>(null);

    console.log('[DominoBoard] Render:', {
        isMyTurn,
        isGameFinished,
        myPlayerIndex,
        currentPlayerIndex: gameState?.currentPlayerIndex,
        gameState: gameState,
        playersLength: gameState?.players?.length,
        myHandLength: gameState?.players?.[myPlayerIndex]?.hand?.length,
        boardLength: gameState?.board?.length
    });

    // Safety checks
    if (!gameState || !gameState.players || gameState.players.length < 2) {
        return (
            <div className={styles.dominoBoard}>
                <div style={{ textAlign: 'center', color: 'white', padding: '50px' }}>
                    <h3>Loading Domino...</h3>
                    <p>Waiting for game state to initialize</p>
                </div>
            </div>
        );
    }

    const myHand = gameState.players[myPlayerIndex]?.hand || [];
    const opponentHand = gameState.players[myPlayerIndex === 0 ? 1 : 0]?.hand || [];
    const isMyTurnToPlay = myPlayerIndex === gameState.currentPlayerIndex;

    // Helper functions
    const canPlayDomino = useCallback((domino: Domino): { canPlay: boolean; sides: ('left' | 'right')[] } => {
        if (!gameState || !isMyTurnToPlay) return { canPlay: false, sides: [] };
        
        // First domino can always be played
        if (gameState.board.length === 0) return { canPlay: true, sides: ['left'] };
        
        const leftEnd = gameState.board[0]?.left;
        const rightEnd = gameState.board[gameState.board.length - 1]?.right;
        const sides: ('left' | 'right')[] = [];
        
        // Check if can connect to left end
        if (domino.left === leftEnd || domino.right === leftEnd) {
            sides.push('left');
        }
        
        // Check if can connect to right end
        if (domino.left === rightEnd || domino.right === rightEnd) {
            sides.push('right');
        }
        
        return { canPlay: sides.length > 0, sides };
    }, [gameState, isMyTurnToPlay]);

    // Get valid moves for current player
    const validMoves = useMemo(() => {
        if (!isMyTurn || isGameFinished || !gameState || !myHand) return [];
        
        const moves: any[] = [];
        
        // Check each domino in hand
        myHand.forEach((domino, index) => {
            const { canPlay, sides } = canPlayDomino(domino);
            if (canPlay) {
                sides.forEach(side => {
                    moves.push({
                        type: 'PLAY',
                        domino,
                        side,
                        dominoIndex: index
                    });
                });
            }
        });
        
        // Check if can draw
        if (moves.length === 0 && gameState.boneyard.length > 0) {
            moves.push({ type: 'DRAW' });
        }
        
        // Check if can pass
        if (moves.length === 0 && gameState.boneyard.length === 0) {
            moves.push({ type: 'PASS' });
        }
        
        console.log('[DominoBoard] Valid moves:', moves.length, moves);
        return moves;
    }, [gameState, myHand, isMyTurn, isGameFinished, canPlayDomino]);

    const handleDominoClick = useCallback((domino: Domino) => {
        if (!isMyTurn || isGameFinished) return;

        if (selectedDomino && selectedDomino.id === domino.id) {
            setSelectedDomino(null);
            return;
        }

        setSelectedDomino(domino);
        
        // Auto-play if only one valid side
        const { canPlay, sides } = canPlayDomino(domino);
        if (canPlay && sides.length === 1) {
            handlePlayDomino(domino, sides[0]);
        }
    }, [isMyTurn, isGameFinished, selectedDomino, canPlayDomino]);

    const handlePlayDomino = useCallback((domino: Domino, side: 'left' | 'right') => {
        const { canPlay } = canPlayDomino(domino);
        if (!canPlay) return;
        
        onMove({
            type: 'PLAY',
            domino,
            side
        });
        setSelectedDomino(null);
    }, [canPlayDomino, onMove]);

    const handleDraw = useCallback(() => {
        onMove({ type: 'DRAW' });
        setSelectedDomino(null);
    }, [onMove]);

    const handlePass = useCallback(() => {
        onMove({ type: 'PASS' });
        setSelectedDomino(null);
    }, [onMove]);

    const handleSideClick = useCallback((side: 'left' | 'right') => {
        if (!selectedDomino || !isMyTurnToPlay) return;
        
        handlePlayDomino(selectedDomino, side);
    }, [selectedDomino, isMyTurnToPlay, handlePlayDomino]);

    // Drag and Drop handlers
    const handleDragStart = useCallback((e: React.DragEvent, domino: Domino) => {
        if (!isMyTurn || isGameFinished) {
            e.preventDefault();
            return;
        }
        
        setDraggedDomino({
            domino,
            mousePos: { x: e.clientX, y: e.clientY }
        });
        
        e.dataTransfer.setData('text/plain', JSON.stringify(domino));
        e.dataTransfer.effectAllowed = 'move';
    }, [isMyTurn, isGameFinished]);

    const handleDragEnd = useCallback(() => {
        setDraggedDomino(null);
        setHoveredSide(null);
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent, side?: 'left' | 'right') => {
        e.preventDefault();
        
        if (draggedDomino && side) {
            const { canPlay } = canPlayDomino(draggedDomino.domino);
            if (canPlay) {
                e.dataTransfer.dropEffect = 'move';
                setHoveredSide(side);
            } else {
                e.dataTransfer.dropEffect = 'none';
            }
        }
    }, [draggedDomino, canPlayDomino]);

    const handleDragLeave = useCallback(() => {
        setHoveredSide(null);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent, side?: 'left' | 'right') => {
        e.preventDefault();
        
        try {
            const dominoData = JSON.parse(e.dataTransfer.getData('text/plain'));
            
            if (side && isMyTurnToPlay) {
                handlePlayDomino(dominoData, side);
            }
        } catch (error) {
            console.error('Error parsing dropped domino data:', error);
        }
        
        setDraggedDomino(null);
        setHoveredSide(null);
    }, [isMyTurnToPlay, handlePlayDomino]);

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (draggedDomino) {
            setDraggedDomino(prev => prev ? {
                ...prev,
                mousePos: { x: e.clientX, y: e.clientY }
            } : null);
        }
    }, [draggedDomino]);

    // Mouse move effect for drag preview
    React.useEffect(() => {
        if (draggedDomino) {
            document.addEventListener('mousemove', handleMouseMove);
            return () => document.removeEventListener('mousemove', handleMouseMove);
        }
    }, [draggedDomino, handleMouseMove]);

    const renderDomino = useCallback((domino: Domino, className: string = '', onClick?: () => void, draggable: boolean = false, keyOverride?: string) => {
        const isSelected = selectedDomino && selectedDomino.id === domino.id;
        const { canPlay } = canPlayDomino(domino);
        
        return (
            <div
                key={keyOverride || domino.id}
                className={`${styles.domino} ${className} ${isSelected ? styles.selected : ''} ${canPlay ? styles.canPlay : ''}`}
                onClick={onClick}
                draggable={draggable}
                onDragStart={draggable ? (e) => handleDragStart(e, domino) : undefined}
                onDragEnd={draggable ? handleDragEnd : undefined}
                title={draggable ? `${domino.left}-${domino.right}${canPlay ? ' (playable)' : ''}` : undefined}
            >
                <div className={styles.dominoHalf}>
                    <div className={styles.dots}>
                        {Array.from({ length: domino.left }, (_, i) => (
                            <div key={i} className={styles.dot} />
                        ))}
                    </div>
                </div>
                <div className={styles.dominoDivider} />
                <div className={styles.dominoHalf}>
                    <div className={styles.dots}>
                        {Array.from({ length: domino.right }, (_, i) => (
                            <div key={i} className={styles.dot} />
                        ))}
                    </div>
                </div>
                {canPlay && (
                    <div className={styles.playableIndicator}>
                        ✓
                    </div>
                )}
            </div>
        );
    }, [selectedDomino, canPlayDomino, handleDragStart, handleDragEnd]);

    // NEW: Render domino chain with proper connections - NO OVERLAPPING!
    const renderDominoChain = useCallback(() => {
        if (gameState.board.length === 0) {
            return (
                <div className={styles.emptyBoard}>
                    <div>No dominoes on board</div>
                    <div>Play your first domino!</div>
                </div>
            );
        }

        // Calculate chain bounds to ensure everything fits
        const dominoWidth = 50;
        const dominoHeight = 25;
        const spacing = 3; // Clear gap between dominoes - NO OVERLAPPING!
        
        // Calculate how many dominoes fit per row
        const dominoesPerRow = 8;
        const totalRows = Math.ceil(gameState.board.length / dominoesPerRow);
        
        // Calculate container size based on content
        const containerWidth = dominoesPerRow * (dominoWidth + spacing) + 40; // +40 for padding
        const containerHeight = totalRows * (dominoHeight + spacing) + 40; // +40 for padding
        
        return (
            <div
                className={styles.dominoChainContainer}
                style={{
                    width: `${containerWidth}px`,
                    height: `${containerHeight}px`,
                    minHeight: `${containerHeight}px`
                }}
            >
                {gameState.board.map((domino, index) => {
                    // Snake pattern - no overlapping, clear separation
                    const row = Math.floor(index / dominoesPerRow);
                    const col = index % dominoesPerRow;
                    
                    let x, y;
                    
                    if (row % 2 === 0) {
                        // Even rows: left to right
                        x = col * (dominoWidth + spacing) + 20; // +20 for padding
                        y = row * (dominoHeight + spacing) + 20; // +20 for padding
                    } else {
                        // Odd rows: right to left (snake pattern)
                        x = (dominoesPerRow - 1 - col) * (dominoWidth + spacing) + 20;
                        y = row * (dominoHeight + spacing) + 20;
                    }
                    
                    return (
                        <div
                            key={`chain-domino-${index}`}
                            className={styles.chainDomino}
                            style={{
                                left: `${x}px`,
                                top: `${y}px`,
                                position: 'absolute',
                                zIndex: 10 + index
                            }}
                        >
                            <div className={styles.chainDominoContent}>
                                <div className={styles.chainDominoHalf}>
                                    <div className={styles.chainDots}>
                                        {Array.from({ length: domino.left }, (_, i) => (
                                            <div key={i} className={styles.chainDot} />
                                        ))}
                                    </div>
                                </div>
                                <div className={styles.chainDominoDivider} />
                                <div className={styles.chainDominoHalf}>
                                    <div className={styles.chainDots}>
                                        {Array.from({ length: domino.right }, (_, i) => (
                                            <div key={i} className={styles.chainDot} />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    }, [gameState.board]);

    const renderBoardSide = useCallback((side: 'left' | 'right', label: string) => {
        const canDropHere = selectedDomino && canPlayDomino(selectedDomino).sides.includes(side);
        const isHovered = hoveredSide === side;

        return (
            <div
                className={`${styles.boardSide} ${canDropHere ? styles.canDrop : ''} ${isHovered ? styles.dragHover : ''}`}
                onClick={() => handleSideClick(side)}
                onDragOver={(e) => handleDragOver(e, side)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, side)}
                title={canDropHere ? `Drop domino on ${side} side` : `${label} side`}
            >
                <div className={styles.sideLabel}>{label}</div>
                {canDropHere && (
                    <div className={styles.dropHint}>
                        Drop here
                    </div>
                )}
            </div>
        );
    }, [selectedDomino, canPlayDomino, hoveredSide, handleSideClick, handleDragOver, handleDragLeave, handleDrop]);

    const getGameStatusText = useCallback(() => {
        if (isGameFinished) {
            return 'Game finished';
        }
        
        if (isMyTurnToPlay) {
            if (validMoves.some(m => m.type === 'PLAY')) {
                return '🎯 Your turn - Click a domino to play!';
            } else if (validMoves.some(m => m.type === 'DRAW')) {
                return '🎲 Your turn - Draw from boneyard';
            } else {
                return '⏭️ Your turn - Pass (no valid moves)';
            }
        } else {
            return '⏳ Opponent\'s turn...';
        }
    }, [isGameFinished, isMyTurnToPlay, validMoves]);

    const getInstructions = useCallback(() => {
        if (isGameFinished) return '';
        
        if (isMyTurnToPlay) {
            if (validMoves.some(m => m.type === 'PLAY')) {
                return 'Click a domino to select it, then click on the board side where you want to place it';
            } else if (validMoves.some(m => m.type === 'DRAW')) {
                return 'No valid moves - click Draw to take a domino from the boneyard';
            } else {
                return 'No valid moves and boneyard is empty - click Pass to skip your turn';
            }
        }
        
        return '';
    }, [isGameFinished, isMyTurnToPlay, validMoves]);

    const canDraw = validMoves.some(m => m.type === 'DRAW');
    const canPass = validMoves.some(m => m.type === 'PASS');

    // Calculate remaining points for each player
    const myPoints = myHand.reduce((sum, d) => sum + d.left + d.right, 0);
    const opponentPoints = opponentHand.reduce((sum, d) => sum + d.left + d.right, 0);

    return (
        <div className={styles.dominoBoard}>
            {/* Game Info */}
            <div className={styles.gameInfo}>
                <div className={styles.playerInfo}>
                    <div className={styles.playerName}>You</div>
                    <div className={styles.playerStats}>
                        <div>Hand: {myHand.length}</div>
                        <div>Points: {myPoints}</div>
                    </div>
                </div>

                <div className={styles.boneyardInfo}>
                    <div className={styles.boneyardCount}>{gameState.boneyard.length}</div>
                    <div className={styles.boneyardLabel}>Boneyard</div>
                </div>

                <div className={styles.playerInfo}>
                    <div className={styles.playerName}>Opponent</div>
                    <div className={styles.playerStats}>
                        <div>Hand: {opponentHand.length}</div>
                        <div>Points: {opponentPoints}</div>
                    </div>
                </div>
            </div>

            {/* Game Table */}
            <div className={styles.gameTable}>
                {/* Opponent Hand */}
                <div className={styles.opponentHand}>
                    {opponentHand && opponentHand.length > 0 ? (
                        opponentHand.map((_, index) => (
                            <div key={`opponent-domino-${index}`} className={styles.dominoBack}>
                                🀫
                            </div>
                        ))
                    ) : (
                        <div className={styles.emptyHand}>Opponent: 0 dominoes</div>
                    )}
                </div>

                {/* Board Area */}
                <div className={styles.boardArea}>
                    <div className={styles.phaseIndicator}>
                        Phase: {gameState.gamePhase} | {gameState.lastAction || 'Game started'}
                    </div>
                    
                    <div className={styles.boardContainer}>
                        {gameState.board.length > 0 ? (
                            <>
                                {renderBoardSide('left', 'Left')}
                                {renderDominoChain()}
                                {renderBoardSide('right', 'Right')}
                            </>
                        ) : (
                            <div className={styles.emptyBoard}>
                                <div>No dominoes on board</div>
                                <div>Play your first domino!</div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Player Hand */}
                <div className={styles.playerHand}>
                    {myHand && myHand.length > 0 ? (
                        myHand.map((domino, index) =>
                            renderDomino(
                                domino,
                                styles.playerDomino,
                                () => handleDominoClick(domino),
                                true, // draggable
                                `player-domino-${domino.id}-${index}`
                            )
                        )
                    ) : (
                        <div className={styles.emptyHand}>Your hand: 0 dominoes</div>
                    )}
                </div>
            </div>

            {/* Instructions */}
            {getInstructions() && (
                <div className={styles.instructions}>
                    💡 {getInstructions()}
                </div>
            )}

            {/* Game Controls */}
            {isMyTurn && !isGameFinished && (
                <div className={styles.gameControls}>
                    {canDraw && (
                        <button
                            className={`${styles.controlButton} ${styles.drawButton}`}
                            onClick={handleDraw}
                            title="Draw a domino from the boneyard"
                        >
                            🎲 Draw
                        </button>
                    )}
                    {canPass && (
                        <button
                            className={`${styles.controlButton} ${styles.passButton}`}
                            onClick={handlePass}
                            title="Pass your turn (no valid moves)"
                        >
                            ⏭️ Pass
                        </button>
                    )}
                </div>
            )}

            {/* Game Status */}
            <div className={`${styles.gameStatus} ${isMyTurnToPlay ? styles.myTurn : styles.opponentTurn}`}>
                {getGameStatusText()}
            </div>

            {/* Drag Preview */}
            {draggedDomino && (
                <div
                    className={`${styles.domino} ${styles.dragPreview}`}
                    style={{
                        left: draggedDomino.mousePos.x,
                        top: draggedDomino.mousePos.y
                    }}
                >
                    <div className={styles.dominoHalf}>
                        <div className={styles.dots}>
                            {Array.from({ length: draggedDomino.domino.left }, (_, i) => (
                                <div key={i} className={styles.dot} />
                            ))}
                        </div>
                    </div>
                    <div className={styles.dominoDivider} />
                    <div className={styles.dominoHalf}>
                        <div className={styles.dots}>
                            {Array.from({ length: draggedDomino.domino.right }, (_, i) => (
                                <div key={i} className={styles.dot} />
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DominoBoard;