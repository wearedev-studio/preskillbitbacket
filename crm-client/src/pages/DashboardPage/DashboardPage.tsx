import React, { useState, useEffect } from 'react';
import styles from './DashboardPage.module.css';
import { Users, UserCheck, Gamepad2, Landmark } from 'lucide-react';
import { Line, Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';
import { getAdminUsers, getAdminGameRecords } from '../../services/adminService';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, ArcElement);

const DashboardPage: React.FC = () => {
    const [totalUsers, setTotalUsers] = useState(0);
    const [totalGames, setTotalGames] = useState(0);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const users = await getAdminUsers();
                const games = await getAdminGameRecords();
                setTotalUsers(users.length);
                setTotalGames(games.length);
            } catch (error) {
                console.error("Failed to fetch dashboard data", error);
            }
        };
        fetchData();
    }, []);
    
    const lineChartData = {
        labels: ['2024-01-11', '2024-01-12', '2024-01-13', '2024-01-14', '2024-01-15'],
        datasets: [{ label: 'Daily Active Users', data: [240, 290, 250, 310, 320], fill: false, borderColor: '#2563eb', tension: 0.1 }]
    };
    const doughnutChartData = {
        labels: ['Шахматы', 'Шашки', 'Нарды', 'Крестики-нолики'],
        datasets: [{ label: 'Game Distribution', data: [45, 30, 15, 10], backgroundColor: ['#2563eb', '#16a34a', '#f97316', '#ef4444'] }]
    };

    return (
        <div>
            <div className={styles.header}>
                <h1>Dashboard</h1>
                <p className={styles.lastUpdated}>Last updated: {new Date().toLocaleString()}</p>
            </div>

            <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                    <div className={styles.statInfo}><p>Total Users</p><p>{totalUsers}</p><p>+12% vs last month</p></div>
                    <div className={styles.statIcon} style={{backgroundColor: '#2563eb'}}><Users /></div>
                </div>
                <div className={styles.statCard}>
                    <div className={styles.statInfo}><p>Active Users</p><p>892</p><p>+8% vs last month</p></div>
                    <div className={styles.statIcon} style={{backgroundColor: '#16a34a'}}><UserCheck /></div>
                </div>
                <div className={styles.statCard}>
                    <div className={styles.statInfo}><p>Total Games</p><p>{totalGames}</p><p>+15% vs last month</p></div>
                    <div className={styles.statIcon} style={{backgroundColor: '#9333ea'}}><Gamepad2 /></div>
                </div>
                <div className={styles.statCard}>
                    <div className={styles.statInfo}><p>Total Revenue</p><p>$124,500</p><p>+23% vs last month</p></div>
                    <div className={styles.statIcon} style={{backgroundColor: '#f97316'}}><Landmark /></div>
                </div>
            </div>

            <div className={styles.chartsGrid}>
                <div className={styles.chartCard}>
                    <h2>Daily Active Users</h2>
                    <Line data={lineChartData} />
                </div>
                <div className={styles.chartCard}>
                    <h2>Game Distribution</h2>
                    <Doughnut data={doughnutChartData} />
                </div>
            </div>
        </div>
    );
};

export default DashboardPage;