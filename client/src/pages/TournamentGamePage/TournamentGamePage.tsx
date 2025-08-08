import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import TicTacToeBoard from '../../components/game/TicTacToeBoard';
import CheckersBoard from '../../components/game/CheckersBoard';
import ChessBoard from '../../components/game/ChessBoard';
import BackgammonBoard from '../../components/game/BackgammonBoard';
import DurakBoard from '../../components/game/DurakBoard';
import DominoBoard from '../../components/game/DominoBoard';
import DiceBoard from '../../components/game/DiceBoard';
import BingoBoard from '../../components/game/BingoBoard';
import TournamentExitWarningModal from '../../components/modals/TournamentExitWarningModal';
import TournamentFloatingCountdown from '../../components/modals/TournamentFloatingCountdown';
import { useTournamentExitWarning } from '../../hooks/useTournamentExitWarning';
import styles from './TournamentGamePage.module.css';

interface TournamentGameState {
    matchId: string;
    gameType: string;
    players: Array<{
        _id: string;
        username: string;
        isBot: boolean;
    }>;
    gameState: any;
    myPlayerId: string;
    isReplay?: boolean;
    replayNumber?: number;
}

interface TournamentGameResult {
    matchId: string;
    winner?: {
        _id: string;
        username: string;
        isBot: boolean;
    };
    isDraw: boolean;
}

interface TournamentMatchResult {
    type: 'ADVANCED' | 'ELIMINATED' | 'DRAW';
    message: string;
    tournamentId: string;
    status: 'WAITING_NEXT_ROUND' | 'ELIMINATED';
}

interface TournamentCompleted {
    tournamentId: string;
    isWinner: boolean;
    winner: string;
    tournamentName: string;
    prizePool: number;
}

interface TournamentReplay {
    matchId: string;
    replayNumber: number;
    gameState: any;
    message: string;
}

