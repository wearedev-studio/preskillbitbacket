import React, { useState, useEffect } from 'react';
import styles from './DiceBoard.module.css';

interface DiceGameState {
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

interface DiceBoardProps {
    gameState: DiceGameState;
    onMove: (move: any) => void;
    isMyTurn: boolean;
    isGameFinished: boolean;
    myPlayerIndex: 0 | 1;
}

const DiceBoard: React.FC<DiceBoardProps> = ({
    gameState,
    onMove,
    isMyTurn,
    isGameFinished,
    myPlayerIndex
}) => {
    const [selectedDiceIndices, setSelectedDiceIndices] = useState<number[]>([]);
    const [animatingDice, setAnimatingDice] = useState<boolean[]>([false, false, false, false, false, false]);

    useEffect(() => {
        // Reset selection when game phase changes
        if (gameState.gamePhase !== 'SELECTING') {
            setSelectedDiceIndices([]);
        }
    }, [gameState.gamePhase]);

    const handleRollDice = () => {
        if (!isMyTurn || !gameState.canRoll || isGameFinished) return;
        
        // Animate dice roll - hide values during animation
        setAnimatingDice(gameState.selectedDice.map(selected => !selected));
        
        // Send move immediately
        onMove({ type: 'ROLL' });
        
        // Stop animation after it completes
        setTimeout(() => {
            setAnimatingDice([false, false, false, false, false, false]);
        }, 2000);
    };

    const handleDiceClick = (index: number) => {
        if (!isMyTurn || gameState.gamePhase !== 'SELECTING' || gameState.selectedDice[index]) return;
        
        const newSelection = selectedDiceIndices.includes(index)
            ? selectedDiceIndices.filter(i => i !== index)
            : [...selectedDiceIndices, index];
        
        setSelectedDiceIndices(newSelection);
    };

    const handleSelectDice = () => {
        if (selectedDiceIndices.length === 0) return;
        
        onMove({
            type: 'SELECT_DICE',
            diceIndices: selectedDiceIndices
        });
        
        setSelectedDiceIndices([]);
    };

    const handleBankPoints = () => {
        if (!isMyTurn || !gameState.canBank || isGameFinished) return;
        
        onMove({ type: 'BANK_POINTS' });
    };

    const getDiceValue = (value: number): string => {
        const dots = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
        return dots[value] || '⚀';
    };

    const calculateSelectionPoints = (indices: number[]): number => {
        if (indices.length === 0) return 0;
        
        const selectedValues = indices.map(i => gameState.dice[i]);
        const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
        selectedValues.forEach(value => counts[value]++);
        
        let points = 0;
        
        // Check for special combinations
        if (selectedValues.length === 6) {
            const sorted = [...selectedValues].sort();
            if (sorted.join('') === '123456') return 1500; // Straight
            
            const pairs = Object.values(counts).filter(count => count === 2);
            if (pairs.length === 3) return 1500; // Three pairs
        }
        
        // Check for multiples
        for (let num = 1; num <= 6; num++) {
            const count = counts[num];
            if (count >= 3) {
                if (count === 6) points += 3000;
                else if (count === 5) points += 2000;
                else if (count === 4) points += 1000;
                else if (count === 3) {
                    points += num === 1 ? 1000 : num * 100;
                }
                
                // Add remaining singles
                const remaining = count - 3;
                if (num === 1) points += remaining * 100;
                else if (num === 5) points += remaining * 50;
            } else {
                // Just singles
                if (num === 1) points += count * 100;
                else if (num === 5) points += count * 50;
            }
        }
        
        return points;
    };

    const getPhaseMessage = (): string => {
        if (isGameFinished) return 'Game Finished';
        if (!isMyTurn) return 'Opponent\'s Turn';
        
        switch (gameState.gamePhase) {
            case 'ROLLING':
                return 'Roll the dice!';
            case 'SELECTING':
                return 'Select scoring dice';
            case 'BANKING':
                return 'Roll again or bank points';
            default:
                return '';
        }
    };

    const opponentIndex = myPlayerIndex === 0 ? 1 : 0;
    const selectionPoints = calculateSelectionPoints(selectedDiceIndices);

    return (
        <div className={styles.diceBoard}>
            {/* Scores */}
            <div className={styles.scoresContainer}>
                <div className={`${styles.playerScore} ${myPlayerIndex === gameState.currentPlayer ? styles.currentPlayer : ''}`}>
                    <h3>You</h3>
                    <div className={styles.score}>{gameState.scores[myPlayerIndex]}</div>
                    <div className={styles.target}>/ 10,000</div>
                </div>
                
                <div className={styles.vs}>VS</div>
                
                <div className={`${styles.playerScore} ${opponentIndex === gameState.currentPlayer ? styles.currentPlayer : ''}`}>
                    <h3>Opponent</h3>
                    <div className={styles.score}>{gameState.scores[opponentIndex]}</div>
                    <div className={styles.target}>/ 10,000</div>
                </div>
            </div>

            {/* Turn Score */}
            <div className={styles.turnScoreContainer}>
                <div className={styles.turnScore}>
                    <span className={styles.label}>Turn Score:</span>
                    <span className={styles.value}>{gameState.turnScore}</span>
                </div>
                {selectionPoints > 0 && (
                    <div className={styles.selectionScore}>
                        <span className={styles.label}>Selection:</span>
                        <span className={styles.value}>+{selectionPoints}</span>
                    </div>
                )}
            </div>

            {/* Game Phase Message */}
            <div className={styles.phaseMessage}>
                {getPhaseMessage()}
            </div>

            {/* Dice Container */}
            <div className={styles.diceContainer}>
                {gameState.dice.map((value, index) => (
                    <div
                        key={index}
                        data-value={value}
                        className={`${styles.die}
                            ${gameState.selectedDice[index] ? styles.locked : ''}
                            ${selectedDiceIndices.includes(index) ? styles.selected : ''}
                            ${animatingDice[index] ? styles.rolling : ''}
                            ${gameState.gamePhase === 'SELECTING' && !gameState.selectedDice[index] && isMyTurn ? styles.selectable : ''}
                        `}
                        onClick={() => handleDiceClick(index)}
                    >
                        <div className={styles.diceDots}>
                            {/* Generate 9 dots for 3x3 grid */}
                            {Array.from({ length: 9 }, (_, dotIndex) => (
                                <div key={dotIndex} className={styles.dot}></div>
                            ))}
                        </div>
                        <span className={styles.diceValue}>{getDiceValue(value)}</span>
                        {gameState.selectedDice[index] && (
                            <div className={styles.lockIcon}>🔒</div>
                        )}
                    </div>
                ))}
            </div>

            {/* Action Buttons */}
            <div className={styles.actionsContainer}>
                {gameState.gamePhase === 'ROLLING' && isMyTurn && (
                    <button
                        className={`${styles.actionButton} ${styles.rollButton}`}
                        onClick={handleRollDice}
                        disabled={!gameState.canRoll || isGameFinished}
                    >
                        🎲 Roll Dice
                    </button>
                )}

                {gameState.gamePhase === 'SELECTING' && isMyTurn && (
                    <button
                        className={`${styles.actionButton} ${styles.selectButton}`}
                        onClick={handleSelectDice}
                        disabled={selectedDiceIndices.length === 0 || selectionPoints === 0}
                    >
                        ✓ Select Dice ({selectionPoints} pts)
                    </button>
                )}

                {gameState.gamePhase === 'BANKING' && isMyTurn && (
                    <div className={styles.bankingActions}>
                        <button
                            className={`${styles.actionButton} ${styles.rollButton}`}
                            onClick={handleRollDice}
                            disabled={!gameState.canRoll || isGameFinished}
                        >
                            🎲 Roll Again
                        </button>
                        <button
                            className={`${styles.actionButton} ${styles.bankButton}`}
                            onClick={handleBankPoints}
                            disabled={!gameState.canBank || isGameFinished}
                        >
                            💰 Bank Points ({gameState.turnScore})
                        </button>
                    </div>
                )}
            </div>

            {/* Scoring Guide */}
            <div className={styles.scoringGuide}>
                <h4>Scoring:</h4>
                <div className={styles.scoringRules}>
                    <div>1 = 100 pts</div>
                    <div>5 = 50 pts</div>
                    <div>Three 1s = 1000 pts</div>
                    <div>Three 2s-6s = face value × 100</div>
                    <div>Straight (1-6) = 1500 pts</div>
                    <div>Three pairs = 1500 pts</div>
                </div>
            </div>
        </div>
    );
};

export default DiceBoard;