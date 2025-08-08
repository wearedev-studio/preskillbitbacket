import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';


interface User {
  _id: string;
  username: string;
  email: string;
  balance: number;
  avatar: string;
}

const Navbar: React.FC = () => {
  const { isAuthenticated, user, logout, refreshUser } = useAuth();
  const { unreadCount } = useNotifications();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };
  
  const navStyle: React.CSSProperties = {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '1rem 2rem',
      background: '#1a1a1a',
      marginBottom: '2rem'
  }

  const linkStyle: React.CSSProperties = {
    color: 'white',
    textDecoration: 'none'
  }

  console.log(user); 

  return (
    <nav style={navStyle}>
      <div>
        <Link to="/" style={linkStyle}>Home</Link>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        {isAuthenticated && user ? (
          <>
            <Link to="/profile" style={linkStyle}>Profile</Link>
            <span style={{ color: 'lightgreen' }}>Balance: ${user.balance.toFixed(2)}</span>
            <span>({user.username})</span>
            <Link to="/tournaments" style={{...linkStyle, marginLeft: '1rem' }}>Tournaments</Link>
            <Link to="/notifications" style={{ position: 'relative', textDecoration: 'none', color: 'white', fontSize: '1.5rem' }}>
                🔔
                {unreadCount > 0 && (
                    <span style={{
                        position: 'absolute',
                        top: '-5px',
                        right: '-10px',
                        background: 'red',
                        borderRadius: '50%',
                        width: '20px',
                        height: '20px',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        fontSize: '0.8rem',
                        fontWeight: 'bold',
                    }}>
                        {unreadCount}
                    </span>
                )}
            </Link>
            <button onClick={handleLogout}>Logout</button>
            {user?.role === 'ADMIN' && (
              <Link to="/admin" style={{...linkStyle, marginLeft: '1rem' }}>Admin Panel</Link>
            )}
          </>
        ) : (
          <>
            <Link to="/login" style={linkStyle}>Login</Link>
            <Link to="/register" style={linkStyle}>Register</Link>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar;