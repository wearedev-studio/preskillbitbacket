import React, { useState, useEffect, useCallback } from 'react';
import { getAdminTournaments, createAdminTournament, deleteAdminTournament, updateAdminTournament, type ITournament } from '../../services/adminService';
import styles from './TournamentsPage.module.css';
import { Edit, Trash2, PlusCircle  } from 'lucide-react';

import EditTournamentModal from '../../components/modals/EditTournamentModal';

const CreateTournamentForm: React.FC<{ onFinish: () => void }> = ({ onFinish }) => {
    const [name, setName] = useState('');
    const [gameType, setGameType] = useState('chess');
    const [entryFee, setEntryFee] = useState(10);
    const [maxPlayers, setMaxPlayers] = useState(8);
    const [startTime, setStartTime] = useState('');


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await createAdminTournament({ name, gameType, entryFee, maxPlayers, startTime });
            onFinish();
        } catch (error) {
            alert('Не удалось создать турнир');
        }
    };

    return (
        <div className={styles.createForm}>
            <form onSubmit={handleSubmit}>
                <div className={styles.formRow}>
                    <div className={styles.formGroup}><label className={styles.formLabel}>Название</label><input type="text" value={name} onChange={e => setName(e.target.value)} required className={styles.formInput} /></div>
                    <div className={styles.formGroup}><label className={styles.formLabel}>Игра</label><select value={gameType} onChange={e => setGameType(e.target.value)} className={styles.formSelect}><option value="chess">Шахматы</option><option value="checkers">Шашки</option><option value="tic-tac-toe">Крестики-нолики</option><option value="backgammon">Нарды</option></select></div>
                </div>
                <div className={styles.formRow}>
                    <div className={styles.formGroup}><label className={styles.formLabel}>Взнос</label><input type="number" value={entryFee} onChange={e => setEntryFee(Number(e.target.value))} min="0" className={styles.formInput} /></div>
                    <div className={styles.formGroup}><label className={styles.formLabel}>Игроки</label><select value={maxPlayers} onChange={e => setMaxPlayers(Number(e.target.value))} className={styles.formSelect}><option value={4}>4</option><option value={8}>8</option><option value={16}>16</option><option value={32}>32</option></select></div>
                    <div className={styles.formGroup}><label className={styles.formLabel}>Время начала</label><input type="datetime-local" value={startTime} onChange={e => setStartTime(e.target.value)} required className={styles.formInput} /></div>
                </div>
                <div className={styles.formActions}>
                    <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`}>Создать</button>
                    <button type="button" onClick={onFinish} className={`${styles.btn} ${styles.btnSecondary}`}>Отмена</button>
                </div>
            </form>
        </div>
    );
};


const TournamentsPage: React.FC = () => {
    const [tournaments, setTournaments] = useState<ITournament[]>([]);
    const [loading, setLoading] = useState(true);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingTournament, setEditingTournament] = useState<ITournament | null>(null);
    const [showCreateForm, setShowCreateForm] = useState(false);    

    const fetchTournaments = useCallback(async () => {
        try {
            setLoading(true);
            const data = await getAdminTournaments();
            setTournaments(data);
        } catch (error) {
            console.error("Failed to fetch tournaments", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchTournaments();
    }, [fetchTournaments]);

    const handleOpenEditModal = (tournament: ITournament) => {
        setEditingTournament(tournament);
        setIsEditModalOpen(true);
    };

    const handleCloseEditModal = () => {
        setIsEditModalOpen(false);
        setEditingTournament(null);
    };

    const handleSaveTournament = async (tournamentId: string, tournamentData: any) => {
        try {
            await updateAdminTournament(tournamentId, tournamentData);
            handleCloseEditModal();
            fetchTournaments();
        } catch (error) {
            alert('Не удалось обновить турнир');
        }
    };

    const handleDeleteTournament = async (tournamentId: string) => {
        if (window.confirm('Вы уверены, что хотите удалить этот турнир?')) {
            try {
                await deleteAdminTournament(tournamentId);
                fetchTournaments();
            } catch (error) {
                alert('Не удалось удалить турнир.');
            }
        }
    };

    const handleCreationFinish = () => {
        setShowCreateForm(false);
        fetchTournaments();
    };

    if (loading) return <p>Загрузка турниров...</p>;

    return (
        <>
            <div className={styles.card}>
                <div className={styles.header}>
                    <h1>Турниры</h1>
                </div>
                <div className={`${styles.header} flex justify-between items-center`}>
                    <h1>Турниры</h1>
                    <button onClick={() => setShowCreateForm(!showCreateForm)} className={`${styles.btn} ${styles.btnPrimary}`}>
                        <PlusCircle size={16} />
                        <span>{showCreateForm ? 'Скрыть' : 'Создать турнир'}</span>
                    </button>
                </div>

                {showCreateForm && <CreateTournamentForm onFinish={handleCreationFinish} />}
             
                <div className={styles.tableContainer}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Название</th>
                                <th>Игра</th>
                                <th>Статус</th>
                                <th>Игроки</th>
                                <th>Взнос</th>
                                <th>Начало</th>
                                <th>Действия</th>
                            </tr>
                        </thead>
                        <tbody>
                            {tournaments.map(tournament => (
                                <tr key={tournament._id}>
                                    <td className={styles.nameCell}>{tournament.name}</td>
                                    <td>{tournament.gameType}</td>
                                    <td>{tournament.status}</td>
                                    <td>{tournament.players.length} / {tournament.maxPlayers}</td>
                                    <td>${tournament.entryFee}</td>
                                    <td>{new Date(tournament.startTime).toLocaleString()}</td>
                                    <td>
                                        <div className={styles.actions}>
                                            <button className={styles.actionButton} onClick={() => handleOpenEditModal(tournament)}>
                                                <Edit size={16} />
                                            </button>
                                            <button className={`${styles.actionButton} ${styles.deleteButton}`} onClick={() => handleDeleteTournament(tournament._id)}>
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            <EditTournamentModal
                isOpen={isEditModalOpen}
                tournament={editingTournament}
                onClose={handleCloseEditModal}
                onSave={handleSaveTournament}
            />
        </>
    );
};

export default TournamentsPage;