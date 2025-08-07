import React, { type ReactNode } from 'react';
import styles from './AuthLayout.module.css';

const AuthLayout: React.FC<{ children: ReactNode }> = ({ children }) => {
    return (
        <div className={styles.container}>
            <div className={styles.cardWrapper}>
                <div className={styles.card}>
                    {children}
                </div>
            </div>
        </div>
    );
};

export default AuthLayout;