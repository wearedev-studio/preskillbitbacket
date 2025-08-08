import React, { useState, useCallback, useMemo } from 'react';
import styles from './DurakBoard.module.css';

// Types for Attack/Defense Durak game
export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Rank = '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

export interface Card {
    suit: Suit;
    rank: Rank;
    value: number;
}

export interface TablePair {
    attackCard: Card;
    defendCard: Card | null;
}

export type GamePhase = 'DEALING' | 'ATTACKING' | 'DEFENDING' | 'DRAWING' | 'GAME_OVER';

export interface DurakGameState {
    deck: Card[];
    trumpSuit: Suit;
    trumpCard: Card | null;
    players: {
        hand: Card[];
        isAttacker: boolean;
    }[];
    table: TablePair[];
    phase: GamePhase;
    turn: string;
    currentAttackerIndex: number;
    currentDefenderIndex: number;
    gameOver: boolean;
    winner?: string;
    lastAction?: string;
}

export interface DurakMove {
    type: 'ATTACK' | 'DEFEND' | 'PASS' | 'TAKE';
    card?: Card;
    attackIndex?: number;
}

interface DurakBoardProps {
    gameState: DurakGameState;
    onMove: (move: DurakMove) => void;
    isMyTurn: boolean;
    isGameFinished: boolean;
    myPlayerIndex: 0 | 1;
}

const SUIT_SYMBOLS: Record<Suit, string> = {
    hearts: '♥',
    diamonds: '♦',
    clubs: '♣',
    spades: '♠'
};

const RANK_NAMES: Record<Rank, string> = {
    '6': '6',
    '7': '7',
    '8': '8',
    '9': '9',
    '10': '10',
    'J': 'J',
    'Q': 'Q',
    'K': 'K',
    'A': 'A'
};

