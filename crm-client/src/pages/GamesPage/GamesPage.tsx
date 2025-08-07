import React, { useState, useEffect } from 'react';
import { getAdminGameRecords, type IGameRecord } from '../../services/adminService';
import styles from './GamesPage.module.css';

const GamesPage: React.FC = () => {
    const [gameRecords, setGameRecords] = useState<IGameRecord[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchGameRecords = async () => {
            try {
                const data = await getAdminGameRecords();
                setGameRecords(data);
            } catch (error) {
                console.error("Failed to fetch game records", error);
            } finally {
                setLoading(false);
            }
        };
        fetchGameRecords();
    }, []);

    if (loading) {
        return <p>Загрузка истории игр...</p>;
    }

    const getStatusStyle = (status: string) => {
        const styleKey = `status_${status}`;
        return styles[styleKey] || '';
    };

    const getStatusText = (status: string) => {
        if (status === 'WON') return 'Победа';
        if (status === 'LOST') return 'Поражение';
        return 'Ничья';
    };

    return (
        <div className={styles.card}>
            <div className={styles.header}>
                <h1>История Игр</h1>
            </div>
            <div className={styles.tableContainer}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Игра</th>
                            <th>Игрок</th>
                            <th>Противник</th>
                            <th>Результат</th>
                            <th>Изменение баланса</th>
                            <th>Дата</th>
                        </tr>
                    </thead>
                    <tbody>
                        {gameRecords.map(game => (
                            <tr key={game._id}>
                                <td>{game.gameName}</td>
                                <td className={styles.userCell}>{game.user?.username || 'N/A'}</td>
                                <td>{game.opponent}</td>
                                <td>
                                    <span className={`${styles.statusBadge} ${getStatusStyle(game.status)}`}>
                                        {getStatusText(game.status)}
                                    </span>
                                </td>
                                <td className={game.amountChanged >= 0 ? styles.amountPositive : styles.amountNegative}>
                                    {game.amountChanged >= 0 ? '+' : ''}${game.amountChanged.toFixed(2)}
                                </td>
                                <td>{new Date(game.createdAt).toLocaleString()}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default GamesPage;