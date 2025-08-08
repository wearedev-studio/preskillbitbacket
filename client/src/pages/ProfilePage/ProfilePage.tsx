import React, { useState, useEffect, FormEvent, ChangeEvent, FC } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import Avatar from '../../components/common/Avatar';

import { IGameRecord, ITransaction } from '../../types/entities';
import styles from './ProfilePage.module.css';
import { API_URL } from '../../api/index';
import { submitKycDocument } from '@/services/api';
import KycModal from '../../components/modals/KycModal';
import PaymentStatusModal from '../../components/modals/PaymentStatusModal';
import DepositModal from '../../components/modals/DepositModal';
import WithdrawModal from '../../components/modals/WithdrawModal';
import PaymentHistory from '../../components/PaymentHistory/PaymentHistory';

const HistoryTable: FC<{ headers: string[]; children: React.ReactNode }> = ({ headers, children }) => (
    <table className={styles.historyTable}>
        <thead><tr>{headers.map(h => <th key={h}>{h}</th>)}</tr></thead>
        <tbody>{children}</tbody>
    </table>
);

interface KYCStatusProps {
    user: NonNullable<ReturnType<typeof useAuth>['user']>;
    onVerifyClick: () => void;
}

const KYCStatus: FC<KYCStatusProps> = ({ user, onVerifyClick }) => {
    const statusMap = {
        NOT_SUBMITTED: { text: "Not confirmed", style: styles.kycStatus_REJECTED },
        PENDING: { text: "Under review", style: styles.kycStatus_PENDING },
        APPROVED: { text: "Confirmed", style: styles.kycStatus_APPROVED },
        REJECTED: { text: "Rejected", style: styles.kycStatus_REJECTED },
    };
    
    // @ts-ignore
    const currentStatus = statusMap[user.kycStatus] || statusMap.NOT_SUBMITTED;

    return (
        <div className={`${styles.kycContainer} ${currentStatus.style}`}>
            <h4>Verification status: {currentStatus.text}</h4>
            
            {user.kycStatus === 'REJECTED' && (
                <p><strong>Cause:</strong> {user.kycRejectionReason}</p>
            )}

            {(user.kycStatus === 'NOT_SUBMITTED' || user.kycStatus === 'REJECTED') && (
                <button onClick={onVerifyClick} className={`${styles.btn} ${styles.btnPrimary}`} style={{marginTop: '1rem'}}>
                    Pass verification
                </button>
            )}
        </div>
    );
};

