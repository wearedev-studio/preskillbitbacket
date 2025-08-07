import React, { useState } from 'react';
import { createAdminRoom } from '../../services/adminService';
import styles from './CreateRoomPage.module.css';

const CreateRoomPage: React.FC = () => {
    const [gameType, setGameType] = useState('tic-tac-toe');
    const [bet, setBet] = useState(50);
    const [message, setMessage] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage('');
        try {
            const data = await createAdminRoom({ gameType, bet });
            setMessage(`Успешно! Комната создана: ${data.room.id}`);
        } catch (error: any) {
            setMessage(`Ошибка: ${error.response?.data?.message || 'Что-то пошло не так'}`);
        }
    };

    return (
        <div className={styles.card}>
            <div className={styles.header}>
                <h1>Создать комнату в лобби</h1>
            </div>
            <form onSubmit={handleSubmit} className={styles.form}>
                <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Игра</label>
                    <select value={gameType} onChange={e => setGameType(e.target.value)} className={styles.formSelect}>
                        <option value="tic-tac-toe">Крестики-нолики</option>
                        <option value="checkers">Шашки</option>
                        <option value="chess">Шахматы</option>
                        <option value="backgammon">Нарды</option>
                    </select>
                </div>
                <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Ставка ($)</label>
                    <input type="number" value={bet} onChange={e => setBet(Number(e.target.value))} min="1" className={styles.formInput} />
                </div>
                <button type="submit" className={styles.formButton}>Создать</button>
                {message && (
                    <p className={`${styles.message} ${message.startsWith('Ошибка') ? styles.error : styles.success}`}>
                        {message}
                    </p>
                )}
            </form>
        </div>
    );
};

export default CreateRoomPage;