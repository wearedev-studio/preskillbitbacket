import { Request, Response, NextFunction } from 'express';
import { protect } from './auth.middleware';

export const admin = (req: Request, res: Response, next: NextFunction) => {
    if (req.user && req.user.role === 'ADMIN') {
        next();
    } else {
        res.status(403).json({ message: 'Access denied. Administrator rights required.' });
    }
};

export const adminProtect = [protect, admin];