const TournamentGamePage: React.FC = () => {
    const { matchId } = useParams<{ matchId: string }>();
    const [gameData, setGameData] = useState<TournamentGameState | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [gameResult, setGameResult] = useState<TournamentGameResult | null>(null);
    const [gameError, setGameError] = useState<string | null>(null);
    const [matchResult, setMatchResult] = useState<TournamentMatchResult | null>(null);
    const [tournamentCompleted, setTournamentCompleted] = useState<TournamentCompleted | null>(null);
    const [currentMatchId, setCurrentMatchId] = useState<string | undefined>(matchId);
    const [replayInfo, setReplayInfo] = useState<TournamentReplay | null>(null);
    
    const { user } = useAuth();
    const { socket } = useSocket();
    const navigate = useNavigate();

    const gameTypeText = {
        'tic-tac-toe': 'Tic-Tac-Toe',
        'checkers': 'Checkers',
        'chess': 'Chess',
        'backgammon': 'Backgammon',
        'durak': 'Durak',
        'domino': 'Domino',
        'dice': 'Dice',
        'bingo': 'Bingo'
    };

    const {
        warningState,
        handleCloseWarning,
        handleConfirmExit,
        handleReturnToGame,
        startExitWarning
    } = useTournamentExitWarning(
        true,
        matchId,
        gameData?.gameType ? gameTypeText[gameData.gameType as keyof typeof gameTypeText] : 'Tournament Game'
    );

    useEffect(() => {
        if (matchId !== currentMatchId) {
            console.log(`[TournamentGame] Match ID changed from ${currentMatchId} to ${matchId}`);
            setCurrentMatchId(matchId);
            
            setGameData(null);
            setGameResult(null);
            setMatchResult(null);
            setGameError(null);
            setTournamentCompleted(null);
            setReplayInfo(null);
            setLoading(true);
            setError(null);
        }
    }, [matchId, currentMatchId]);

    useEffect(() => {
        if (!currentMatchId || !socket || !user) {
            setError('Insufficient data to connect to game');
            setLoading(false);
            return;
        }

        console.log(`[TournamentGame] Connecting to match ${currentMatchId}`);
        
        if (currentMatchId !== matchId) {
            socket.emit('leaveTournamentGame', matchId);
        }
        
        socket.emit('joinTournamentGame', currentMatchId);

        socket.on('tournamentGameStart', handleGameStart);
        socket.on('tournamentGameUpdate', handleGameUpdate);
        socket.on('tournamentGameEnd', handleGameEnd);
        socket.on('tournamentGameError', handleGameError);
        socket.on('tournamentMatchResult', handleMatchResult);
        socket.on('tournamentMatchReady', handleNextRoundReady);
        socket.on('tournamentCompleted', handleTournamentCompleted);
        socket.on('tournamentReplay', handleTournamentReplay);
        socket.on('error', handleError);

        return () => {
            console.log(`[TournamentGame] Cleaning up socket listeners for match ${currentMatchId}`);
            socket.off('tournamentGameStart', handleGameStart);
            socket.off('tournamentGameUpdate', handleGameUpdate);
            socket.off('tournamentGameEnd', handleGameEnd);
            socket.off('tournamentGameError', handleGameError);
            socket.off('tournamentMatchResult', handleMatchResult);
            socket.off('tournamentMatchReady', handleNextRoundReady);
            socket.off('tournamentCompleted', handleTournamentCompleted);
            socket.off('tournamentReplay', handleTournamentReplay);
            socket.off('error', handleError);
        };
    }, [currentMatchId, socket, user]);

    const handleGameStart = (data: TournamentGameState) => {
        console.log('[TournamentGame] Game started:', {
            matchId: data.matchId,
            gameType: data.gameType,
            players: data.players,
            myPlayerId: data.myPlayerId,
            userIdFromAuth: user?._id,
            gameState: data.gameState,
            currentTurn: data.gameState?.turn,
            myPlayerIdType: typeof data.myPlayerId,
            userIdType: typeof user?._id,
            idsEqual: data.myPlayerId === user?._id,
            isReplay: data.isReplay,
            replayNumber: data.replayNumber
        });
        
        if (data.myPlayerId !== user?._id) {
            console.warn('[TournamentGame] myPlayerId mismatch!', {
                received: data.myPlayerId,
                expected: user?._id
            });
        }
        
        setGameData(data);
        setLoading(false);
        setError(null);
        
        if (data.isReplay) {
            setGameResult(null);
            setMatchResult(null);
            setReplayInfo(null);
        }
    };

    const handleGameUpdate = (data: { matchId: string; gameState: any }) => {
        console.log('[TournamentGame] Game updated:', {
            receivedMatchId: data.matchId,
            currentMatchId: currentMatchId,
            gameDataMatchId: gameData?.matchId,
            hasGameData: !!gameData,
            gameState: data.gameState,
            currentTurn: data.gameState?.turn
        });
        
        if (data.matchId === currentMatchId) {
            console.log('[TournamentGame] Updating game state for current match');
            setGameData(prev => {
                if (prev) {
                    const updated = { ...prev, gameState: data.gameState };
                    console.log('[TournamentGame] Game state updated:', {
                        oldTurn: prev.gameState?.turn,
                        newTurn: data.gameState?.turn,
                        myPlayerId: prev.myPlayerId
                    });
                    return updated;
                } else {
                    console.log('[TournamentGame] No previous game data to update');
                    return null;
                }
            });
        } else {
            console.log('[TournamentGame] Ignoring update for different match:', {
                received: data.matchId,
                current: currentMatchId
            });
        }
    };

    const handleGameEnd = (result: TournamentGameResult) => {
        console.log('[TournamentGame] Game ended:', result);
        setGameResult(result);
        
    };

    const handleMatchResult = (result: TournamentMatchResult) => {
        console.log('[TournamentGame] Match result:', result);
        setMatchResult(result);
        
        if (result.type === 'ELIMINATED') {
            setTimeout(() => {
                navigate('/tournaments');
            }, 5000);
        } else if (result.type === 'ADVANCED') {
        }
    };

    const handleNextRoundReady = (data: any) => {
        console.log('[TournamentGame] Next round ready:', data);
        
        if (data.matchId && data.matchId !== currentMatchId) {
            console.log(`[TournamentGame] Transitioning from match ${currentMatchId} to ${data.matchId}`);
            
            navigate(`/tournament-game/${data.matchId}`, { replace: true });
        }
    };

    const handleTournamentCompleted = (data: TournamentCompleted) => {
        console.log('[TournamentGame] Tournament completed:', data);
        setTournamentCompleted(data);
        
        setTimeout(() => {
            navigate('/tournaments');
        }, 10000);
    };

    const handleTournamentReplay = (data: TournamentReplay) => {
        console.log('[TournamentGame] Tournament replay started:', data);
        setReplayInfo(data);
        
        setTimeout(() => {
            setReplayInfo(null);
        }, 3000);
    };

    const handleError = (error: { message: string }) => {
        console.error('[TournamentGame] Error:', error);
        setError(error.message);
        setLoading(false);
        
        if (error.message.includes('finished') || error.message.includes('завершен')) {
            setTimeout(() => {
                navigate('/tournaments');
            }, 3000);
        }
    };

    const handleGameError = (data: { matchId: string; error: string }) => {
        console.log('[TournamentGame] Game error:', data);
        console.log('[TournamentGame] Current match ID:', currentMatchId);
        console.log('[TournamentGame] Error match ID:', data.matchId);
        console.log('[TournamentGame] Match IDs equal:', data.matchId === currentMatchId);
        
        if (data.matchId === currentMatchId) {
            setGameError(data.error);
            console.log('[TournamentGame] Setting game error:', data.error);
            setTimeout(() => setGameError(null), 5000);
        }
    };

    const handleMove = (move: any) => {
        if (!socket || !currentMatchId) return;
        
        console.log('[TournamentGame] Making move:', move);
        socket.emit('tournamentMove', { matchId: currentMatchId, move });
    };

    const handleTicTacToeMove = (cellIndex: number) => {
        if (!socket || !currentMatchId) {
            console.log('[TournamentGame] Cannot make move - missing socket or matchId:', { socket: !!socket, currentMatchId });
            return;
        }
        
        if (!gameData) {
            console.log('[TournamentGame] Cannot make move - no game data');
            return;
        }
        
        const isMyTurn = gameData.gameState.turn === gameData.myPlayerId;
        if (!isMyTurn) {
            console.log('[TournamentGame] Not my turn:', {
                currentTurn: gameData.gameState.turn,
                myPlayerId: gameData.myPlayerId,
                isEqual: gameData.gameState.turn === gameData.myPlayerId
            });
            return;
        }
        
        const move = { cellIndex };
        console.log('[TournamentGame] Making tic-tac-toe move:', {
            cellIndex,
            move,
            currentMatchId,
            myPlayerId: gameData.myPlayerId,
            currentTurn: gameData.gameState.turn,
            isMyTurn,
            gameData: {
                matchId: gameData.matchId,
                gameType: gameData.gameType,
                myPlayerId: gameData.myPlayerId,
                currentTurn: gameData.gameState?.turn
            }
        });
        
        socket.emit('tournamentMove', { matchId: currentMatchId, move });
    };

    const handleRollDice = () => {
        if (!socket || !currentMatchId) return;
        
        console.log('[TournamentGame] Rolling dice');
        socket.emit('tournamentMove', {
            matchId: currentMatchId,
            move: { type: 'ROLL_DICE' }
        });
    };

    const renderGameBoard = () => {
        if (!gameData) return null;

        const { gameType, gameState, players, myPlayerId } = gameData;
        const isMyTurn = gameState.turn === myPlayerId;
        const myPlayerIndex = players.findIndex(p => p._id === myPlayerId) as 0 | 1;
        
        console.log('[TournamentGame] Render game board:', {
            gameType,
            currentTurn: gameState.turn,
            myPlayerId,
            isMyTurn,
            myPlayerIndex,
            players: players.map(p => ({ id: p._id, username: p.username }))
        });
        
        switch (gameType) {
            case 'tic-tac-toe':
                return (
                    <TicTacToeBoard
                        board={gameState.board}
                        onMove={handleTicTacToeMove}
                        isMyTurn={isMyTurn}
                        isGameFinished={!!gameResult}
                    />
                );
            
            case 'checkers':
                return (
                    <CheckersBoard
                        gameState={gameState}
                        onMove={handleMove}
                        isMyTurn={isMyTurn}
                        isGameFinished={!!gameResult}
                        myPlayerIndex={myPlayerIndex}
                    />
                );
            
            case 'chess':
                return (
                    <ChessBoard
                        gameState={gameState}
                        onMove={handleMove}
                        isMyTurn={isMyTurn}
                        isGameFinished={!!gameResult}
                        myPlayerIndex={myPlayerIndex}
                    />
                );
            
            case 'backgammon':
                return (
                    <BackgammonBoard
                        gameState={gameState}
                        onMove={handleMove}
                        isMyTurn={isMyTurn}
                        isGameFinished={!!gameResult}
                        myPlayerIndex={myPlayerIndex}
                        onRollDice={handleRollDice}
                    />
                );
            
            case 'durak':
                return (
                    <DurakBoard
                        gameState={gameState}
                        onMove={handleMove}
                        isMyTurn={isMyTurn}
                        isGameFinished={!!gameResult}
                        myPlayerIndex={myPlayerIndex}
                    />
                );
            
            case 'domino':
                return (
                    <DominoBoard
                        gameState={gameState}
                        onMove={handleMove}
                        isMyTurn={isMyTurn}
                        isGameFinished={!!gameResult}
                        myPlayerIndex={myPlayerIndex}
                    />
                );
            
            case 'dice':
                return (
                    <DiceBoard
                        gameState={gameState}
                        onMove={handleMove}
                        isMyTurn={isMyTurn}
                        isGameFinished={!!gameResult}
                        myPlayerIndex={myPlayerIndex}
                    />
                );
            
            case 'bingo':
                return (
                    <BingoBoard
                        gameState={gameState}
                        onMove={handleMove}
                        isMyTurn={isMyTurn}
                        isGameFinished={!!gameResult}
                        myPlayerIndex={myPlayerIndex}
                    />
                );
            
            default:
                return <div>Unsupported game type: {gameType}</div>;
        }
    };

    const renderGameResult = () => {
        if (!gameResult || !gameData) return null;

        const isWinner = gameResult.winner?._id === user?._id;
        const isDraw = gameResult.isDraw;

        return (
            <div className={styles.gameResultOverlay}>
                <div className={styles.gameResultModal}>
                    <h2>Match Completed!</h2>
                    
                    {isDraw ? (
                        <div className={styles.drawResult}>
                            <span className={styles.resultIcon}>🤝</span>
                            <p>Draw!</p>
                        </div>
                    ) : isWinner ? (
                        <div className={styles.winResult}>
                            <span className={styles.resultIcon}>🏆</span>
                            <p>Congratulations! You won!</p>
                        </div>
                    ) : (
                        <div className={styles.loseResult}>
                            <span className={styles.resultIcon}>😔</span>
                            <p>You lost</p>
                            {gameResult.winner && (
                                <p>Winner: {gameResult.winner.username}</p>
                            )}
                        </div>
                    )}

                    {matchResult && (
                        <div className={styles.tournamentStatus}>
                            <h3>Tournament Status:</h3>
                            <p>{matchResult.message}</p>
                            
                            {matchResult.type === 'ADVANCED' && (
                                <p className={styles.waitingMessage}>
                                    Waiting for next round...
                                </p>
                            )}
                            
                            {matchResult.type === 'ELIMINATED' && (
                                <div className={styles.resultActions}>
                                    <button
                                        onClick={() => navigate('/tournaments')}
                                        className={styles.backToTournamentsButton}
                                    >
                                        Return to Tournaments
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {matchResult?.type === 'ELIMINATED' && (
                        <p className={styles.autoRedirect}>
                            Automatic redirect in 5 seconds...
                        </p>
                    )}
                </div>
            </div>
        );
    };

    const renderTournamentCompleted = () => {
        if (!tournamentCompleted) return null;

        return (
            <div className={styles.gameResultOverlay}>
                <div className={styles.gameResultModal}>
                    <h2>🏆 Tournament Completed!</h2>
                    
                    {tournamentCompleted.isWinner ? (
                        <div className={styles.winResult}>
                            <span className={styles.resultIcon}>🥇</span>
                            <h3>Congratulations on your victory!</h3>
                            <p>You won tournament "{tournamentCompleted.tournamentName}"!</p>
                            <p className={styles.prizeInfo}>
                                Your prize: {Math.floor(tournamentCompleted.prizePool * 0.6)} coins
                            </p>
                        </div>
                    ) : (
                        <div className={styles.tournamentResult}>
                            <span className={styles.resultIcon}>🏁</span>
                            <h3>Tournament Completed</h3>
                            <p>Tournament "{tournamentCompleted.tournamentName}" completed</p>
                            <p>Winner: {tournamentCompleted.winner}</p>
                        </div>
                    )}

                    <div className={styles.resultActions}>
                        <button
                            onClick={() => navigate('/tournaments')}
                            className={styles.backToTournamentsButton}
                        >
                            Return to Tournaments
                        </button>
                    </div>

                    <p className={styles.autoRedirect}>
                        Automatic redirect in 10 seconds...
                    </p>
                </div>
            </div>
        );
    };

    if (loading) {
        return (
            <div className={styles.container}>
                <div className={styles.loading}>
                    <div className={styles.spinner}></div>
                    <p>Connecting to tournament game...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className={styles.container}>
                <div className={styles.error}>
                    <h2>Connection Error</h2>
                    <p>{error}</p>
                    <button 
                        onClick={() => navigate('/tournaments')}
                        className={styles.backButton}
                    >
                        Return to Tournaments
                    </button>
                </div>
            </div>
        );
    }

    if (!gameData) {
        return (
            <div className={styles.container}>
                <div className={styles.error}>
                    <h2>Game Not Found</h2>
                    <p>Tournament match not found or unavailable</p>
                    <button 
                        onClick={() => navigate('/tournaments')}
                        className={styles.backButton}
                    >
                        Return to Tournaments
                    </button>
                </div>
            </div>
        );
    }

    const opponent = gameData.players.find(p => p._id !== user?._id);
    const isMyTurn = gameData.gameState.turn === gameData.myPlayerId;
    
    console.log('[TournamentGame] Turn info:', {
        currentTurn: gameData.gameState.turn,
        myPlayerId: gameData.myPlayerId,
        userIdFromAuth: user?._id,
        isMyTurn,
        turnType: typeof gameData.gameState.turn,
        myPlayerIdType: typeof gameData.myPlayerId
    });

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <button
                    onClick={() => {
                        if (gameData && !gameResult && !tournamentCompleted) {
                            startExitWarning();
                        } else {
                            navigate('/tournaments');
                        }
                    }}
                    className={styles.backButton}
                >
                    ← Tournaments
                </button>
                <h1>Tournament Match</h1>
                <div className={styles.gameInfo}>
                    {gameTypeText[gameData.gameType as keyof typeof gameTypeText]}
                    {gameData.isReplay && (
                        <span className={styles.replayBadge}>
                            Replay {gameData.replayNumber}/3
                        </span>
                    )}
                </div>
            </div>

            <div className={styles.playersInfo}>
                <div className={`${styles.player} ${isMyTurn ? styles.currentTurn : ''}`}>
                    <div className={styles.playerName}>
                        {user?.username} (You)
                    </div>
                    {isMyTurn && <div className={styles.turnIndicator}>Your Turn</div>}
                </div>

                <div className={styles.vs}>VS</div>

                <div className={`${styles.player} ${!isMyTurn ? styles.currentTurn : ''}`}>
                    <div className={styles.playerName}>
                        {opponent?.username}
                        {opponent?.isBot && ' 🤖'}
                    </div>
                    {!isMyTurn && <div className={styles.turnIndicator}>Opponent's Turn</div>}
                </div>
            </div>

            <div className={styles.gameBoard}>
                {renderGameBoard()}
            </div>

            {gameError && (
                <div className={styles.gameErrorMessage}>
                    <div className={styles.errorContent}>
                        <span className={styles.errorIcon}>⚠️</span>
                        <span>{gameError}</span>
                    </div>
                </div>
            )}

            {replayInfo && (
                <div className={styles.replayNotification}>
                    <div className={styles.replayContent}>
                        <span className={styles.replayIcon}>🔄</span>
                        <span>{replayInfo.message}</span>
                    </div>
                </div>
            )}

            {gameResult && !tournamentCompleted && renderGameResult()}
            {tournamentCompleted && renderTournamentCompleted()}
            
            {warningState.isWarningOpen && (
                <TournamentExitWarningModal
                    isOpen={warningState.isWarningOpen}
                    tournamentName={warningState.tournamentName}
                    matchId={warningState.matchId}
                    onClose={handleCloseWarning}
                    onConfirmExit={handleConfirmExit}
                />
            )}
            
            {warningState.isFloatingCountdownOpen && (
                <TournamentFloatingCountdown
                    isOpen={warningState.isFloatingCountdownOpen}
                    tournamentName={warningState.tournamentName}
                    timeLeft={warningState.timeLeft}
                    onReturnToGame={handleReturnToGame}
                    onConfirmExit={handleConfirmExit}
                />
            )}
        </div>
    );
};

export default TournamentGamePage;