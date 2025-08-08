import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';

import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import adminRoutes from './routes/admin.routes';
import tournamentRoutes from './routes/tournament.routes';
import notificationRoutes from './routes/notification.routes';
import paymentRoutes from './routes/payment.routes';

dotenv.config();

const app: Application = express();

app.use(express.static(path.join(__dirname, '..', 'public')));

app.use(cors());

// Raw body parsing for webhooks (before JSON parsing)
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));

app.use(express.json());

app.get('/', (req: Request, res: Response) => {
    res.send('API is running...');
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/tournaments', tournamentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/payments', paymentRoutes);

export default app;