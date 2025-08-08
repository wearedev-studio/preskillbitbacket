import React, { useState, useEffect } from 'react';
import styles from './BingoBoard.module.css';

interface BingoCard {
    B: number[];
    I: number[];
    N: number[];
    G: number[];
    O: number[];
}

interface BingoGameState {
    currentPlayer: number;
    players: {
        card: BingoCard;
        markedNumbers: Set<number> | number[] | null | undefined;
        hasWon: boolean;
    }[];
    calledNumbers: number[];
    currentNumber: number | null;
    gamePhase: 'WAITING' | 'CALLING' | 'MARKING' | 'FINISHED';
    winner: number | null;
    turn: string;
    numberPool: number[];
    callHistory: { number: number; timestamp: number }[];
}

interface BingoBoardProps {
    gameState: BingoGameState;
    onMove: (move: any) => void;
    isMyTurn: boolean;
    isGameFinished: boolean;
    myPlayerIndex: 0 | 1;
}

const BingoBoard: React.FC<BingoBoardProps> = ({
    gameState,
    onMove,
    isMyTurn,
    isGameFinished,
    myPlayerIndex
}) => {
    const [animatingNumber, setAnimatingNumber] = useState<number | null>(null);
    const [recentlyMarked, setRecentlyMarked] = useState<number | null>(null);

    useEffect(() => {
        if (gameState.currentNumber && gameState.currentNumber !== animatingNumber) {
            setAnimatingNumber(gameState.currentNumber);
            setTimeout(() => setAnimatingNumber(null), 2000);
        }
    }, [gameState.currentNumber]);

    const handleCallNumber = () => {
        if (gameState.gamePhase !== 'CALLING' || isGameFinished) return;
        onMove({ type: 'CALL_NUMBER' });
    };

    const handleMarkNumber = (number: number) => {
        if (gameState.gamePhase !== 'MARKING' || isGameFinished) return;
        if (!gameState.calledNumbers.includes(number)) return;
        
        const myPlayer = gameState.players?.[myPlayerIndex];
        if (!myPlayer?.card) return;
        
        const hasNumber = isNumberOnCard(myPlayer.card, number);
        if (!hasNumber) return;

        // Check if number is already marked
        let markedSet: Set<number>;
        if (myPlayer.markedNumbers instanceof Set) {
            markedSet = myPlayer.markedNumbers;
        } else if (Array.isArray(myPlayer.markedNumbers)) {
            markedSet = new Set(myPlayer.markedNumbers);
        } else {
            markedSet = new Set();
        }
        
        if (markedSet.has(number)) return; // Already marked

        setRecentlyMarked(number);
        setTimeout(() => setRecentlyMarked(null), 1000);
        
        onMove({ type: 'MARK_NUMBER', number });
    };

    const handleClaimBingo = () => {
        if (gameState.gamePhase !== 'MARKING' || isGameFinished) return;
        onMove({ type: 'CLAIM_BINGO' });
    };

    const handleContinueGame = () => {
        if (gameState.gamePhase !== 'MARKING' || isGameFinished) return;
        onMove({ type: 'CONTINUE_GAME' });
    };

    const isNumberOnCard = (card: BingoCard, number: number): boolean => {
        return (
            card.B.includes(number) ||
            card.I.includes(number) ||
            card.N.includes(number) ||
            card.G.includes(number) ||
            card.O.includes(number)
        );
    };

    const getNumberColumn = (number: number): string => {
        if (number >= 1 && number <= 15) return 'B';
        if (number >= 16 && number <= 30) return 'I';
        if (number >= 31 && number <= 45) return 'N';
        if (number >= 46 && number <= 60) return 'G';
        if (number >= 61 && number <= 75) return 'O';
        return '';
    };

    const renderBingoCard = (card: BingoCard, markedNumbers: Set<number> | number[] | null | undefined, isMyCard: boolean) => {
        const columns = [
            { letter: 'B', numbers: card.B },
            { letter: 'I', numbers: card.I },
            { letter: 'N', numbers: card.N },
            { letter: 'G', numbers: card.G },
            { letter: 'O', numbers: card.O }
        ];

        return (
            <div className={`${styles.bingoCard} ${isMyCard ? styles.myCard : styles.opponentCard}`}>
                <div className={styles.cardHeader}>
                    {columns.map(col => (
                        <div key={col.letter} className={styles.columnHeader}>
                            {col.letter}
                        </div>
                    ))}
                </div>
                <div className={styles.cardGrid}>
                    {[0, 1, 2, 3, 4].map(row => (
                        <div key={row} className={styles.cardRow}>
                            {columns.map((col, colIndex) => {
                                const number = col.numbers[row];
                                let markedSet: Set<number>;
                                
                                if (markedNumbers instanceof Set) {
                                    markedSet = markedNumbers;
                                } else if (Array.isArray(markedNumbers)) {
                                    markedSet = new Set(markedNumbers);
                                } else {
                                    markedSet = new Set();
                                }
                                
                                const isMarked = markedSet.has(number) || (colIndex === 2 && row === 2 && number === 0);
                                const isFreeSpace = colIndex === 2 && row === 2 && number === 0;
                                const isClickable = isMyCard && gameState.gamePhase === 'MARKING' && gameState.calledNumbers.includes(number) && !isMarked && !isFreeSpace;
                                const isRecentlyMarked = recentlyMarked === number;
                                
                                return (
                                    <div
                                        key={`${col.letter}-${row}`}
                                        className={`${styles.cardCell} 
                                            ${isMarked ? styles.marked : ''} 
                                            ${isFreeSpace ? styles.freeSpace : ''}
                                            ${isClickable ? styles.clickable : ''}
                                            ${isRecentlyMarked ? styles.recentlyMarked : ''}
                                        `}
                                        onClick={() => !isFreeSpace && isClickable && handleMarkNumber(number)}
                                    >
                                        {isFreeSpace ? 'FREE' : number}
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    const getPhaseMessage = (): string => {
        if (isGameFinished) return 'Game Finished';
        
        switch (gameState.gamePhase) {
            case 'CALLING':
                return 'Click to call the next number!';
            case 'MARKING':
                return 'Mark your numbers or claim BINGO!';
            default:
                return 'Waiting for game to start...';
        }
    };

    const myCard = gameState.players?.[myPlayerIndex];
    const opponentCard = gameState.players?.[myPlayerIndex === 0 ? 1 : 0];

    // Safety check - if no players data, show loading
    if (!myCard || !opponentCard) {
        return (
            <div className={styles.bingoBoard}>
                <div style={{ textAlign: 'center', padding: '50px' }}>
                    <h3>Loading Bingo Game...</h3>
                    <p>Waiting for game data...</p>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.bingoBoard}>
            {/* Current Number Display */}
            <div className={styles.numberDisplay}>
                <div className={styles.currentNumberContainer}>
                    {gameState.currentNumber && (
                        <div className={`${styles.currentNumber} ${animatingNumber ? styles.animating : ''}`}>
                            <div className={styles.numberColumn}>
                                {getNumberColumn(gameState.currentNumber)}
                            </div>
                            <div className={styles.numberValue}>
                                {gameState.currentNumber}
                            </div>
                        </div>
                    )}
                    {!gameState.currentNumber && (
                        <div className={styles.waitingForNumber}>
                            Waiting for number...
                        </div>
                    )}
                </div>
            </div>

            {/* Phase Message */}
            <div className={styles.phaseMessage}>
                {getPhaseMessage()}
            </div>

            {/* Bingo Cards */}
            <div className={styles.cardsContainer}>
                <div className={styles.cardSection}>
                    <h3>Your Card</h3>
                    {renderBingoCard(myCard.card, myCard.markedNumbers, true)}
                </div>
                
                <div className={styles.cardSection}>
                    <h3>Opponent's Card</h3>
                    {renderBingoCard(opponentCard.card, opponentCard.markedNumbers, false)}
                </div>
            </div>

            {/* Action Buttons */}
            <div className={styles.actionsContainer}>
                {gameState.gamePhase === 'CALLING' && (
                    <button
                        className={`${styles.actionButton} ${styles.callButton}`}
                        onClick={handleCallNumber}
                        disabled={isGameFinished}
                    >
                        🎱 Call Number
                    </button>
                )}

                {gameState.gamePhase === 'MARKING' && (
                    <>
                        <button
                            className={`${styles.actionButton} ${styles.bingoButton}`}
                            onClick={handleClaimBingo}
                            disabled={isGameFinished}
                        >
                            🏆 BINGO!
                        </button>
                        <button
                            className={`${styles.actionButton} ${styles.callButton}`}
                            onClick={handleContinueGame}
                            disabled={isGameFinished}
                        >
                            ➡️ Continue
                        </button>
                    </>
                )}
            </div>

            {/* Called Numbers History */}
            <div className={styles.calledNumbers}>
                <h4>Called Numbers ({gameState.calledNumbers.length}/75)</h4>
                <div className={styles.numbersGrid}>
                    {gameState.calledNumbers.slice(-20).map((number, index) => (
                        <div 
                            key={number} 
                            className={`${styles.calledNumber} ${number === gameState.currentNumber ? styles.latest : ''}`}
                        >
                            {getNumberColumn(number)}-{number}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default BingoBoard;