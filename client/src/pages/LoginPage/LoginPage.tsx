import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import styles from './LoginPage.module.css';
import { Crown } from 'lucide-react';
import { API_URL } from '../../api/index';

const LoginPage: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();
    const { login } = useAuth();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            const res = await axios.post(`${API_URL}/api/auth/login`, { email, password });
            const { token, ...user } = res.data;
            login({ token, user });
            navigate('/');
        } catch (err: any) {
            setError(err.response?.data?.message || 'Login error. Please check your details..');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={styles.authContainer}>
            <div className={styles.authCard}>
                <div className={styles.authHeader}>
                    <div className={styles.logo}>
                        <div className={styles.logoIconContainer}><Crown /></div>
                        <h1 className={styles.logoText}>Skill Game</h1>
                    </div>
                    <h2 className={styles.authTitle}>Log In</h2>
                    <p className={styles.authSubtitle}>Welcome back!</p>
                </div>

                <form onSubmit={handleSubmit} className={styles.authForm}>
                    <div className={styles.formGroup}>
                        <label htmlFor="email" className={styles.formLabel}>Email address</label>
                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className={styles.formInput}
                            placeholder="you@example.com"
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label htmlFor="password" className={styles.formLabel}>Password</label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className={styles.formInput}
                            placeholder="••••••••"
                        />
                    </div>

                    {error && <div className={styles.alertError}><p>{error}</p></div>}

                    <button type="submit" disabled={isLoading} className={`${styles.btn} ${styles.btnPrimary}`}>
                        {isLoading ? (
                            <><div className={styles.spinner}></div><span>Log In...</span></>
                        ) : ( "Login" )}
                    </button>
                </form>

                <div className={styles.authFooter}>
                    <p>
                        <Link to="/forgot-password" className={styles.authLink}>Forgot your password??</Link>
                    </p>
                    <p style={{ marginTop: '0.5rem' }}>
                        No account?{' '}
                        <Link to="/register" className={styles.authLink}>Sign Up</Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;