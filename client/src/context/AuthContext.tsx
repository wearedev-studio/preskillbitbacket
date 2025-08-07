import React, { createContext, useReducer, useContext, ReactNode, useCallback } from 'react';
import axios from 'axios';
import { API_URL } from '../api/index';

// Типы
interface User {
  _id: string;
  username: string;
  email: string;
  balance: number;
  avatar: string;
  role: string;
  kycRejectionReason: ReactNode;
  kycStatus: any;
}

interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
}

interface AuthContextType extends AuthState {
  login: (data: { token: string; user: User }) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

type AuthAction =
  | { type: 'LOGIN_SUCCESS'; payload: { token: string; user: User } }
  | { type: 'USER_UPDATED'; payload: { user: User } }
  | { type: 'LOGOUT' }
  | { type: 'SET_LOADING'; payload: boolean };

const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'LOGIN_SUCCESS':
      localStorage.setItem('token', action.payload.token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${action.payload.token}`;
      return {
        ...state,
        isAuthenticated: true,
        loading: false,
        token: action.payload.token,
        user: action.payload.user,
      };
    case 'USER_UPDATED':
        return {
            ...state,
            isAuthenticated: true,
            loading: false,
            user: action.payload.user,
        };
    case 'LOGOUT':
      localStorage.removeItem('token');
      delete axios.defaults.headers.common['Authorization'];
      return { token: null, user: null, isAuthenticated: false, loading: false };
    case 'SET_LOADING':
        return { ...state, loading: action.payload };
    default:
      return state;
  }
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(authReducer, {
    user: null,
    token: localStorage.getItem('token'),
    isAuthenticated: false,
    loading: true,
  });

  const refreshUser = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (token) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        try {
            console.log('Requesting fresh profile data...');
            const { data } = await axios.get(`${API_URL}/api/users/profile`);
            dispatch({ type: 'USER_UPDATED', payload: { user: data } });
            console.log('Profile data updated successfully!', data);
        } catch (err) {
            console.error("Error updating profile, log out.", err);
            dispatch({ type: 'LOGOUT' });
        }
    } else {
        dispatch({ type: 'LOGOUT' });
    }
  }, []);

  const login = useCallback((data: { token: string; user: User }) => {
    dispatch({ type: 'LOGIN_SUCCESS', payload: data });
  }, []);

  const logout = useCallback(() => {
    dispatch({ type: 'LOGOUT' });
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};