import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useSocket } from './SocketContext';
import { getMyNotifications, markNotificationsAsRead, INotification } from '../services/notificationService';
import { useAuth } from './AuthContext';

interface NotificationContextType {
    notifications: INotification[];
    unreadCount: number;
    fetchNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
    const { socket } = useSocket();
    const { isAuthenticated } = useAuth();
    const [notifications, setNotifications] = useState<INotification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);

    const fetchNotifications = useCallback(async () => {
        if (!isAuthenticated) return;
        try {
            const data = await getMyNotifications();
            setNotifications(data);
            setUnreadCount(data.filter(n => !n.isRead).length);
        } catch (error) {
            console.error("Failed to fetch notifications", error);
        }
    }, [isAuthenticated]);

    useEffect(() => {
        fetchNotifications();
    }, [fetchNotifications]);

    useEffect(() => {
        if (!socket) return;
        const handleNewNotification = (notification: INotification) => {
            setNotifications(prev => [notification, ...prev]);
            setUnreadCount(prev => prev + 1);
        };
        socket.on('newNotification', handleNewNotification);
        return () => {
            socket.off('newNotification', handleNewNotification);
        };
    }, [socket]);

    return (
        <NotificationContext.Provider value={{ notifications, unreadCount, fetchNotifications }}>
            {children}
        </NotificationContext.Provider>
    );
};

export const useNotifications = () => {
    const context = useContext(NotificationContext);
    if (!context) throw new Error('useNotifications must be used within a NotificationProvider');
    return context;
};