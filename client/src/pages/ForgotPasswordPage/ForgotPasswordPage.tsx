import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import AuthLayout from '../../components/layout/AuthLayout';
import styles from './ForgotPasswordPage.module.css';
import { Crown } from 'lucide-react';
import { API_URL } from '../../api/index';

const ForgotPasswordPage: React.FC = () => {
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage('');
        setError('');
        setIsLoading(true);
        try {
            await axios.post(`${API_URL}/api/auth/forgot-password`, { email });
            setMessage('The reset code has been "sent". You will now be redirected.');
            setTimeout(() => {
                navigate('/reset-password', { state: { email } });
            }, 3000);
        } catch (err: any) {
            setError(err.response?.data?.message || 'An error occurred.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AuthLayout>
            <div className={styles.authHeader}>
                <div className={styles.logo}>
                    <div className={styles.logoIconContainer}><Crown /></div>
                    <h1 className={styles.logoText}>Skill Game</h1>
                </div>
                <h2 className={styles.authTitle}>Password recovery</h2>
                <p className={styles.authSubtitle}>Enter your Email to receive the code</p>
            </div>

            {message ? (
                <div className={styles.alertSuccess}>{message}</div>
            ) : (
                <form onSubmit={handleSubmit} className={styles.authForm}>
                    <div className={styles.formGroup}>
                        <label htmlFor="email" className={styles.formLabel}>Email</label>
                        <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className={styles.formInput} placeholder="you@example.com" />
                    </div>
                    {error && <div className={styles.alertError}><p>{error}</p></div>}
                    <button type="submit" disabled={isLoading} className={`${styles.btn} ${styles.btnPrimary}`}>
                        {isLoading ? 'Sending...' : 'Get code'}
                    </button>
                </form>
            )}

            <div className={styles.authFooter}>
                <p><Link to="/login" className={styles.authLink}>Return to Log In</Link></p>
            </div>
        </AuthLayout>
    );
};

export default ForgotPasswordPage;