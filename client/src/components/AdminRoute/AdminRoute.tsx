import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const AdminRoute: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Загрузка...</div>;
  }

  return user && user.role === 'ADMIN' ? <Outlet /> : <Navigate to="/" replace />;
};

export default AdminRoute;