import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage/LoginPage';
import AdminLayout from './components/layout/AdminLayout';

import DashboardPage from './pages/DashboardPage/DashboardPage';
import UsersPage from './pages/UsersPage/UsersPage';
import TransactionsPage from './pages/TransactionsPage/TransactionsPage';
import GamesPage from './pages/GamesPage/GamesPage';
import RoomsPage from './pages/RoomsPage/RoomsPage';
import CreateRoomPage from './pages/CreateRoomPage/CreateRoomPage';
import TournamentsPage from './pages/TournamentsPage/TournamentsPage';
import KYCPage from './pages/KYCPage/KYCPage';

function App() {
    const { isAuthenticated, loading } = useAuth();

    if (loading) {
        return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>Загрузка...</div>;
    }

    return (
        <Router>
            <Routes>
                {isAuthenticated ? (
                    <Route path="/" element={<AdminLayout />}>
                        <Route index element={<DashboardPage />} />
                        <Route path="users" element={<UsersPage />} />
                        <Route path="games" element={<GamesPage />} />
                        <Route path="transactions" element={<TransactionsPage />} />
                        <Route path="rooms" element={<RoomsPage />} />
                        <Route path="tournaments" element={<TournamentsPage />} />
                        <Route path="kyc" element={<KYCPage />} />
                        <Route path="create-room" element={<CreateRoomPage />} />
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Route>
                ) : (
                    <>
                        <Route path="/login" element={<LoginPage />} />
                        <Route path="*" element={<Navigate to="/login" replace />} />
                    </>
                )}
            </Routes>
        </Router>
    );
}

export default App;