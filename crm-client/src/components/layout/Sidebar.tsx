import React from 'react';
import { NavLink } from 'react-router-dom';
import styles from './AdminLayout.module.css';
import { LayoutDashboard, Users, Gamepad2, List, Home, Trophy, PlusSquare, Settings, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const Sidebar: React.FC = () => {
    const { logout } = useAuth();

    const menuItems = [
        { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
        { path: '/users', icon: Users, label: 'Users' },
        { path: '/games', icon: Gamepad2, label: 'Games' },
        { path: '/transactions', icon: List, label: 'Transactions' },
        { path: '/rooms', icon: Home, label: 'Rooms' },
        { path: '/tournaments', icon: Trophy, label: 'Tournaments' },
        { path: '/kyc', icon: ShieldCheck, label: 'KYC Verification' },
        { path: '/create-room', icon: PlusSquare, label: 'Create Room' },
    ];

    return (
        <aside className={styles.sidebar}>
            <div className={styles.sidebarHeader}>
                Skill Game CRM
            </div>
            <nav className={styles.sidebarNav}>
                {menuItems.map(item => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        end={item.path === '/'}
                        className={({ isActive }) => `${styles.navLink} ${isActive ? styles.active : ''}`}
                    >
                        <item.icon />
                        <span>{item.label}</span>
                    </NavLink>
                ))}
            </nav>
            <div style={{ marginTop: 'auto', padding: '1rem' }}>
                 <button onClick={logout} className={styles.navLink} style={{width: '100%'}}>
                    Выйти
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;