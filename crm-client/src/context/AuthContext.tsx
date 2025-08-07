import React, { createContext, useContext, useState, useEffect, type ReactNode, useCallback } from 'react';
import axios from 'axios';
import { API_URL } from '../api/index';


interface User {
    _id: string;
    username: string;
    email: string;
    role: 'USER' | 'ADMIN';
    balance: number;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    loading: boolean;
    login: (token: string, user: User) => Promise<void>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(() => localStorage.getItem('crm_token'));
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadUser = async () => {
            if (token) {
                axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
                try {
                    const { data } = await axios.get(`${API_URL}/api/users/profile`);
                    if (data.role === 'ADMIN') {
                        setUser(data);
                    } else {
                        logout();
                    }
                } catch (error) {
                    logout();
                }
            }
            setLoading(false);
        };
        loadUser();
    }, [token]);

    const login = async (newToken: string, userData: User) => {
        if (userData.role !== 'ADMIN') {
            throw new Error('Доступ разрешен только администраторам.');
        }
        localStorage.setItem('crm_token', newToken);
        axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
        setToken(newToken);
        setUser(userData);
    };

    const logout = () => {
        localStorage.removeItem('crm_token');
        delete axios.defaults.headers.common['Authorization'];
        setToken(null);
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, token, isAuthenticated: !!token, loading, login, logout }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within an AuthProvider');
    return context;
};