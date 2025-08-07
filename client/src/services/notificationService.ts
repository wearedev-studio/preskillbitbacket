import axios from 'axios';
import { API_URL } from '../api/index';

export interface INotification {
    _id: string;
    user: string;
    title: string;
    message: string;
    link?: string;
    isRead: boolean;
    createdAt: string;
}

export const getMyNotifications = async (): Promise<INotification[]> => {
    const { data } = await axios.get(`${API_URL}/api/notifications`);
    return data;
};

export const markNotificationsAsRead = async (): Promise<{ message: string }> => {
    const { data } = await axios.post(`${API_URL}/api/notifications/read`);
    return data;
};