import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';

interface TournamentExitWarningState {
    isWarningOpen: boolean;
    isFloatingCountdownOpen: boolean;
    tournamentName: string;
    matchId: string;
    timeLeft: number;
}

export const useTournamentExitWarning = (
    isTournamentGame: boolean,
    currentMatchId?: string,
    tournamentName?: string
) => {
    const [warningState, setWarningState] = useState<TournamentExitWarningState>({
        isWarningOpen: false,
        isFloatingCountdownOpen: false,
        tournamentName: '',
        matchId: '',
        timeLeft: 30
    });

    const location = useLocation();
    const navigate = useNavigate();
    const { socket } = useSocket();
    const navigationInterceptedRef = useRef(false);
    const interceptedLinkRef = useRef<string | null>(null);
    const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        const savedTimer = localStorage.getItem('tournamentExitTimer');
        if (savedTimer) {
            try {
                const timerData = JSON.parse(savedTimer);
                const elapsed = Date.now() - timerData.startTime;
                const remaining = Math.max(0, timerData.duration - elapsed);

                if (remaining > 0) {
                    setWarningState({
                        isWarningOpen: false,
                        isFloatingCountdownOpen: true,
                        tournamentName: timerData.tournamentName,
                        matchId: timerData.matchId,
                        timeLeft: Math.ceil(remaining / 1000)
                    });

                    startCountdownTimer(remaining);
                } else {
                    localStorage.removeItem('tournamentExitTimer');
                    console.log('[TournamentExitWarning] Timer expired on page load, clearing timer');
                }
            } catch (error) {
                console.error('Error parsing tournament exit timer:', error);
                localStorage.removeItem('tournamentExitTimer');
            }
        }
    }, []);

    const startCountdownTimer = useCallback((duration: number) => {
        if (countdownTimerRef.current) {
            clearInterval(countdownTimerRef.current);
        }

        const startTime = Date.now();
        const endTime = startTime + duration;

        countdownTimerRef.current = setInterval(() => {
            const remaining = Math.max(0, endTime - Date.now());
            const secondsLeft = Math.ceil(remaining / 1000);

            setWarningState(prev => ({ ...prev, timeLeft: secondsLeft }));

            if (remaining <= 0) {
                if (countdownTimerRef.current) {
                    clearInterval(countdownTimerRef.current);
                    countdownTimerRef.current = null;
                }
                handleConfirmExit();
            }
        }, 1000);
    }, []);

    const startExitWarning = useCallback(() => {
        if (!currentMatchId || !tournamentName) return;

        setWarningState({
            isWarningOpen: true,
            isFloatingCountdownOpen: false,
            tournamentName,
            matchId: currentMatchId,
            timeLeft: 30
        });
    }, [currentMatchId, tournamentName]);

    const handleCloseWarning = useCallback(() => {
        setWarningState(prev => ({
            ...prev,
            isWarningOpen: false,
            isFloatingCountdownOpen: false
        }));
        
        if (countdownTimerRef.current) {
            clearInterval(countdownTimerRef.current);
            countdownTimerRef.current = null;
        }
        
        localStorage.removeItem('tournamentExitTimer');
    }, []);

    const handleConfirmExit = useCallback(() => {
        setWarningState(prev => ({
            ...prev,
            isWarningOpen: false,
            isFloatingCountdownOpen: false
        }));
        
        if (countdownTimerRef.current) {
            clearInterval(countdownTimerRef.current);
            countdownTimerRef.current = null;
        }
        
        localStorage.removeItem('tournamentExitTimer');

        if (socket && currentMatchId) {
            socket.emit('tournamentPlayerForfeited', {
                matchId: currentMatchId,
                reason: 'left_game'
            });
        }

        navigate('/tournaments');
    }, [socket, currentMatchId, navigate]);

    const handleReturnToGame = useCallback(() => {
        console.log('[TournamentExitWarning] Returning to game');
        handleCloseWarning();
    }, [handleCloseWarning]);

    useEffect(() => {
        return () => {
            if (countdownTimerRef.current) {
                clearInterval(countdownTimerRef.current);
            }
        };
    }, []);

    return {
        warningState,
        handleCloseWarning,
        handleConfirmExit,
        handleReturnToGame,
        startExitWarning
    };
};