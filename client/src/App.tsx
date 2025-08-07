import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { Toaster } from 'react-hot-toast';
import { NotificationHandler } from './components/NotificationHandler/NotificationHandler';
import TournamentExitManager from './components/tournament/TournamentExitManager';

import MainLayout from './components/layout/MainLayout';

import RegisterPage from './pages/RegisterPage/RegisterPage';
import LoginPage from './pages/LoginPage/LoginPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage/ResetPasswordPage';

function App() {
  const { isAuthenticated, loading, refreshUser } = useAuth();

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  if (loading) {
    return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">Loading...</div>;
  }

  return (
    <Router>
        <TournamentExitManager>
            <Toaster position="bottom-right" />
            {isAuthenticated && <NotificationHandler />}
            
            <Routes>
                {isAuthenticated ? (
                     <Route path="/*" element={<MainLayout />} />
                ) : (
                    <>
                        <Route path="/login" element={<LoginPage />} />
                        <Route path="/register" element={<RegisterPage />} />
                        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                        <Route path="/reset-password" element={<ResetPasswordPage />} />
                        <Route path="*" element={<Navigate to="/login" replace />} />
                    </>
                )}
            </Routes>
        </TournamentExitManager>
    </Router>
  );
}

export default App;