const ProfilePage: React.FC = () => {
    const { user, refreshUser } = useAuth();
    const { socket } = useSocket();

    const [gameHistory, setGameHistory] = useState<IGameRecord[]>([]);
    const [transactionHistory, setTransactionHistory] = useState<ITransaction[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(true);
    const [historyError, setHistoryError] = useState('');

    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [passwordMessage, setPasswordMessage] = useState({ type: '', text: '' });

    const [balanceAmount, setBalanceAmount] = useState('');
    const [balanceMessage, setBalanceMessage] = useState({ type: '', text: '' });

    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

    const [kycFile, setKycFile] = useState<File | null>(null);
    const [kycDocType, setKycDocType] = useState('PASSPORT');
    const [kycMessage, setKycMessage] = useState({ type: '', text: '' });

    const [isKycModalOpen, setIsKycModalOpen] = useState(false);
    const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
    const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
    
    const [paymentModal, setPaymentModal] = useState({
        isOpen: false,
        status: 'success' as 'success' | 'error' | 'loading',
        title: '',
        message: '',
        amount: 0,
        operation: 'deposit' as 'deposit' | 'withdraw'
    });

    const handleKycSuccess = async () => {
        await refreshUser();
    };


    const handleKycFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) setKycFile(file);
    };

    const handleKycSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!kycFile) {
            setKycMessage({ type: 'error', text: 'Please select a file to upload.' });
            return;
        }
        
        const formData = new FormData();
        formData.append('document', kycFile);
        formData.append('documentType', kycDocType);

        try {
            const res = await submitKycDocument(formData);
            setKycMessage({ type: 'success', text: res.data.message });
            await refreshUser();
        } catch (error: any) {
            setKycMessage({ type: 'error', text: error.response?.data?.message || 'Upload error' });
        }
    };

    const fetchHistory = async () => {
        setHistoryError('');
        setLoadingHistory(true);
        try {
            const [gamesRes, transactionsRes] = await Promise.all([
                axios.get(`${API_URL}/api/users/history/games`),
                axios.get(`${API_URL}/api/users/history/transactions`),
            ]);
            setGameHistory(gamesRes.data);
            setTransactionHistory(transactionsRes.data);
        } catch (err: any) {
            console.error('Failed to fetch history:', err);
            setHistoryError(err.response?.data?.message || 'Failed to load history');
        } finally {
            setLoadingHistory(false);
        }
    }

    useEffect(() => {
        fetchHistory();
    }, []);

    useEffect(() => {
        if (!socket || !user) return;

        const handleBalanceUpdate = (data: {
            userId: string;
            newBalance: number;
            transaction: {
                type: string;
                amount: number;
                status: string;
                createdAt: string;
            };
        }) => {
            if (data.userId === user._id) {
                console.log('[ProfilePage] Balance updated via Socket.IO:', data);
                
                refreshUser();
                
                fetchHistory();
            }
        };

        const handleKycStatusUpdate = (data: {
            userId: string;
            kycStatus: string;
            kycRejectionReason?: string;
        }) => {
            if (data.userId === user._id) {
                console.log('[ProfilePage] KYC status updated via Socket.IO:', data);
                
                refreshUser();
            }
        };

        socket.on('balanceUpdated', handleBalanceUpdate);
        socket.on('kycStatusUpdated', handleKycStatusUpdate);

        return () => {
            socket.off('balanceUpdated', handleBalanceUpdate);
            socket.off('kycStatusUpdated', handleKycStatusUpdate);
        };
    }, [socket, user, refreshUser]);

    const handlePasswordChange = async (e: FormEvent) => {
        e.preventDefault();
        setPasswordMessage({ type: '', text: '' });
        if (newPassword.length < 6) {
            setPasswordMessage({ type: 'error', text: 'The new password must be at least 6 characters long' });
            return;
        }
        try {
            await axios.put(`${API_URL}/api/users/profile/password`, { currentPassword, newPassword });
            setPasswordMessage({ type: 'success', text: 'Password successfully updated!' });
            setCurrentPassword('');
            setNewPassword('');
        } catch (err: any) {
            setPasswordMessage({ type: 'error', text: err.response?.data?.message || 'Error changing password' });
        }
    };

    const handleDepositClick = () => {
        setIsDepositModalOpen(true);
    };

    const handleWithdrawClick = () => {
        if (user?.kycStatus !== 'APPROVED') {
            setIsKycModalOpen(true);
            return;
        }
        setIsWithdrawModalOpen(true);
    };

    const handleDepositSuccess = (amount: number) => {
        setPaymentModal({
            isOpen: true,
            status: 'success',
            title: 'Deposit Successful!',
            message: `Your deposit of $${amount.toFixed(2)} has been processed successfully.`,
            amount,
            operation: 'deposit'
        });
        refreshUser();
        fetchHistory();
    };

    const handleWithdrawSuccess = (amount: number) => {
        setPaymentModal({
            isOpen: true,
            status: 'success',
            title: 'Withdrawal Requested!',
            message: `Your withdrawal request for $${amount.toFixed(2)} has been submitted and will be processed within 1-3 business days.`,
            amount,
            operation: 'withdraw'
        });
        refreshUser();
        fetchHistory();
    };

    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setAvatarFile(file);
            setAvatarPreview(URL.createObjectURL(file));
        }
    };

    const handleAvatarUpload = async () => {
        if (!avatarFile) return;

        const formData = new FormData();
        formData.append('avatar', avatarFile);

        try {
            await axios.put(`${API_URL}/api/users/profile/avatar`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            await refreshUser();
            setAvatarFile(null);
            setAvatarPreview(null);
        } catch (error) {
            setPaymentModal({
                isOpen: true,
                status: 'error',
                title: 'Upload Error',
                message: 'Failed to upload avatar. Make sure it is an image smaller than 5MB.',
                amount: 0,
                operation: 'deposit'
            });
        }
    };

    if (!user) {
        return (
            <div className="loading-container">
                <div className="loading-content">
                    <div className="spinner"></div>
                    <p className="loading-text">Loading profile data...</p>
                </div>
            </div>
        );
    }

    const statusTranslations: Record<IGameRecord['status'], string> = { WON: 'Won', LOST: 'Loss', DRAW: 'Draw' };
    const typeTranslations: Record<ITransaction['type'], string> = { DEPOSIT: 'Deposit', WITHDRAWAL: 'Withdrawal', WAGER_WIN: 'Wager win', WAGER_LOSS: 'Wager loss' };

        return (
        <>
            <div className={styles.pageContainer}>
                <div className={styles.profileContainer}>
                    <div className={styles.profileSection}>
                        <h3>Profile</h3>
                        <div className={styles.profileHeader}>
                            <div className={styles.avatarContainer}>
                                {avatarPreview ? (
                                    <img src={avatarPreview} alt="Preview" className={styles.profileAvatarImg} />
                                ) : (
                                    <Avatar size="large" />
                                )}
                                <label htmlFor="avatarInput" className={styles.avatarEditButton}>✏️</label>
                                <input id="avatarInput" type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
                            </div>
                            <div className={styles.profileInfo}>
                                <h2>{user.username}</h2>
                                {avatarFile && (
                                    <div className={styles.avatarActions}>
                                        <button onClick={handleAvatarUpload} className={`${styles.btn} ${styles.btnPrimary}`}>Save</button>
                                        <button onClick={() => { setAvatarFile(null); setAvatarPreview(null); }} className={`${styles.btn} ${styles.btnSecondary}`}>Cancel</button>
                                    </div>
                                )}
                                <p><strong>Email:</strong> {user.email}</p>
                                <p><strong>Balance:</strong> <span className={styles.balanceHighlight}>${user.balance.toFixed(2)}</span></p>
                            </div>
                        </div>
                    </div>

                    <div className={styles.card}>
                             <h3>Verification (KYC)</h3>
                             <KYCStatus user={user} onVerifyClick={() => setIsKycModalOpen(true)} />
                         </div>

                    <div className={styles.profileSection}>
                        <h3>Security</h3>
                        <form onSubmit={handlePasswordChange}>
                            <div className={styles.formGrid}>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>Current Password</label>
                                    <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className={styles.formInput} placeholder="Current Password" required />
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>New Password</label>
                                    <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className={styles.formInput} placeholder="New Password" required />
                                </div>
                            </div>
                            <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`}>🔒 Save Password</button>
                            {passwordMessage.text && <div className={`${styles.alert} ${passwordMessage.type === 'error' ? styles.alertError : styles.alertSuccess}`}><p>{passwordMessage.text}</p></div>}
                        </form>
                    </div>

                    <div className={styles.profileSection}>
                        <h3>Balance Management</h3>
                        <div className={styles.balanceActions}>
                            <div className={styles.balanceInfo}>
                                <p>Current Balance: <span className={styles.balanceHighlight}>${user.balance.toFixed(2)}</span></p>
                                <p className={styles.balanceSubtext}>Manage your account funds using our secure payment gateway</p>
                            </div>
                            <div className={styles.balanceButtons}>
                                <button
                                    onClick={handleDepositClick}
                                    className={`${styles.btn} ${styles.btnSuccess}`}
                                >
                                    💰 Deposit Funds
                                </button>
                                <button
                                    onClick={handleWithdrawClick}
                                    className={`${styles.btn} ${styles.btnSecondary}`}
                                >
                                    💸 Withdraw Funds
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className={styles.profileSection}>
                        <PaymentHistory />
                    </div>

                    <div className={styles.profileSection}>
                        <h3>Game History</h3>
                        <div className={styles.tableContainer}>
                            <HistoryTable headers={['Game', 'Result', 'Balance Change', 'Date']}>
                                {gameHistory.map(game => (
                                    <tr key={game._id}>
                                        <td>{game.gameName}</td>
                                        <td>
                                            <span className={`${styles.badge} ${game.status === 'WON' ? styles.badgeGreen : game.status === 'LOST' ? styles.badgeRed : styles.badgeYellow}`}>
                                                {statusTranslations[game.status]}
                                            </span>
                                        </td>
                                        <td className={game.amountChanged >= 0 ? styles.amountPositive : styles.amountNegative}>
                                            {game.amountChanged >= 0 ? '+' : ''}${game.amountChanged.toFixed(2)}
                                        </td>
                                        <td>{new Date(game.createdAt).toLocaleString()}</td>
                                    </tr>
                                ))}
                            </HistoryTable>
                        </div>
                    </div>

                    <div className={styles.profileSection}>
                        <h3>Legacy Transaction History</h3>
                        <div className={styles.tableContainer}>
                            <HistoryTable headers={['Type', 'Status', 'Amount', 'Date']}>
                                {transactionHistory.map(tx => (
                                    <tr key={tx._id}>
                                        <td>{typeTranslations[tx.type] || tx.type}</td>
                                        <td>{tx.status}</td>
                                        <td>${tx.amount.toFixed(2)}</td>
                                        <td>{new Date(tx.createdAt).toLocaleString()}</td>
                                    </tr>
                                ))}
                            </HistoryTable>
                        </div>
                    </div>
                </div>
            </div>
            <KycModal isOpen={isKycModalOpen} onClose={() => setIsKycModalOpen(false)} onSuccess={handleKycSuccess} />
            <DepositModal
                isOpen={isDepositModalOpen}
                onClose={() => setIsDepositModalOpen(false)}
                onSuccess={handleDepositSuccess}
            />
            <WithdrawModal
                isOpen={isWithdrawModalOpen}
                onClose={() => setIsWithdrawModalOpen(false)}
                onSuccess={handleWithdrawSuccess}
                currentBalance={user.balance}
            />
            <PaymentStatusModal
                isOpen={paymentModal.isOpen}
                status={paymentModal.status}
                title={paymentModal.title}
                message={paymentModal.message}
                amount={paymentModal.amount}
                operation={paymentModal.operation}
                onClose={() => setPaymentModal(prev => ({ ...prev, isOpen: false }))}
            />
        </>
    );
};

export default ProfilePage;