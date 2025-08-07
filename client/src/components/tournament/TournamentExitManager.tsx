import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import TournamentFloatingCountdown from '../modals/TournamentFloatingCountdown';

interface TournamentExitManagerProps {
    children: React.ReactNode;
}

interface ExitTimerData {
    matchId: string;
    tournamentName: string;
    startTime: number;
    duration: number;
}

const TournamentExitManager: React.FC<TournamentExitManagerProps> = ({ children }) => {
    const [exitTimer, setExitTimer] = useState<ExitTimerData | null>(null);
    const [timeLeft, setTimeLeft] = useState(0);
    const location = useLocation();

    useEffect(() => {
        const checkExitTimer = () => {
            const savedTimer = localStorage.getItem('tournamentExitTimer');
            if (savedTimer) {
                try {
                    const timerData: ExitTimerData = JSON.parse(savedTimer);
                    const elapsed = Date.now() - timerData.startTime;
                    const remaining = Math.max(0, timerData.duration - elapsed);

                    if (remaining > 0) {
                        setExitTimer(timerData);
                        setTimeLeft(Math.ceil(remaining / 1000));
                    } else {
                        localStorage.removeItem('tournamentExitTimer');
                        setExitTimer(null);
                        setTimeLeft(0);
                    }
                } catch (error) {
                    console.error('Error parsing tournament exit timer:', error);
                    localStorage.removeItem('tournamentExitTimer');
                    setExitTimer(null);
                }
            } else {
                setExitTimer(null);
                setTimeLeft(0);
            }
        };

        checkExitTimer();
    }, [location.pathname]);

    useEffect(() => {
        if (!exitTimer) return;

        const interval = setInterval(() => {
            const elapsed = Date.now() - exitTimer.startTime;
            const remaining = Math.max(0, exitTimer.duration - elapsed);
            const secondsLeft = Math.ceil(remaining / 1000);

            setTimeLeft(secondsLeft);

            if (remaining <= 0) {
                localStorage.removeItem('tournamentExitTimer');
                setExitTimer(null);
                setTimeLeft(0);
                
                console.log('Tournament exit timer expired');
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [exitTimer]);

    const handleReturnToGame = () => {
        if (exitTimer) {
            localStorage.removeItem('tournamentExitTimer');
            setExitTimer(null);
            setTimeLeft(0);
            
            window.location.href = `/tournament-game/${exitTimer.matchId}`;
        }
    };

    const handleConfirmExit = () => {
        localStorage.removeItem('tournamentExitTimer');
        setExitTimer(null);
        setTimeLeft(0);
        
        console.log('Player confirmed exit from tournament');
    };

    const shouldShowFloatingCountdown = exitTimer && 
        timeLeft > 0 && 
        !location.pathname.includes('/tournament-game/');

    return (
        <>
            {children}
            
            {shouldShowFloatingCountdown && (
                <TournamentFloatingCountdown
                    isOpen={true}
                    tournamentName={exitTimer.tournamentName}
                    timeLeft={timeLeft}
                    onReturnToGame={handleReturnToGame}
                    onConfirmExit={handleConfirmExit}
                />
            )}
        </>
    );
};

export default TournamentExitManager;