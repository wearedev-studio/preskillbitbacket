import React, { useState, useEffect } from 'react';
import { getAdminTransactions, type ITransaction } from '../../services/adminService';
import styles from './TransactionsPage.module.css';

const TransactionsPage: React.FC = () => {
    const [transactions, setTransactions] = useState<ITransaction[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTransactions = async () => {
            try {
                const data = await getAdminTransactions();
                setTransactions(data);
            } catch (error) {
                console.error("Failed to fetch transactions", error);
            } finally {
                setLoading(false);
            }
        };
        fetchTransactions();
    }, []);

    if (loading) {
        return <p>Загрузка транзакций...</p>;
    }

    const getTypeStyle = (type: string) => {
        const styleKey = `type_${type.toUpperCase()}`;
        return styles[styleKey] || '';
    };

    return (
        <div className={styles.card}>
            <div className={styles.header}>
                <h1>Транзакции</h1>
            </div>
            <div className={styles.tableContainer}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Пользователь</th>
                            <th>Тип</th>
                            <th>Сумма</th>
                            <th>Статус</th>
                            <th>Дата</th>
                        </tr>
                    </thead>
                    <tbody>
                        {transactions.map(tx => (
                            <tr key={tx._id}>
                                <td className={styles.userCell}>{tx.user?.username || 'N/A'}</td>
                                <td>
                                    <span className={`${styles.typeBadge} ${getTypeStyle(tx.type)}`}>
                                        {tx.type.replace('_', ' ').toLowerCase()}
                                    </span>
                                </td>
                                <td className={styles.amount}>${tx.amount.toFixed(2)}</td>
                                <td>{tx.status}</td>
                                <td>{new Date(tx.createdAt).toLocaleString()}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default TransactionsPage;