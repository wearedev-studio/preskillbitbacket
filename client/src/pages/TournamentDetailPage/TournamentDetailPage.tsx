import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Tournament, TournamentMatch, tournamentService } from '../../services/tournamentService';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import styles from './TournamentDetailPage.module.css';

const TournamentDetailPage: React.FC = () => {
    const { id: tournamentId } = useParams<{ id: string }>();
    const [tournament, setTournament] = useState<Tournament | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [timeUntilStart, setTimeUntilStart] = useState<number>(0);
    
    const { user } = useAuth();
    const { socket } = useSocket();
    const navigate = useNavigate();

    const statusText = {
        WAITING: 'Ожидание игроков',
        ACTIVE: 'Активный',
        FINISHED: 'Завершен',
        CANCELLED: 'Отменен'
    };

    const gameTypeText = {
        'tic-tac-toe': 'Крестики-нолики',
        'checkers': 'Шашки',
        'chess': 'Шахматы',
        'backgammon': 'Нарды'
    };

    useEffect(() => {
        if (tournamentId) {
            loadTournament();
        }
    }, [tournamentId]);

    useEffect(() => {
        if (socket && tournamentId) {
            socket.on('tournamentUpdated', handleTournamentUpdate);
            socket.on('tournamentStarted', handleTournamentUpdate);
            socket.on('tournamentFinished', handleTournamentUpdate);
            socket.on('tournamentMatchReady', handleMatchReady);

            return () => {
                socket.off('tournamentUpdated', handleTournamentUpdate);
                socket.off('tournamentStarted', handleTournamentUpdate);
                socket.off('tournamentFinished', handleTournamentUpdate);
                socket.off('tournamentMatchReady', handleMatchReady);
            };
        }
    }, [socket, tournamentId]);

    useEffect(() => {
        let interval: NodeJS.Timeout;
        
        if (tournament && tournament.status === 'WAITING') {
            interval = setInterval(() => {
                const timeLeft = tournamentService.getTimeUntilStart(tournament);
                setTimeUntilStart(timeLeft);
                
                if (timeLeft <= 0) {
                    clearInterval(interval);
                }
            }, 1000);
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [tournament]);

    const loadTournament = async () => {
        if (!tournamentId) return;
        
        try {
            setLoading(true);
            const data = await tournamentService.getTournamentById(tournamentId);
            setTournament(data);
            setError(null);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleTournamentUpdate = (updatedTournament: Tournament) => {
        if (updatedTournament._id === tournamentId) {
            setTournament(updatedTournament);
        }
    };

    const handleMatchReady = (data: { tournamentId: string; matchId: string; gameType: string }) => {
        if (data.tournamentId === tournamentId) {
            // Автоматически переходим к турнирной игре
            navigate(`/tournament-game/${data.matchId}`);
        }
    };

    const handleRegister = async () => {
        if (!user || !tournamentId) {
            navigate('/login');
            return;
        }

        try {
            const socketId = socket?.id;
            await tournamentService.registerInTournament(tournamentId, socketId);
            await loadTournament();
        } catch (err: any) {
            alert(err.message);
        }
    };

    const handleUnregister = async () => {
        if (!tournamentId) return;
        
        try {
            await tournamentService.unregisterFromTournament(tournamentId);
            await loadTournament();
        } catch (err: any) {
            alert(err.message);
        }
    };

    const renderBracket = () => {
        if (!tournament || tournament.bracket.length === 0) {
            return <div className={styles.noBracket}>Турнирная сетка еще не создана</div>;
        }

        return (
            <div className={styles.bracket}>
                {tournament.bracket.map((round, roundIndex) => (
                    <div key={roundIndex} className={styles.round}>
                        <h4 className={styles.roundTitle}>
                            {tournamentService.formatRoundName(round.round, tournament.bracket.length)}
                        </h4>
                        <div className={styles.matches}>
                            {round.matches.map((match, matchIndex) => (
                                <div
                                    key={matchIndex}
                                    className={`${styles.match} ${
                                        match.status === 'FINISHED' ? styles.finished :
                                        match.status === 'ACTIVE' ? styles.active : ''
                                    }`}
                                >
                                    <div className={styles.matchPlayers}>
                                        <div className={`${styles.player} ${match.winner?._id === match.player1._id ? styles.winner : ''}`}>
                                            <span className={styles.playerName}>
                                                {match.player1.username}
                                                {match.player1.isBot && ' 🤖'}
                                                {match.winner?._id === match.player1._id && ' 👑'}
                                            </span>
                                        </div>
                                        <div className={styles.vs}>VS</div>
                                        <div className={`${styles.player} ${match.winner?._id === match.player2._id ? styles.winner : ''}`}>
                                            <span className={styles.playerName}>
                                                {match.player2.username}
                                                {match.player2.isBot && ' 🤖'}
                                                {match.winner?._id === match.player2._id && ' 👑'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className={styles.matchStatus}>
                                        {match.status === 'FINISHED' && match.winner && (
                                            <span className={styles.matchWinner}>
                                                🏆 {match.winner.username} побеждает!
                                            </span>
                                        )}
                                        {match.status === 'ACTIVE' && (
                                            <span className={styles.matchActive}>
                                                🔥 Матч в процессе
                                            </span>
                                        )}
                                        {match.status === 'PENDING' && (
                                            <span className={styles.matchPending}>
                                                ⏳ Ожидание начала
                                            </span>
                                        )}
                                        {match.status === 'WAITING' && (
                                            <span className={styles.matchPending}>
                                                ⏸️ Ожидание игроков
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    const renderPlayerCurrentMatch = () => {
        if (!tournament || !user) return null;

        const currentMatch = tournamentService.getPlayerCurrentMatch(tournament, user._id);
        if (!currentMatch) return null;

        const opponent = currentMatch.player1._id === user._id ? currentMatch.player2 : currentMatch.player1;

        return (
            <div className={styles.currentMatch}>
                <h3>Ваш текущий матч</h3>
                <div className={styles.matchInfo}>
                    <div className={styles.opponent}>
                        Противник: {opponent.username}
                        {opponent.isBot && ' 🤖'}
                    </div>
                    <div className={styles.matchStatusInfo}>
                        Статус: {currentMatch.status === 'ACTIVE' ? 'Игра идет' : 'Ожидание'}
                    </div>
                    {currentMatch.status === 'ACTIVE' && (
                        <button 
                            onClick={() => navigate(`/tournament-game/${currentMatch.matchId}`)}
                            className={styles.joinGameButton}
                        >
                            Перейти к игре
                        </button>
                    )}
                </div>
            </div>
        );
    };

    const formatTimeUntilStart = (time: number): string => {
        if (time <= 0) return '';
        const seconds = Math.ceil(time / 1000);
        return `Старт через ${seconds} секунд`;
    };

    const isPlayerRegistered = (): boolean => {
        return user && tournament ? tournamentService.isPlayerRegistered(tournament, user._id) : false;
    };

    const canPlayerRegister = (): boolean => {
        return user && tournament ? tournamentService.canPlayerRegister(tournament, user._id) : false;
    };

    const getPlayerPrizePlace = (): number | null => {
        return user && tournament ? tournamentService.getPlayerPrizePlace(tournament, user._id) : null;
    };

    if (loading) {
        return (
            <div className={styles.container}>
                <div className={styles.loading}>Загрузка турнира...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className={styles.container}>
                <div className={styles.error}>
                    Ошибка: {error}
                    <button onClick={loadTournament} className={styles.retryButton}>
                        Попробовать снова
                    </button>
                </div>
            </div>
        );
    }

    if (!tournament) {
        return (
            <div className={styles.container}>
                <div className={styles.error}>Турнир не найден</div>
            </div>
        );
    }

    const prizePlace = getPlayerPrizePlace();

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <button onClick={() => navigate('/tournaments')} className={styles.backButton}>
                    ← Назад к турнирам
                </button>
                <h1>{tournament.name}</h1>
                <span className={`${styles.status} ${styles[tournament.status.toLowerCase()]}`}>
                    {statusText[tournament.status]}
                </span>
            </div>

            <div className={styles.tournamentInfo}>
                <div className={styles.infoGrid}>
                    <div className={styles.infoItem}>
                        <span className={styles.label}>Игра:</span>
                        <span>{gameTypeText[tournament.gameType]}</span>
                    </div>
                    <div className={styles.infoItem}>
                        <span className={styles.label}>Взнос:</span>
                        <span>{tournament.entryFee} монет</span>
                    </div>
                    <div className={styles.infoItem}>
                        <span className={styles.label}>Призовой фонд:</span>
                        <span>{tournament.prizePool} монет</span>
                    </div>
                    <div className={styles.infoItem}>
                        <span className={styles.label}>Игроки:</span>
                        <span>{tournament.players.length}/{tournament.maxPlayers}</span>
                    </div>
                    <div className={styles.infoItem}>
                        <span className={styles.label}>Комиссия платформы:</span>
                        <span>{tournament.platformCommission}%</span>
                    </div>
                    {tournament.startedAt && (
                        <div className={styles.infoItem}>
                            <span className={styles.label}>Начат:</span>
                            <span>{new Date(tournament.startedAt).toLocaleString()}</span>
                        </div>
                    )}
                    {tournament.finishedAt && (
                        <div className={styles.infoItem}>
                            <span className={styles.label}>Завершен:</span>
                            <span>{new Date(tournament.finishedAt).toLocaleString()}</span>
                        </div>
                    )}
                </div>

                {timeUntilStart > 0 && (
                    <div className={styles.startTimer}>
                        ⏰ {formatTimeUntilStart(timeUntilStart)}
                    </div>
                )}

                {tournament.status === 'FINISHED' && tournament.winner && (
                    <div className={styles.winner}>
                        🏆 Победитель: {tournament.winner.username}
                        {tournament.winner.isBot && ' 🤖'}
                    </div>
                )}

                {prizePlace && (
                    <div className={styles.playerPrize}>
                        🏅 Ваше место: {prizePlace}
                    </div>
                )}
            </div>

            {/* Призовой фонд и распределение */}
            {tournament.prizePool > 0 && (
                <div className={styles.prizeSection}>
                    <h3>💰 Призовой фонд: {tournament.prizePool} монет</h3>
                    <div className={styles.prizeDistribution}>
                        <div className={styles.prizeItem}>
                            <span className={styles.prizePlace}>🥇 1 место</span>
                            <span className={styles.prizeAmount}>
                                {Math.floor(tournament.prizePool * 0.6)} монет (60%)
                            </span>
                        </div>
                        <div className={styles.prizeItem}>
                            <span className={styles.prizePlace}>🥈 2 место</span>
                            <span className={styles.prizeAmount}>
                                {Math.floor(tournament.prizePool * 0.3)} монет (30%)
                            </span>
                        </div>
                        <div className={styles.prizeItem}>
                            <span className={styles.prizePlace}>🥉 3-4 место</span>
                            <span className={styles.prizeAmount}>
                                {Math.floor(tournament.prizePool * 0.05)} монет (5% каждому)
                            </span>
                        </div>
                        <div className={styles.prizeItem}>
                            <span className={styles.prizePlace}>💼 Комиссия платформы</span>
                            <span className={styles.prizeAmount}>
                                {Math.floor(tournament.prizePool * (tournament.platformCommission / 100))} монет ({tournament.platformCommission}%)
                            </span>
                        </div>
                    </div>
                </div>
            )}

            <div className={styles.actions}>
                {tournament.status === 'WAITING' && (
                    <>
                        {isPlayerRegistered() ? (
                            <button 
                                onClick={handleUnregister}
                                className={styles.unregisterButton}
                            >
                                Отменить регистрацию
                            </button>
                        ) : canPlayerRegister() ? (
                            <button 
                                onClick={handleRegister}
                                className={styles.registerButton}
                            >
                                Зарегистрироваться
                            </button>
                        ) : (
                            <button 
                                disabled 
                                className={styles.disabledButton}
                            >
                                {tournament.players.length >= tournament.maxPlayers 
                                    ? 'Турнир заполнен' 
                                    : 'Недостаточно средств'
                                }
                            </button>
                        )}
                    </>
                )}
            </div>

            {renderPlayerCurrentMatch()}

            <div className={styles.participants}>
                <h3>Участники ({tournament.players.length}/{tournament.maxPlayers})</h3>
                <div className={styles.playersList}>
                    {tournament.players.map((player, index) => (
                        <div key={player._id} className={styles.participant}>
                            <span className={styles.playerNumber}>#{index + 1}</span>
                            <span className={styles.playerName}>
                                {player.username}
                                {player.isBot && ' 🤖'}
                                {user && player._id === user._id && ' (Вы)'}
                            </span>
                            <span className={styles.registrationTime}>
                                {new Date(player.registeredAt).toLocaleString()}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            <div className={styles.bracketSection}>
                <h3>Турнирная сетка</h3>
                {renderBracket()}
            </div>
        </div>
    );
};

export default TournamentDetailPage;