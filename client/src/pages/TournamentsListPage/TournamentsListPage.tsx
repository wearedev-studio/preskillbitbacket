import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tournament, tournamentService } from '../../services/tournamentService';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import styles from './TournamentsListPage.module.css';

const TournamentsListPage: React.FC = () => {
    const [tournaments, setTournaments] = useState<Tournament[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState<'all' | 'waiting' | 'active' | 'finished' | 'cancelled'>('all');
    const [gameTypeFilter, setGameTypeFilter] = useState<'all' | 'tic-tac-toe' | 'checkers' | 'chess' | 'backgammon'>('all');
    
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
        loadTournaments();
    }, []);

    useEffect(() => {
        if (socket) {
            socket.on('tournamentCreated', handleTournamentUpdate);
            socket.on('tournamentUpdated', handleTournamentUpdate);
            socket.on('tournamentStarted', handleTournamentUpdate);
            socket.on('tournamentFinished', handleTournamentUpdate);

            return () => {
                socket.off('tournamentCreated', handleTournamentUpdate);
                socket.off('tournamentUpdated', handleTournamentUpdate);
                socket.off('tournamentStarted', handleTournamentUpdate);
                socket.off('tournamentFinished', handleTournamentUpdate);
            };
        }
    }, [socket]);

    const loadTournaments = async () => {
        try {
            setLoading(true);
            const data = await tournamentService.getAllTournaments();
            setTournaments(data);
            setError(null);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleTournamentUpdate = (updatedTournament: Tournament) => {
        setTournaments(prev => {
            const index = prev.findIndex(t => t._id === updatedTournament._id);
            if (index >= 0) {
                const newTournaments = [...prev];
                newTournaments[index] = updatedTournament;
                return newTournaments;
            } else {
                return [updatedTournament, ...prev];
            }
        });
    };

    const handleRegister = async (tournamentId: string) => {
        if (!user) {
            navigate('/login');
            return;
        }

        try {
            const socketId = socket?.id;
            await tournamentService.registerInTournament(tournamentId, socketId);
            await loadTournaments();
        } catch (err: any) {
            alert(err.message);
        }
    };

    const handleUnregister = async (tournamentId: string) => {
        try {
            await tournamentService.unregisterFromTournament(tournamentId);
            await loadTournaments();
        } catch (err: any) {
            alert(err.message);
        }
    };

    const filteredTournaments = tournaments.filter(tournament => {
        if (filter !== 'all' && tournament.status.toLowerCase() !== filter) {
            return false;
        }
        if (gameTypeFilter !== 'all' && tournament.gameType !== gameTypeFilter) {
            return false;
        }
        return true;
    });

    const getTimeUntilStart = (tournament: Tournament): string => {
        const timeLeft = tournamentService.getTimeUntilStart(tournament);
        if (timeLeft <= 0) return '';
        
        const seconds = Math.ceil(timeLeft / 1000);
        return `Старт через ${seconds}с`;
    };

    const isPlayerRegistered = (tournament: Tournament): boolean => {
        return user ? tournamentService.isPlayerRegistered(tournament, user._id) : false;
    };

    const canPlayerRegister = (tournament: Tournament): boolean => {
        return user ? tournamentService.canPlayerRegister(tournament, user._id) : false;
    };

    if (loading) {
        return (
            <div className={styles.container}>
                <div className={styles.loading}>Загрузка турниров...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className={styles.container}>
                <div className={styles.error}>
                    Ошибка: {error}
                    <button onClick={loadTournaments} className={styles.retryButton}>
                        Попробовать снова
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1>Турниры</h1>
                <button 
                    onClick={loadTournaments} 
                    className={styles.refreshButton}
                    disabled={loading}
                >
                    🔄 Обновить
                </button>
            </div>

            <div className={styles.filters}>
                <div className={styles.filterGroup}>
                    <label>Статус:</label>
                    <select 
                        value={filter} 
                        onChange={(e) => setFilter(e.target.value as any)}
                        className={styles.filterSelect}
                    >
                        <option value="all">Все</option>
                        <option value="waiting">Ожидание</option>
                        <option value="active">Активные</option>
                        <option value="finished">Завершенные</option>
                        <option value="cancelled">Отмененные</option>
                    </select>
                </div>

                <div className={styles.filterGroup}>
                    <label>Игра:</label>
                    <select 
                        value={gameTypeFilter} 
                        onChange={(e) => setGameTypeFilter(e.target.value as any)}
                        className={styles.filterSelect}
                    >
                        <option value="all">Все игры</option>
                        <option value="tic-tac-toe">Крестики-нолики</option>
                        <option value="checkers">Шашки</option>
                        <option value="chess">Шахматы</option>
                        <option value="backgammon">Нарды</option>
                    </select>
                </div>
            </div>

            {filteredTournaments.length === 0 ? (
                <div className={styles.emptyState}>
                    <h3>Турниры не найдены</h3>
                    <p>Попробуйте изменить фильтры или создать новый турнир</p>
                </div>
            ) : (
                <div className={styles.tournamentsList}>
                    {filteredTournaments.map(tournament => (
                        <div key={tournament._id} className={styles.tournamentCard}>
                            <div className={styles.tournamentHeader}>
                                <h3 className={styles.tournamentName}>{tournament.name}</h3>
                                <span className={`${styles.status} ${styles[tournament.status.toLowerCase()]}`}>
                                    {statusText[tournament.status]}
                                </span>
                            </div>

                            <div className={styles.tournamentInfo}>
                                <div className={styles.infoRow}>
                                    <span className={styles.label}>Игра:</span>
                                    <span>{gameTypeText[tournament.gameType]}</span>
                                </div>
                                <div className={styles.infoRow}>
                                    <span className={styles.label}>Взнос:</span>
                                    <span>{tournament.entryFee} монет</span>
                                </div>
                                <div className={styles.infoRow}>
                                    <span className={styles.label}>Призовой фонд:</span>
                                    <span>{tournament.prizePool} монет</span>
                                </div>
                                <div className={styles.infoRow}>
                                    <span className={styles.label}>Игроки:</span>
                                    <span>
                                        {tournament.players.length}/{tournament.maxPlayers}
                                        <div className={styles.progressBar}>
                                            <div 
                                                className={styles.progressFill}
                                                style={{ 
                                                    width: `${tournamentService.getFilledPercentage(tournament)}%` 
                                                }}
                                            />
                                        </div>
                                    </span>
                                </div>
                            </div>

                            {tournamentService.isStartingSoon(tournament) && (
                                <div className={styles.startTimer}>
                                    ⏰ {getTimeUntilStart(tournament)}
                                </div>
                            )}

                            <div className={styles.tournamentActions}>
                                {tournament.status === 'WAITING' && (
                                    <>
                                        {isPlayerRegistered(tournament) ? (
                                            <button 
                                                onClick={() => handleUnregister(tournament._id)}
                                                className={styles.unregisterButton}
                                            >
                                                Отменить регистрацию
                                            </button>
                                        ) : canPlayerRegister(tournament) ? (
                                            <button 
                                                onClick={() => handleRegister(tournament._id)}
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

                                <button 
                                    onClick={() => navigate(`/tournament/${tournament._id}`)}
                                    className={styles.viewButton}
                                >
                                    Подробнее
                                </button>
                            </div>

                            {tournament.players.length > 0 && (
                                <div className={styles.playersList}>
                                    <h4>Участники:</h4>
                                    <div className={styles.players}>
                                        {tournament.players.map((player, index) => (
                                            <span
                                                key={`${player._id}-${index}`}
                                                className={`${styles.player} ${player.isBot ? styles.bot : ''}`}
                                            >
                                                {player.username}
                                                {player.isBot && ' 🤖'}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default TournamentsListPage;