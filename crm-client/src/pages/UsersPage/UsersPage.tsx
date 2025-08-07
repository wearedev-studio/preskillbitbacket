import React, { useState, useEffect, useCallback } from 'react';
import { getAdminUsers, updateUser, deleteUser } from '../../services/adminService';
import styles from './UsersPage.module.css';
import { Edit, Trash2 } from 'lucide-react';

import EditUserModal from '../../components/modals/EditUserModal';

interface IUser {
    _id: string;
    username: string;
    email: string;
    role: 'USER' | 'ADMIN';
    balance: number;
}

const UsersPage: React.FC = () => {
        const [users, setUsers] = useState<IUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<IUser | null>(null);

    const fetchUsers = useCallback(async () => {
        try {
            setLoading(true);
            const data = await getAdminUsers();
            setUsers(data);
        } catch (error) {
            console.error("Failed to fetch users", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const handleOpenEditModal = (user: IUser) => {
        setEditingUser(user);
        setIsEditModalOpen(true);
    };

    const handleCloseEditModal = () => {
        setIsEditModalOpen(false);
        setEditingUser(null);
    };

    const handleSaveUser = async (userId: string, userData: any) => {
        try {
            await updateUser(userId, userData);
            handleCloseEditModal();
            fetchUsers();
        } catch (error) {
            alert('Не удалось обновить пользователя');
        }
    };

    const handleDeleteUser = async (userId: string) => {
        if (window.confirm('Вы уверены, что хотите удалить этого пользователя?')) {
            try {
                await deleteUser(userId);
                fetchUsers();
            } catch (error) {
                alert('Не удалось удалить пользователя');
            }
        }
    };

    if (loading) return <p>Загрузка пользователей...</p>;

    return (
        <>
             <div className={styles.card}>
            <div className={styles.header}>
                <h1>Пользователи</h1>
            </div>
            <div className={styles.tableContainer}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Пользователь</th>
                            <th>Роль</th>
                            <th>Баланс</th>
                            <th>Действия</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(user => (
                            <tr key={user._id}>
                                <td>
                                    <div className={styles.userCell}>
                                        <div className={styles.avatar}>
                                            {user.username.substring(0, 2).toUpperCase()}
                                        </div>
                                        <div>
                                            <p className={styles.username}>{user.username}</p>
                                            <p className={styles.email}>{user.email}</p>
                                        </div>
                                    </div>
                                </td>
                                <td>
                                    <span className={`${styles.roleBadge} ${user.role === 'ADMIN' ? styles.roleAdmin : styles.roleUser}`}>
                                        {user.role}
                                    </span>
                                </td>
                                <td>${user.balance.toFixed(2)}</td>
                                <td>
                                    <div className={styles.actions}>
                                        <button className={styles.actionButton} onClick={() => handleOpenEditModal(user)}><Edit size={16} /></button>
                                            <button className={styles.actionButton} onClick={() => handleDeleteUser(user._id)}><Trash2 size={16} /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
            <EditUserModal 
                isOpen={isEditModalOpen}
                user={editingUser}
                onClose={handleCloseEditModal}
                onSave={handleSaveUser}
            />
        </>
    );
};

export default UsersPage;