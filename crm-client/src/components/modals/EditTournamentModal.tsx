import React, { useState, useEffect } from 'react';
import styles from './EditUserModal.module.css';
import { X } from 'lucide-react';
import type { IUpdateTournamentData, ITournament } from '../../services/adminService';

interface EditTournamentModalProps {
    tournament: ITournament | null;
    isOpen: boolean;
    onClose: () => void;
    onSave: (tournamentId: string, tournamentData: IUpdateTournamentData) => void;
}

const EditTournamentModal: React.FC<EditTournamentModalProps> = ({ tournament, isOpen, onClose, onSave }) => {
    const [formData, setFormData] = useState<IUpdateTournamentData>({});

    useEffect(() => {
        if (tournament) {
            setFormData({
                name: tournament.name,
                gameType: tournament.gameType,
                entryFee: tournament.entryFee,
                maxPlayers: tournament.maxPlayers,
                startTime: new Date(tournament.startTime).toISOString().slice(0, 16)
            });
        }
    }, [tournament]);

    if (!isOpen || !tournament) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(tournament._id, formData);
    };

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                <div className={styles.header}>
                    <h2>Редактировать турнир</h2>
                    <button onClick={onClose} className={styles.closeButton}><X /></button>
                </div>
                <form onSubmit={handleSubmit} className={styles.form}>
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Название</label>
                        <input name="name" value={formData.name || ''} onChange={handleChange} className={styles.formInput} />
                    </div>
                     <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Игра</label>
                        <select name="gameType" value={formData.gameType || ''} onChange={handleChange} className={styles.formSelect}>
                            <option value="chess">Шахматы</option>
                            <option value="checkers">Шашки</option>
                            <option value="tic-tac-toe">Крестики-нолики</option>
                            <option value="backgammon">Нарды</option>
                        </select>
                    </div>
                     <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Взнос</label>
                        <input name="entryFee" type="number" value={formData.entryFee || 0} onChange={handleChange} className={styles.formInput} />
                    </div>
                     <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Игроки</label>
                        <select name="maxPlayers" value={formData.maxPlayers || 8} onChange={handleChange} className={styles.formSelect}>
                            <option value={4}>4</option>
                            <option value={8}>8</option>
                            <option value={16}>16</option>
                            <option value={32}>32</option>
                        </select>
                    </div>
                     <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Время начала</label>
                        <input name="startTime" type="datetime-local" value={formData.startTime || ''} onChange={handleChange} className={styles.formInput} />
                    </div>
                    <div className={styles.formActions}>
                        <button type="button" onClick={onClose} className={`${styles.btn} ${styles.btnSecondary}`}>Отмена</button>
                        <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`}>Сохранить</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditTournamentModal;