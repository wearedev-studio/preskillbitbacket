import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import styles from './AdminLayout.module.css';

const AdminLayout: React.FC = () => {
    return (
        <div className={styles.layoutContainer}>
            <Sidebar />
            <main className={styles.mainContent}>
                <Outlet />
            </main>
        </div>
    );
};

export default AdminLayout;