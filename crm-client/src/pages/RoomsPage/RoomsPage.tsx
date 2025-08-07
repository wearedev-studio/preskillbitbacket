import React, { useState, useEffect, useCallback } from 'react';
import { getAdminActiveRooms, deleteAdminRoom, type IActiveRoom } from '../../services/adminService';
import styles from './RoomsPage.module.css';
import { Trash2, RefreshCw } from 'lucide-react';

const RoomsPage: React.FC = () => {
    const [rooms, setRooms] = useState<IActiveRoom[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchRooms = useCallback(async () => {
        try {
            setLoading(true);
            const data = await getAdminActiveRooms();
            setRooms(data);
        } catch (error) {
            console.error("Failed to fetch active rooms", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchRooms();
    }, [fetchRooms]);

    const handleDeleteRoom = async (roomId: string) => {
        if (window.confirm(`Вы уверены, что хотите закрыть комнату ${roomId}? Игроки будут уведомлены.`)) {
            try {
                await deleteAdminRoom(roomId);
                setRooms(prevRooms => prevRooms.filter(room => room.id !== roomId));
            } catch (error) {
                alert('Не удалось закрыть комнату.');
                console.error("Failed to delete room", error);
            }
        }
    };

    return (
        <div className={styles.card}>
            <div className={styles.header}>
                <h1>Активные комнаты</h1>
                <button onClick={fetchRooms} className={`${styles.refreshButton} ${loading ? styles.loading : ''}`} disabled={loading}>
                    <RefreshCw size={16} />
                    <span>Обновить</span>
                </button>
            </div>
            <div className={styles.tableContainer}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>ID Комнаты</th>
                            <th>Игра</th>
                            <th>Ставка</th>
                            <th>Игроки</th>
                            <th>Действия</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rooms.map(room => (
                            <tr key={room.id}>
                                <td>{room.id}</td>
                                <td>{room.gameType}</td>
                                <td>${room.bet}</td>
                                <td>{room.players.join(', ')}</td>
                                <td>
                                    <div className={styles.actions}>
                                        <button className={styles.deleteButton} onClick={() => handleDeleteRoom(room.id)}>
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
    );
};

export default RoomsPage;