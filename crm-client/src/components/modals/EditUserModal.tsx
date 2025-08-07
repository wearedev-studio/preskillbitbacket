import React, { useState, useEffect } from 'react';
import styles from './EditUserModal.module.css';
import { X } from 'lucide-react';
import type { IUpdateUserData } from '../../services/adminService';

interface IUser {
    _id: string;
    username: string;
    email: string;
    role: 'USER' | 'ADMIN';
    balance: number;
}

interface EditUserModalProps {
    user: IUser | null;
    isOpen: boolean;
    onClose: () => void;
    onSave: (userId: string, userData: IUpdateUserData) => void;
}

const EditUserModal: React.FC<EditUserModalProps> = ({ user, isOpen, onClose, onSave }) => {
    const [formData, setFormData] = useState<IUpdateUserData>({});

    useEffect(() => {
        if (user) {
            setFormData({
                username: user.username,
                email: user.email,
                role: user.role,
                balance: user.balance
            });
        }
    }, [user]);

    if (!isOpen || !user) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(user._id, formData);
    };

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                <div className={styles.header}>
                    <h2>Редактировать пользователя</h2>
                    <button onClick={onClose} className={styles.closeButton}><X /></button>
                </div>
                <form onSubmit={handleSubmit} className={styles.form}>
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Имя пользователя</label>
                        <input name="username" value={formData.username || ''} onChange={handleChange} className={styles.formInput} />
                    </div>
                     <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Email</label>
                        <input name="email" type="email" value={formData.email || ''} onChange={handleChange} className={styles.formInput} />
                    </div>
                     <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Баланс</label>
                        <input name="balance" type="number" value={formData.balance || 0} onChange={handleChange} className={styles.formInput} />
                    </div>
                     <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Роль</label>
                        <select name="role" value={formData.role || 'USER'} onChange={handleChange} className={styles.formSelect}>
                            <option value="USER">USER</option>
                            <option value="ADMIN">ADMIN</option>
                        </select>
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

export default EditUserModal;