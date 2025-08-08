import { Request, Response } from 'express';
import { Server } from 'socket.io';
import { Room } from '../socket';
import User from '../models/User.model';
import { IGameLogic } from '../games/game.logic.interface';
import Tournament from '../models/Tournament.model';

import Transaction from '../models/Transaction.model';
import GameRecord from '../models/GameRecord.model';
import { createNotification } from '../services/notification.service';
import { createTournament as createTournamentService } from '../services/tournament.service';
import path from 'path';

let roomsRef: Record<string, Room> = {}; 
let gameLogicsRef: Record<string, IGameLogic> = {};

export const setSocketData = (rooms: Record<string, Room>, gameLogics: Record<string, IGameLogic>) => {
    roomsRef = rooms;
    gameLogicsRef = gameLogics;
};

export const createAdminRoom = (req: Request, res: Response) => {
    const { gameType, bet } = req.body as { gameType: Room['gameType'], bet: number };

    if (!gameType || !bet || !gameLogicsRef[gameType]) {
        return res.status(400).json({ message: 'Incorrect game type or bet.' });
    }

    const gameLogic = gameLogicsRef[gameType];
    const roomId = `admin-${gameType}-${Date.now()}`;

    const newRoom: Room = {
        id: roomId,
        gameType,
        bet,
        players: [],
        gameState: null,
    };

    roomsRef[roomId] = newRoom;

    const io: Server = req.app.get('io');
    const availableRooms = Object.values(roomsRef)
        .filter(room => room.gameType === gameType && room.players.length < 2)
        .map(r => ({ id: r.id, bet: r.bet, host: r.players.length > 0 ? r.players[0] : { user: { username: 'Waiting for the player' } } }));
    
    io.to(`lobby-${gameType}`).emit('roomsList', availableRooms);

    console.log(`[Admin] Room ${roomId} created.`);
    res.status(201).json({ message: 'The room was created successfully', room: newRoom });
};

export const getActiveRooms = (req: Request, res: Response) => {
    const publicRooms = Object.values(roomsRef).map(room => {
        return {
            id: room.id,
            gameType: room.gameType,
            bet: room.bet,
            players: room.players.map(p => p.user.username)
        }
    });
    res.json(publicRooms);
};

export const deleteRoom = (req: Request, res: Response) => {
    const { roomId } = req.params;
    const room = roomsRef[roomId];
    const io: Server = req.app.get('io');
    
    if (room) {
        io.to(roomId).emit('error', { message: 'The room was closed by the administrator.' });
        
        delete roomsRef[roomId];
        
        const availableRooms = Object.values(roomsRef) /* ... */;
        io.to(`lobby-${room.gameType}`).emit('roomsList', availableRooms);
        
        res.json({ message: `Room ${roomId} successfully deleted.` });
    } else {
        res.status(404).json({ message: 'Room not found.' });
    }
};

export const createTournament = async (req: Request, res: Response) => {
    const { name, gameType, entryFee, maxPlayers } = req.body;

    if (!name || !gameType || !maxPlayers) {
        return res.status(400).json({ message: 'Please fill in all required fields.' });
    }

    try {
        const io: Server = req.app.get('io');
        
        // Calculate prize pool (90% of total entry fees)
        const totalEntryFees = Number(entryFee) * Number(maxPlayers);
        const prizePool = Math.floor(totalEntryFees * 0.9);
        const platformCommission = 10; // 10%

        const tournament = await createTournamentService(
            io,
            name,
            gameType,
            Number(maxPlayers),
            Number(entryFee) || 0,
            prizePool,
            platformCommission
        );

        if (!tournament) {
            return res.status(400).json({ message: 'Failed to create tournament. Invalid game type or parameters.' });
        }

        res.status(201).json(tournament);
    } catch (error: any) {
        console.error('[Admin] Error creating tournament:', error);
        res.status(500).json({ message: 'Server Error when creating a tournament', error: error.message });
    }
};

export const updateTournament = async (req: Request, res: Response) => {
    try {
        const tournament = await Tournament.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!tournament) return res.status(404).json({ message: 'No tournament found' });
        res.json(tournament);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

export const deleteTournament = async (req: Request, res: Response) => {
    try {
        const tournament = await Tournament.findByIdAndDelete(req.params.id);
        if (!tournament) return res.status(404).json({ message: 'No tournament found' });
        res.json({ message: 'The tournament has been deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

export const getAllUsers = async (req: Request, res: Response) => {
    try {
        const users = await User.find({}).select('-password');
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

export const getUserById = async (req: Request, res: Response) => {
    try {
        const user = await User.findById(req.params.id).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

export const updateUser = async (req: Request, res: Response) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        user.username = req.body.username || user.username;
        user.email = req.body.email || user.email;
        user.role = req.body.role || user.role;
        user.balance = req.body.balance !== undefined ? req.body.balance : user.balance;

        const updatedUser = await user.save();
        res.json({
            _id: updatedUser._id,
            username: updatedUser.username,
            email: updatedUser.email,
            role: updatedUser.role,
            balance: updatedUser.balance
        });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

export const deleteUser = async (req: Request, res: Response) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        await user.deleteOne();
        res.json({ message: 'User successfully deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

export const getAllTransactions = async (req: Request, res: Response) => {
    try {
        const transactions = await Transaction.find({}).populate('user', 'username').sort({ createdAt: -1 });
        res.json(transactions);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

export const getAllGameRecords = async (req: Request, res: Response) => {
    try {
        const games = await GameRecord.find({}).populate('user', 'username').sort({ createdAt: -1 });
        res.json(games);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

export const getKycSubmissions = async (req: Request, res: Response) => {
    try {
        const { status } = req.query;
        
        const filter: any = {};
        if (status && ['PENDING', 'APPROVED', 'REJECTED'].includes(status as string)) {
            filter.kycStatus = status;
        } else {
            filter.kycStatus = 'PENDING';
        }

        const submissions = await User.find(filter).select('username email kycStatus kycDocuments');
        res.json(submissions);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

export const reviewKycSubmission = async (req: Request, res: Response) => {
    const { userId } = req.params;
    const { action, reason } = req.body;

    try {
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: 'User not found.' });

        const io: Server = req.app.get('io');
        
        if (action === 'APPROVE') {
            user.kycStatus = 'APPROVED';
            await createNotification(io, userId, {
                title: '✅ Verification completed',
                message: 'Your account has been successfully verified!'
            });
        } else if (action === 'REJECT' && reason) {
            user.kycStatus = 'REJECTED';
            user.kycRejectionReason = reason;
             await createNotification(io, userId, {
                title: '❌ Verification rejected',
                message: `Cause: ${reason}`
            });
        } else {
            return res.status(400).json({ message: 'Incorrect action or missing reason for refusal.' });
        }
        
        await user.save();

        if (io) {
            io.emit('kycStatusUpdated', {
                userId: userId,
                kycStatus: user.kycStatus,
                kycRejectionReason: user.kycRejectionReason
            });
        }

        res.json({ message: `User's request ${user.username} has been processed.` });

    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

export const getKycDocument = async (req: Request, res: Response) => {
    const { userId, fileName } = req.params;
    try {
        const user = await User.findById(userId);
        if (!user || !user.kycDocuments.some(doc => doc.filePath.endsWith(fileName))) {
            return res.status(404).json({ message: 'Document not found or access denied.' });
        }
        
        const filePath = path.resolve(process.cwd(), `private/kyc-documents/${fileName}`);
        
        res.sendFile(filePath, (err) => {
            if (err) {
                console.error("File send error:", err);
                res.status(404).json({ message: "The file was not found on the server." });
            }
        });

    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};