const DurakBoard: React.FC<DurakBoardProps> = ({
    gameState,
    onMove,
    isMyTurn,
    isGameFinished,
    myPlayerIndex
}) => {
    const [selectedCard, setSelectedCard] = useState<Card | null>(null);
    const [draggedCard, setDraggedCard] = useState<{
        card: Card;
        mousePos: { x: number; y: number };
    } | null>(null);
    const [hoveredDefendSlot, setHoveredDefendSlot] = useState<number | null>(null);

    console.log('[DurakBoard] Render Attack/Defense Durak:', {
        isMyTurn,
        isGameFinished,
        myPlayerIndex,
        phase: gameState?.phase,
        currentAttacker: gameState?.currentAttackerIndex,
        currentDefender: gameState?.currentDefenderIndex,
        gameState: gameState,
        playersLength: gameState?.players?.length,
        myHandLength: gameState?.players?.[myPlayerIndex]?.hand?.length,
        tableCards: gameState?.table?.length
    });

    // Safety checks
    if (!gameState || !gameState.players || gameState.players.length < 2) {
        return (
            <div className={styles.durakBoard}>
                <div style={{ textAlign: 'center', color: 'white', padding: '50px' }}>
                    <h3>Loading Attack/Defense Durak...</h3>
                    <p>Waiting for game state to initialize</p>
                </div>
            </div>
        );
    }

    const myHand = gameState.players[myPlayerIndex]?.hand || [];
    const opponentHand = gameState.players[myPlayerIndex === 0 ? 1 : 0]?.hand || [];
    const isMyAttack = myPlayerIndex === gameState.currentAttackerIndex;
    const isMyDefense = myPlayerIndex === gameState.currentDefenderIndex;

    // Define helper functions first
    const canAttackWith = useCallback((card: Card): boolean => {
        if (!gameState || gameState.phase !== 'ATTACKING') return false;
        
        // First attack - any card is allowed
        if (!gameState.table || gameState.table.length === 0) return true;
        
        // Subsequent attacks - card rank must match any card on table
        const tableRanks = new Set<Rank>();
        gameState.table.forEach(pair => {
            tableRanks.add(pair.attackCard.rank);
            if (pair.defendCard) {
                tableRanks.add(pair.defendCard.rank);
            }
        });
        
        return tableRanks.has(card.rank);
    }, [gameState]);

    const canDefendWith = useCallback((card: Card, attackCard: Card): boolean => {
        if (!gameState || !card || !attackCard) return false;
        
        // Same suit - must be higher value
        if (card.suit === attackCard.suit) {
            return card.value > attackCard.value;
        }
        
        // Trump beats non-trump
        if (card.suit === gameState.trumpSuit && attackCard.suit !== gameState.trumpSuit) {
            return true;
        }
        
        return false;
    }, [gameState?.trumpSuit]);

    // Get valid moves for current player
    const validMoves = useMemo(() => {
        if (!isMyTurn || isGameFinished || !gameState || !myHand) return [];
        
        const moves: any[] = [];
        
        if (gameState.phase === 'ATTACKING' && isMyAttack) {
            // Can attack with valid cards
            myHand.forEach((card, cardIndex) => {
                if (canAttackWith(card)) {
                    moves.push({
                        type: 'ATTACK',
                        card,
                        cardIndex
                    });
                }
            });
            
            // Can pass if there are cards on table
            if (gameState.table && gameState.table.length > 0) {
                moves.push({ type: 'PASS' });
            }
        } else if (gameState.phase === 'DEFENDING' && isMyDefense) {
            // Can defend against undefended attacks
            if (gameState.table) {
                gameState.table.forEach((pair, attackIndex) => {
                    if (pair.defendCard === null) {
                        myHand.forEach((card, cardIndex) => {
                            if (canDefendWith(card, pair.attackCard)) {
                                moves.push({
                                    type: 'DEFEND',
                                    card,
                                    cardIndex,
                                    attackIndex
                                });
                            }
                        });
                    }
                });
            }
            
            // Can always take cards
            moves.push({ type: 'TAKE' });
        }
        
        console.log('[DurakBoard] Valid moves:', moves.length, moves);
        return moves;
    }, [gameState, myHand, isMyTurn, isGameFinished, isMyAttack, isMyDefense, canAttackWith, canDefendWith]);

    const handleCardClick = useCallback((card: Card) => {
        if (!isMyTurn || isGameFinished) return;

        if (selectedCard && selectedCard.suit === card.suit && selectedCard.rank === card.rank) {
            setSelectedCard(null);
            return;
        }

        setSelectedCard(card);
        
        // Auto-attack if it's attacking phase and card is valid
        if (gameState.phase === 'ATTACKING' && isMyAttack && canAttackWith(card)) {
            handleAttack(card);
        }
    }, [isMyTurn, isGameFinished, selectedCard, gameState.phase, isMyAttack, canAttackWith]);

    const handleAttack = useCallback((card: Card) => {
        if (!canAttackWith(card)) return;
        
        onMove({
            type: 'ATTACK',
            card
        });
        setSelectedCard(null);
    }, [canAttackWith, onMove]);

    const handleDefend = useCallback((card: Card, attackIndex: number) => {
        const attackCard = gameState.table[attackIndex]?.attackCard;
        if (!attackCard || !canDefendWith(card, attackCard)) return;
        
        onMove({
            type: 'DEFEND',
            card,
            attackIndex
        });
        setSelectedCard(null);
    }, [gameState.table, canDefendWith, onMove]);

    const handlePass = useCallback(() => {
        onMove({ type: 'PASS' });
        setSelectedCard(null);
    }, [onMove]);

    const handleTake = useCallback(() => {
        onMove({ type: 'TAKE' });
        setSelectedCard(null);
    }, [onMove]);

    const handleDefendSlotClick = useCallback((attackIndex: number) => {
        if (!selectedCard || !isMyDefense || gameState.phase !== 'DEFENDING') return;
        
        handleDefend(selectedCard, attackIndex);
    }, [selectedCard, isMyDefense, gameState.phase, handleDefend]);

    // Drag and Drop handlers
    const handleDragStart = useCallback((e: React.DragEvent, card: Card) => {
        if (!isMyTurn || isGameFinished) {
            e.preventDefault();
            return;
        }
        
        setDraggedCard({
            card,
            mousePos: { x: e.clientX, y: e.clientY }
        });
        
        e.dataTransfer.setData('text/plain', JSON.stringify(card));
        e.dataTransfer.effectAllowed = 'move';
    }, [isMyTurn, isGameFinished]);

    const handleDragEnd = useCallback(() => {
        setDraggedCard(null);
        setHoveredDefendSlot(null);
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent, attackIndex?: number) => {
        e.preventDefault();
        
        if (draggedCard && attackIndex !== undefined) {
            const attackCard = gameState.table?.[attackIndex]?.attackCard;
            if (attackCard && canDefendWith(draggedCard.card, attackCard)) {
                e.dataTransfer.dropEffect = 'move';
                setHoveredDefendSlot(attackIndex);
            } else {
                e.dataTransfer.dropEffect = 'none';
            }
        }
    }, [draggedCard, gameState.table, canDefendWith]);

    const handleDragLeave = useCallback(() => {
        setHoveredDefendSlot(null);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent, attackIndex?: number) => {
        e.preventDefault();
        
        try {
            const cardData = JSON.parse(e.dataTransfer.getData('text/plain'));
            
            if (attackIndex !== undefined && isMyDefense && gameState.phase === 'DEFENDING') {
                handleDefend(cardData, attackIndex);
            }
        } catch (error) {
            console.error('Error parsing dropped card data:', error);
        }
        
        setDraggedCard(null);
        setHoveredDefendSlot(null);
    }, [isMyDefense, gameState.phase, handleDefend]);

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (draggedCard) {
            setDraggedCard(prev => prev ? {
                ...prev,
                mousePos: { x: e.clientX, y: e.clientY }
            } : null);
        }
    }, [draggedCard]);

    // Mouse move effect for drag preview
    React.useEffect(() => {
        if (draggedCard) {
            document.addEventListener('mousemove', handleMouseMove);
            return () => document.removeEventListener('mousemove', handleMouseMove);
        }
    }, [draggedCard, handleMouseMove]);

    const renderCard = useCallback((card: Card, className: string = '', onClick?: () => void, draggable: boolean = false, keyOverride?: string) => {
        const isSelected = selectedCard && selectedCard.suit === card.suit && selectedCard.rank === card.rank;
        const canPlay = validMoves.some(move =>
            move.card && move.card.suit === card.suit && move.card.rank === card.rank
        );
        
        return (
            <div
                key={keyOverride || `${card.suit}-${card.rank}`}
                className={`${className} ${isSelected ? styles.selected : ''} ${canPlay ? styles.canPlay : ''}`}
                onClick={onClick}
                draggable={draggable}
                onDragStart={draggable ? (e) => handleDragStart(e, card) : undefined}
                onDragEnd={draggable ? handleDragEnd : undefined}
                title={draggable ? `${RANK_NAMES[card.rank]} of ${card.suit}${canPlay ? ' (playable)' : ''}` : undefined}
            >
                <div className={styles.cardRank}>{RANK_NAMES[card.rank]}</div>
                <div className={`${styles.cardSuit} ${styles[card.suit]}`}>
                    {SUIT_SYMBOLS[card.suit]}
                </div>
                <div className={styles.cardRank} style={{ transform: 'rotate(180deg)' }}>
                    {RANK_NAMES[card.rank]}
                </div>
                {canPlay && (
                    <div className={styles.playableIndicator}>
                        {gameState.phase === 'ATTACKING' ? '⚔️' : '🛡️'}
                    </div>
                )}
            </div>
        );
    }, [selectedCard, validMoves, handleDragStart, handleDragEnd, gameState.phase]);

    const renderTablePair = useCallback((pair: TablePair, index: number) => {
        const canDefendHere = isMyDefense &&
            gameState.phase === 'DEFENDING' &&
            pair.defendCard === null &&
            selectedCard &&
            canDefendWith(selectedCard, pair.attackCard);
        
        const isHovered = hoveredDefendSlot === index;

        return (
            <div key={index} className={styles.cardPair}>
                {renderCard(pair.attackCard, styles.attackCard)}
                {pair.defendCard ? (
                    renderCard(pair.defendCard, styles.defendCard)
                ) : (
                    <div
                        className={`${styles.defendSlot} ${canDefendHere ? styles.canDefend : ''} ${isHovered ? styles.dragHover : ''}`}
                        onClick={() => handleDefendSlotClick(index)}
                        onDragOver={(e) => handleDragOver(e, index)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, index)}
                        title={canDefendHere ? `Drop card to defend ${RANK_NAMES[pair.attackCard.rank]} of ${pair.attackCard.suit}` : 'Cannot defend here'}
                    >
                        {canDefendHere ? (
                            <div className={styles.defendHint}>
                                <div>🛡️</div>
                                <div>Defend</div>
                            </div>
                        ) : (
                            <div className={styles.defendHint}>
                                <div>⚔️</div>
                                <div>{RANK_NAMES[pair.attackCard.rank]}</div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    }, [isMyDefense, gameState.phase, selectedCard, canDefendWith, renderCard, handleDefendSlotClick, hoveredDefendSlot, handleDragOver, handleDragLeave, handleDrop]);

    const getGameStatusText = useCallback(() => {
        if (isGameFinished) {
            return 'Game Finished';
        }
        
        if (gameState.phase === 'ATTACKING') {
            if (isMyAttack) {
                if (gameState.table && gameState.table.length === 0) {
                    return '⚔️ Your Turn - Click a card to attack!';
                } else {
                    return '⚔️ Your Turn - Attack with more cards or Pass';
                }
            } else {
                return '⏳ Opponent is Attacking...';
            }
        } else if (gameState.phase === 'DEFENDING') {
            if (isMyDefense) {
                return '🛡️ Your Turn - Drag cards to defend or click Take Cards';
            } else {
                return '⏳ Opponent is Defending...';
            }
        } else if (gameState.phase === 'DRAWING') {
            return '🃏 Drawing Cards...';
        }
        
        return '⏳ Waiting...';
    }, [isGameFinished, gameState.phase, isMyAttack, isMyDefense, gameState.table]);

    const getInstructions = useCallback(() => {
        if (isGameFinished) return '';
        
        if (gameState.phase === 'ATTACKING' && isMyAttack) {
            if (!gameState.table || gameState.table.length === 0) {
                return 'Click any card from your hand to start attacking';
            } else {
                return 'Click cards with matching ranks to continue attacking, or click Pass';
            }
        } else if (gameState.phase === 'DEFENDING' && isMyDefense) {
            return 'Drag your cards to the defend slots or click Take Cards to take all table cards';
        }
        
        return '';
    }, [isGameFinished, gameState.phase, isMyAttack, isMyDefense, gameState.table]);

    const getGameStatusClass = useCallback(() => {
        if (isGameFinished) return styles.finished;
        if (!isMyTurn) return styles.waiting;
        if (gameState.phase === 'ATTACKING') return styles.attacking;
        if (gameState.phase === 'DEFENDING') return styles.defending;
        return styles.waiting;
    }, [isGameFinished, isMyTurn, gameState.phase]);

    const canPass = gameState.phase === 'ATTACKING' && isMyAttack && gameState.table.length > 0;
    const canTake = gameState.phase === 'DEFENDING' && isMyDefense;

    // Memoize player info to prevent unnecessary re-renders
    const playerInfoMemo = useMemo(() => ({
        myRole: gameState.players?.[myPlayerIndex]?.isAttacker ? 'Attacker' : 'Defender',
        opponentRole: gameState.players?.[myPlayerIndex === 0 ? 1 : 0]?.isAttacker ? 'Attacker' : 'Defender'
    }), [gameState.players, myPlayerIndex]);

    // Memoize trump info
    const trumpInfoMemo = useMemo(() => ({
        trumpCard: gameState.trumpCard,
        trumpSuit: gameState.trumpSuit,
        deckCount: gameState.deck?.length || 0
    }), [gameState.trumpCard, gameState.trumpSuit, gameState.deck?.length]);

    // Memoize empty state messages to prevent re-renders
    const emptyStates = useMemo(() => ({
        opponentEmpty: (
            <div style={{
                color: 'rgba(255, 255, 255, 0.5)',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%'
            }}>
                Opponent: 0 cards
            </div>
        ),
        tableEmpty: (
            <div style={{
                textAlign: 'center',
                color: 'rgba(255, 255, 255, 0.5)',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '100%',
                height: '100%'
            }}>
                No cards on table
            </div>
        ),
        playerEmpty: (
            <div style={{
                color: 'rgba(255, 255, 255, 0.5)',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%'
            }}>
                Your hand: 0 cards
            </div>
        )
    }), []);

    return (
        <div className={styles.durakBoard}>
            {/* Game Info */}
            <div className={styles.gameInfo}>
                <div className={styles.playerInfo}>
                    <div className={styles.playerName}>You</div>
                    <div className={styles.playerScore}>{playerInfoMemo.myRole}</div>
                </div>

                <div className={styles.trumpInfo}>
                    {trumpInfoMemo.trumpCard && (
                        <div className={styles.trumpCard}>
                            <div className={styles.cardRank}>{RANK_NAMES[trumpInfoMemo.trumpCard.rank]}</div>
                            <div className={`${styles.cardSuit} ${styles[trumpInfoMemo.trumpCard.suit]}`}>
                                {SUIT_SYMBOLS[trumpInfoMemo.trumpCard.suit]}
                            </div>
                        </div>
                    )}
                    <div className={styles.trumpLabel}>
                        Trump: {trumpInfoMemo.trumpSuit ? SUIT_SYMBOLS[trumpInfoMemo.trumpSuit] : '?'}
                    </div>
                    <div className={styles.deckInfo}>
                        <div className={styles.deckCount}>{trumpInfoMemo.deckCount}</div>
                        <div className={styles.deckLabel}>Cards Left</div>
                    </div>
                </div>

                <div className={styles.playerInfo}>
                    <div className={styles.playerName}>Opponent</div>
                    <div className={styles.playerScore}>{playerInfoMemo.opponentRole}</div>
                </div>
            </div>

            {/* Game Table */}
            <div className={styles.gameTable}>
                {/* Opponent Hand */}
                <div className={styles.opponentHand}>
                    {opponentHand && opponentHand.length > 0 ? (
                        Array.from({ length: Math.min(opponentHand.length, 12) }, (_, index) => (
                            <div key={`opponent-card-${index}`} className={styles.cardBack}>
                                🂠
                            </div>
                        ))
                    ) : emptyStates.opponentEmpty}
                </div>

                {/* Table Area */}
                <div className={styles.tableArea}>
                    <div className={styles.phaseIndicator}>
                        Phase: {gameState.phase || 'Unknown'} | {gameState.lastAction || 'Game started'}
                    </div>
                    
                    <div className={styles.tablePairs}>
                        {gameState.table && gameState.table.length > 0 ? (
                            gameState.table.map((pair, index) => renderTablePair(pair, index))
                        ) : emptyStates.tableEmpty}
                    </div>
                </div>

                {/* Player Hand */}
                <div className={styles.playerHand}>
                    {myHand && myHand.length > 0 ? (
                        myHand.slice(0, 12).map((card, index) =>
                            renderCard(
                                card,
                                styles.playerCard,
                                () => handleCardClick(card),
                                true, // draggable
                                `player-card-${card.suit}-${card.rank}-${index}`
                            )
                        )
                    ) : emptyStates.playerEmpty}
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
                    {canPass && (
                        <button
                            className={`${styles.controlButton} ${styles.passButton}`}
                            onClick={handlePass}
                            title="End your attack turn"
                        >
                            ⏭️ Pass
                        </button>
                    )}
                    {canTake && (
                        <button
                            className={`${styles.controlButton} ${styles.takeButton}`}
                            onClick={handleTake}
                            title="Take all cards from the table"
                        >
                            📥 Take ({gameState.table?.length || 0})
                        </button>
                    )}
                </div>
            )}

            {/* Game Status */}
            <div className={`${styles.gameStatus} ${getGameStatusClass()}`}>
                {getGameStatusText()}
            </div>

            {/* Drag Preview */}
            {draggedCard && (
                <div
                    className={`${styles.playerCard} ${styles.dragPreview}`}
                    style={{
                        left: draggedCard.mousePos.x,
                        top: draggedCard.mousePos.y
                    }}
                >
                    <div className={styles.cardRank}>{RANK_NAMES[draggedCard.card.rank]}</div>
                    <div className={`${styles.cardSuit} ${styles[draggedCard.card.suit]}`}>
                        {SUIT_SYMBOLS[draggedCard.card.suit]}
                    </div>
                    <div className={styles.cardRank} style={{ transform: 'rotate(180deg)' }}>
                        {RANK_NAMES[draggedCard.card.rank]}
                    </div>
                </div>
            )}
        </div>
    );
};

export default DurakBoard;