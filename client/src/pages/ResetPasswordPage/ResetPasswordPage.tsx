import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import axios from 'axios';
import AuthLayout from '../../components/layout/AuthLayout';
import styles from './ResetPasswordPage.module.css';
import { KeyRound } from 'lucide-react';
import { API_URL } from '../../api/index';

const ResetPasswordPage: React.FC = () => {
    const [secretCode, setSecretCode] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const email = location.state?.email;

    useEffect(() => {
        if (!email) {
            setError('Email not found. Please start reset procedure again..');
            setTimeout(() => navigate('/forgot-password'), 3000);
        }
    }, [email, navigate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage('');
        setError('');
        setIsLoading(true);
        try {
            await axios.post(`${API_URL}/api/auth/reset-password`, { email, secretCode, newPassword });
            setMessage('Password successfully reset! Redirecting to login page...');
            setTimeout(() => navigate('/login'), 3000);
        } catch (err: any) {
            setError(err.response?.data?.message || 'An error occurred.');
        } finally {
            setIsLoading(false);
        }
    };

    if (!email) {
        return <AuthLayout><div className={styles.alertError}>{error || 'Redirection...'}</div></AuthLayout>;
    }

    return (
        <AuthLayout>
            <div className={styles.authHeader}>
                <div className={styles.authIcon}><KeyRound /></div>
                <h2 className={styles.authTitle}>Setting a new password</h2>
                <p className={styles.authSubtitle}>for account: <strong>{email}</strong></p>
            </div>

            {message ? (
                <div className={styles.alertSuccess}>{message}</div>
            ) : (
                <form onSubmit={handleSubmit} className={styles.authForm}>
                    <div className={styles.formGroup}>
                        <label htmlFor="secretCode" className={styles.formLabel}>Secret code</label>
                        <input id="secretCode" type="text" value={secretCode} onChange={(e) => setSecretCode(e.target.value)} required className={styles.formInput} placeholder="Enter the code from the email" />
                    </div>
                    <div className={styles.formGroup}>
                        <label htmlFor="newPassword" className={styles.formLabel}>New Password</label>
                        <input id="newPassword" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required className={styles.formInput} placeholder="Min 6 characters" />
                    </div>

                    {error && <div className={styles.alertError}><p>{error}</p></div>}
                    
                    <button type="submit" disabled={isLoading} className={`${styles.btn} ${styles.btnPrimary}`}>
                        {isLoading ? 'Saving...' : 'Reset password'}
                    </button>
                </form>
            )}

             <div className={styles.authFooter}>
                <p><Link to="/login" className={styles.authLink}>Return to Log In</Link></p>
            </div>
        </AuthLayout>
    );
};

export default ResetPasswordPage;