import React from 'react';
import styles from './TournamentFloatingCountdown.module.css';

interface TournamentFloatingCountdownProps {
    isOpen: boolean;
    tournamentName: string;
    timeLeft: number;
    onReturnToGame: () => void;
    onConfirmExit: () => void;
}

const TournamentFloatingCountdown: React.FC<TournamentFloatingCountdownProps> = ({
    isOpen,
    tournamentName,
    timeLeft,
    onReturnToGame,
    onConfirmExit
}) => {
    if (!isOpen) return null;

    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;

    return (
        <div className={styles.floatingCountdown}>
            <div className={styles.header}>
                <span className={styles.icon}>⏰</span>
                <span className={styles.title}>Возврат в турнир</span>
                <button 
                    onClick={onConfirmExit}
                    className={styles.closeButton}
                    title="Покинуть турнир окончательно"
                >
                    ✕
                </button>
            </div>
            
            <div className={styles.content}>
                <div className={styles.tournamentInfo}>
                    <span className={styles.tournamentName}>{tournamentName}</span>
                </div>
                
                <div className={styles.countdown}>
                    <div className={styles.timeDisplay}>
                        <span className={styles.timeNumber}>{timeString}</span>
                        <span className={styles.timeLabel}>до автоматического поражения</span>
                    </div>
                    
                    <div className={styles.progressBar}>
                        <div 
                            className={styles.progressFill}
                            style={{ width: `${(timeLeft / 30) * 100}%` }}
                        />
                    </div>
                </div>
                
                <button 
                    onClick={onReturnToGame}
                    className={styles.returnButton}
                >
                    🎮 Вернуться к игре
                </button>
            </div>
        </div>
    );
};

export default TournamentFloatingCountdown;