import React, { useState, useEffect } from 'react';
import { Tournament, tournamentService, CreateTournamentRequest } from '../../services/tournamentService';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import styles from './AdminTournamentsPage.module.css';

interface CreateTournamentForm {
    name: string;
    gameType: 'tic-tac-toe' | 'checkers' | 'chess' | 'backgammon';
    maxPlayers: 4 | 8 | 16 | 32;
    entryFee: number;
    platformCommission: number;
}

const AdminTournamentsPage: React.FC = () => {
    const [tournaments, setTournaments] = useState<Tournament[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [createLoading, setCreateLoading] = useState(false);
    const [filter, setFilter] = useState<'all' | 'waiting' | 'active' | 'finished'>('all');
    
    const [createForm, setCreateForm] = useState<CreateTournamentForm>({
        name: '',
        gameType: 'chess',
        maxPlayers: 8,
        entryFee: 100,
        platformCommission: 10
    });

    const { user } = useAuth();
    const { socket } = useSocket();

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

    const handleCreateTournament = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!createForm.name.trim()) {
            alert('Введите название турнира');
            return;
        }

        try {
            setCreateLoading(true);
            const tournamentData: CreateTournamentRequest = {
                name: createForm.name.trim(),
                gameType: createForm.gameType,
                maxPlayers: createForm.maxPlayers,
                entryFee: createForm.entryFee,
                platformCommission: createForm.platformCommission
            };

            await tournamentService.createTournament(tournamentData);
            
            setCreateForm({
                name: '',
                gameType: 'chess',
                maxPlayers: 8,
                entryFee: 100,
                platformCommission: 10
            });
            
            setShowCreateForm(false);
            await loadTournaments();
            
        } catch (err: any) {
            alert(`Ошибка создания турнира: ${err.message}`);
        } finally {
            setCreateLoading(false);
        }
    };

    const filteredTournaments = tournaments.filter(tournament => {
        if (filter === 'all') return true;
        return tournament.status.toLowerCase() === filter;
    });

    const calculatePrizeDistribution = (prizePool: number, commission: number) => {
        const netPool = prizePool - (prizePool * commission / 100);
        return {
            first: Math.floor(netPool * 0.6),
            second: Math.floor(netPool * 0.3),
            third: Math.floor(netPool * 0.1),
            commission: Math.floor(prizePool * commission / 100)
        };
    };

    if (loading) {
        return (
            <div className={styles.container}>
                <div className={styles.loading}>Загрузка турниров...</div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1>Управление турнирами</h1>
                <div className={styles.headerActions}>
                    <button 
                        onClick={loadTournaments} 
                        className={styles.refreshButton}
                        disabled={loading}
                    >
                        🔄 Обновить
                    </button>
                    <button 
                        onClick={() => setShowCreateForm(true)}
                        className={styles.createButton}
                    >
                        ➕ Создать турнир
                    </button>
                </div>
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
                    </select>
                </div>
            </div>

            {error && (
                <div className={styles.error}>
                    Ошибка: {error}
                    <button onClick={loadTournaments} className={styles.retryButton}>
                        Попробовать снова
                    </button>
                </div>
            )}

            <div className={styles.tournamentsList}>
                {filteredTournaments.length === 0 ? (
                    <div className={styles.emptyState}>
                        <h3>Турниры не найдены</h3>
                        <p>Создайте новый турнир или измените фильтры</p>
                    </div>
                ) : (
                    filteredTournaments.map(tournament => {
                        const prizes = calculatePrizeDistribution(tournament.prizePool, tournament.platformCommission);
                        
                        return (
                            <div key={tournament._id} className={styles.tournamentCard}>
                                <div className={styles.tournamentHeader}>
                                    <h3>{tournament.name}</h3>
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
                                            <span className={styles.label}>Игроки:</span>
                                            <span>{tournament.players.length}/{tournament.maxPlayers}</span>
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
                                            <span className={styles.label}>Комиссия:</span>
                                            <span>{tournament.platformCommission}% ({prizes.commission} монет)</span>
                                        </div>
                                        <div className={styles.infoItem}>
                                            <span className={styles.label}>Создан:</span>
                                            <span>{new Date(tournament.createdAt).toLocaleString()}</span>
                                        </div>
                                    </div>

                                    {tournament.prizePool > 0 && (
                                        <div className={styles.prizeDistribution}>
                                            <h4>Распределение призов:</h4>
                                            <div className={styles.prizes}>
                                                <div className={styles.prize}>
                                                    🥇 1 место: {prizes.first} монет
                                                </div>
                                                <div className={styles.prize}>
                                                    🥈 2 место: {prizes.second} монет
                                                </div>
                                                <div className={styles.prize}>
                                                    🥉 3-4 места: {prizes.third} монет
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {tournament.players.length > 0 && (
                                        <div className={styles.participantsList}>
                                            <h4>Участники:</h4>
                                            <div className={styles.participants}>
                                                {tournament.players.map((player, index) => (
                                                    <span 
                                                        key={player._id} 
                                                        className={`${styles.participant} ${player.isBot ? styles.bot : ''}`}
                                                    >
                                                        {player.username}
                                                        {player.isBot && ' 🤖'}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {tournament.status === 'FINISHED' && tournament.winner && (
                                        <div className={styles.winner}>
                                            🏆 Победитель: {tournament.winner.username}
                                            {tournament.winner.isBot && ' 🤖'}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Модальное окно создания турнира */}
            {showCreateForm && (
                <div className={styles.modal}>
                    <div className={styles.modalContent}>
                        <div className={styles.modalHeader}>
                            <h2>Создать новый турнир</h2>
                            <button 
                                onClick={() => setShowCreateForm(false)}
                                className={styles.closeButton}
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleCreateTournament} className={styles.createForm}>
                            <div className={styles.formGroup}>
                                <label>Название турнира:</label>
                                <input
                                    type="text"
                                    value={createForm.name}
                                    onChange={(e) => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
                                    placeholder="Введите название турнира"
                                    required
                                />
                            </div>

                            <div className={styles.formGroup}>
                                <label>Тип игры:</label>
                                <select
                                    value={createForm.gameType}
                                    onChange={(e) => setCreateForm(prev => ({ ...prev, gameType: e.target.value as any }))}
                                >
                                    <option value="tic-tac-toe">Крестики-нолики</option>
                                    <option value="checkers">Шашки</option>
                                    <option value="chess">Шахматы</option>
                                    <option value="backgammon">Нарды</option>
                                </select>
                            </div>

                            <div className={styles.formGroup}>
                                <label>Количество игроков:</label>
                                <select
                                    value={createForm.maxPlayers}
                                    onChange={(e) => setCreateForm(prev => ({ ...prev, maxPlayers: Number(e.target.value) as any }))}
                                >
                                    <option value={4}>4 игрока</option>
                                    <option value={8}>8 игроков</option>
                                    <option value={16}>16 игроков</option>
                                    <option value={32}>32 игрока</option>
                                </select>
                            </div>

                            <div className={styles.formGroup}>
                                <label>Взнос (монеты):</label>
                                <input
                                    type="number"
                                    min="0"
                                    value={createForm.entryFee}
                                    onChange={(e) => setCreateForm(prev => ({ ...prev, entryFee: Number(e.target.value) }))}
                                />
                            </div>

                            <div className={styles.formGroup}>
                                <label>Комиссия платформы (%):</label>
                                <input
                                    type="number"
                                    min="0"
                                    max="50"
                                    value={createForm.platformCommission}
                                    onChange={(e) => setCreateForm(prev => ({ ...prev, platformCommission: Number(e.target.value) }))}
                                />
                            </div>

                            <div className={styles.prizePreview}>
                                <h4>Предварительное распределение призов:</h4>
                                {(() => {
                                    const totalPool = createForm.entryFee * createForm.maxPlayers;
                                    const prizes = calculatePrizeDistribution(totalPool, createForm.platformCommission);
                                    return (
                                        <div className={styles.previewPrizes}>
                                            <div>Общий фонд: {totalPool} монет</div>
                                            <div>Комиссия: {prizes.commission} монет</div>
                                            <div>🥇 1 место: {prizes.first} монет</div>
                                            <div>🥈 2 место: {prizes.second} монет</div>
                                            <div>🥉 3-4 места: {prizes.third} монет</div>
                                        </div>
                                    );
                                })()}
                            </div>

                            <div className={styles.formActions}>
                                <button 
                                    type="button" 
                                    onClick={() => setShowCreateForm(false)}
                                    className={styles.cancelButton}
                                >
                                    Отмена
                                </button>
                                <button 
                                    type="submit" 
                                    disabled={createLoading}
                                    className={styles.submitButton}
                                >
                                    {createLoading ? 'Создание...' : 'Создать турнир'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminTournamentsPage;