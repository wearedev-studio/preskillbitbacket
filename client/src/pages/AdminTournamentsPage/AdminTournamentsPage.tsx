import React, { useState, useEffect } from 'react';
import { Tournament, tournamentService, CreateTournamentRequest } from '../../services/tournamentService';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import styles from './AdminTournamentsPage.module.css';

interface CreateTournamentForm {
    name: string;
    gameType: 'tic-tac-toe' | 'checkers' | 'chess' | 'backgammon' | 'bingo' | 'domino';
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
        WAITING: 'Waiting for players',
        ACTIVE: 'Active',
        FINISHED: 'Finished',
        CANCELLED: 'Cancelled'
    };

    const gameTypeText = {
        'tic-tac-toe': 'Tic-Tac-Toe',
        'checkers': 'Checkers',
        'chess': 'Chess',
        'backgammon': 'Backgammon',
        'bingo': 'Bingo',
        'domino': 'Domino'
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
            alert('Enter tournament name');
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
            alert(`Tournament creation error: ${err.message}`);
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
                <div className={styles.loading}>Loading tournaments...</div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1>Tournament Management</h1>
                <div className={styles.headerActions}>
                    <button 
                        onClick={loadTournaments} 
                        className={styles.refreshButton}
                        disabled={loading}
                    >
                        🔄 Refresh
                    </button>
                    <button 
                        onClick={() => setShowCreateForm(true)}
                        className={styles.createButton}
                    >
                        ➕ Create Tournament
                    </button>
                </div>
            </div>

            <div className={styles.filters}>
                <div className={styles.filterGroup}>
                    <label>Status:</label>
                    <select 
                        value={filter} 
                        onChange={(e) => setFilter(e.target.value as any)}
                        className={styles.filterSelect}
                    >
                        <option value="all">All</option>
                        <option value="waiting">Waiting</option>
                        <option value="active">Active</option>
                        <option value="finished">Finished</option>
                    </select>
                </div>
            </div>

            {error && (
                <div className={styles.error}>
                    Error: {error}
                    <button onClick={loadTournaments} className={styles.retryButton}>
                        Try Again
                    </button>
                </div>
            )}

            <div className={styles.tournamentsList}>
                {filteredTournaments.length === 0 ? (
                    <div className={styles.emptyState}>
                        <h3>No tournaments found</h3>
                        <p>Create a new tournament or change filters</p>
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
                                            <span className={styles.label}>Game:</span>
                                            <span>{gameTypeText[tournament.gameType]}</span>
                                        </div>
                                        <div className={styles.infoItem}>
                                            <span className={styles.label}>Players:</span>
                                            <span>{tournament.players.length}/{tournament.maxPlayers}</span>
                                        </div>
                                        <div className={styles.infoItem}>
                                            <span className={styles.label}>Entry Fee:</span>
                                            <span>{tournament.entryFee} coins</span>
                                        </div>
                                        <div className={styles.infoItem}>
                                            <span className={styles.label}>Prize Pool:</span>
                                            <span>{tournament.prizePool} coins</span>
                                        </div>
                                        <div className={styles.infoItem}>
                                            <span className={styles.label}>Commission:</span>
                                            <span>{tournament.platformCommission}% ({prizes.commission} coins)</span>
                                        </div>
                                        <div className={styles.infoItem}>
                                            <span className={styles.label}>Created:</span>
                                            <span>{new Date(tournament.createdAt).toLocaleString()}</span>
                                        </div>
                                    </div>

                                    {tournament.prizePool > 0 && (
                                        <div className={styles.prizeDistribution}>
                                            <h4>Prize Distribution:</h4>
                                            <div className={styles.prizes}>
                                                <div className={styles.prize}>
                                                    🥇 1st place: {prizes.first} coins
                                                </div>
                                                <div className={styles.prize}>
                                                    🥈 2nd place: {prizes.second} coins
                                                </div>
                                                <div className={styles.prize}>
                                                    🥉 3rd-4th places: {prizes.third} coins
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {tournament.players.length > 0 && (
                                        <div className={styles.participantsList}>
                                            <h4>Participants:</h4>
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
                                            🏆 Winner: {tournament.winner.username}
                                            {tournament.winner.isBot && ' 🤖'}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Tournament creation modal */}
            {showCreateForm && (
                <div className={styles.modal}>
                    <div className={styles.modalContent}>
                        <div className={styles.modalHeader}>
                            <h2>Create New Tournament</h2>
                            <button 
                                onClick={() => setShowCreateForm(false)}
                                className={styles.closeButton}
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleCreateTournament} className={styles.createForm}>
                            <div className={styles.formGroup}>
                                <label>Tournament Name:</label>
                                <input
                                    type="text"
                                    value={createForm.name}
                                    onChange={(e) => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
                                    placeholder="Enter tournament name"
                                    required
                                />
                            </div>

                            <div className={styles.formGroup}>
                                <label>Game Type:</label>
                                <select
                                    value={createForm.gameType}
                                    onChange={(e) => setCreateForm(prev => ({ ...prev, gameType: e.target.value as any }))}
                                >
                                    <option value="tic-tac-toe">Tic-Tac-Toe</option>
                                    <option value="checkers">Checkers</option>
                                    <option value="chess">Chess</option>
                                    <option value="backgammon">Backgammon</option>
                                    <option value="bingo">Bingo</option>
                                    <option value="domino">Domino</option>
                                </select>
                            </div>

                            <div className={styles.formGroup}>
                                <label>Number of Players:</label>
                                <select
                                    value={createForm.maxPlayers}
                                    onChange={(e) => setCreateForm(prev => ({ ...prev, maxPlayers: Number(e.target.value) as any }))}
                                >
                                    <option value={4}>4 players</option>
                                    <option value={8}>8 players</option>
                                    <option value={16}>16 players</option>
                                    <option value={32}>32 players</option>
                                </select>
                            </div>

                            <div className={styles.formGroup}>
                                <label>Entry Fee (coins):</label>
                                <input
                                    type="number"
                                    min="0"
                                    value={createForm.entryFee}
                                    onChange={(e) => setCreateForm(prev => ({ ...prev, entryFee: Number(e.target.value) }))}
                                />
                            </div>

                            <div className={styles.formGroup}>
                                <label>Platform Commission (%):</label>
                                <input
                                    type="number"
                                    min="0"
                                    max="50"
                                    value={createForm.platformCommission}
                                    onChange={(e) => setCreateForm(prev => ({ ...prev, platformCommission: Number(e.target.value) }))}
                                />
                            </div>

                            <div className={styles.prizePreview}>
                                <h4>Prize Distribution Preview:</h4>
                                {(() => {
                                    const totalPool = createForm.entryFee * createForm.maxPlayers;
                                    const prizes = calculatePrizeDistribution(totalPool, createForm.platformCommission);
                                    return (
                                        <div className={styles.previewPrizes}>
                                            <div>Total Pool: {totalPool} coins</div>
                                            <div>Commission: {prizes.commission} coins</div>
                                            <div>🥇 1st place: {prizes.first} coins</div>
                                            <div>🥈 2nd place: {prizes.second} coins</div>
                                            <div>🥉 3rd-4th places: {prizes.third} coins</div>
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
                                    Cancel
                                </button>
                                <button 
                                    type="submit" 
                                    disabled={createLoading}
                                    className={styles.submitButton}
                                >
                                    {createLoading ? 'Creating...' : 'Create Tournament'}
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