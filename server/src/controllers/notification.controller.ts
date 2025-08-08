import { Request, Response } from 'express';
import Notification from '../models/Notification.model';

export const getMyNotifications = async (req: Request, res: Response) => {
    try {
        const notifications = await Notification.find({ user: req.user!._id }).sort({ createdAt: -1 });
        res.json(notifications);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

export const markNotificationsAsRead = async (req: Request, res: Response) => {
    try {
        await Notification.updateMany({ user: req.user!._id, isRead: false }, { isRead: true });
        res.json({ message: 'Notifications marked as read' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};