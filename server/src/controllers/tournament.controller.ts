import { Request, Response } from 'express';
import { Server } from 'socket.io';
import Tournament from '../models/Tournament.model';
import User from '../models/User.model';
import { 
    createTournament,
    registerPlayerInTournament,
    getActiveTournaments,
    getAllTournaments,
    getTournamentById
} from '../services/tournament.service';

export const getActiveTournamentsController = async (req: Request, res: Response) => {
    try {
        const tournaments = await getActiveTournaments();
        res.json(tournaments);
    } catch (error) {
        console.error('Error fetching tournaments:', error);
        res.status(500).json({ message: 'Ошибка при получении списка турниров' });
    }
};

export const getAllTournamentsController = async (req: Request, res: Response) => {
    try {
        const tournaments = await getAllTournaments();
        res.json(tournaments);
    } catch (error) {
        console.error('Error fetching all tournaments:', error);
        res.status(500).json({ message: 'Ошибка при получении списка всех турниров' });
    }
};

export const getTournament = async (req: Request, res: Response) => {
    try {
        const { tournamentId } = req.params;
        const tournament = await getTournamentById(tournamentId);
        
        if (!tournament) {
            return res.status(404).json({ message: 'Турнир не найден' });
        }
        
        res.json(tournament);
    } catch (error) {
        console.error('Error fetching tournament:', error);
        res.status(500).json({ message: 'Ошибка при получении турнира' });
    }
};

export const createNewTournament = async (req: Request, res: Response) => {
    try {
        const { name, gameType, maxPlayers, entryFee, platformCommission } = req.body;
        
        if (!name || !gameType || !maxPlayers || entryFee === undefined) {
            return res.status(400).json({ 
                message: 'Необходимо указать название, тип игры, количество игроков и взнос' 
            });
        }

        if (![4, 8, 16, 32].includes(maxPlayers)) {
            return res.status(400).json({ 
                message: 'Количество игроков должно быть 4, 8, 16 или 32' 
            });
        }

        if (!['checkers', 'chess', 'backgammon', 'tic-tac-toe'].includes(gameType)) {
            return res.status(400).json({ 
                message: 'Неподдерживаемый тип игры' 
            });
        }

        const io: Server = req.app.get('io');
        const prizePool = entryFee * maxPlayers;
        
        const tournament = await createTournament(
            io,
            name,
            gameType,
            maxPlayers,
            entryFee,
            prizePool,
            platformCommission || 10
        );

        if (!tournament) {
            return res.status(500).json({ message: 'Ошибка при создании турнира' });
        }

        res.status(201).json({
            message: 'Турнир успешно создан',
            tournament
        });
    } catch (error) {
        console.error('Error creating tournament:', error);
        res.status(500).json({ message: 'Ошибка при создании турнира' });
    }
};

export const registerInTournament = async (req: Request, res: Response) => {
    try {
        const { tournamentId } = req.params;
        const userId = req.user?._id?.toString();

        if (!userId) {
            return res.status(401).json({ message: 'Необходима авторизация' });
        }

        const socketId = req.headers['x-socket-id'] as string || 'offline';

        const io: Server = req.app.get('io');
        
        const result = await registerPlayerInTournament(io, tournamentId, userId, socketId);

        if (!result.success) {
            return res.status(400).json({ message: result.message });
        }

        res.json({ message: result.message });
    } catch (error) {
        console.error('Error registering in tournament:', error);
        res.status(500).json({ message: 'Ошибка при регистрации в турнире' });
    }
};

export const unregisterFromTournament = async (req: Request, res: Response) => {
    try {
        const { tournamentId } = req.params;
        const userId = req.user?._id?.toString();

        if (!userId) {
            return res.status(401).json({ message: 'Необходима авторизация' });
        }

        const tournament = await Tournament.findById(tournamentId);
        if (!tournament) {
            return res.status(404).json({ message: 'Турнир не найден' });
        }

        if (tournament.status !== 'WAITING') {
            return res.status(400).json({ message: 'Нельзя отменить регистрацию после начала турнира' });
        }

        const playerIndex = tournament.players.findIndex(p => p._id === userId);
        if (playerIndex === -1) {
            return res.status(400).json({ message: 'Вы не зарегистрированы в этом турнире' });
        }

        const user = await User.findById(userId);
        if (user) {
            user.balance += tournament.entryFee;
            await user.save();
        }

        tournament.players.splice(playerIndex, 1);
        
        if (tournament.players.length === 0) {
            tournament.firstRegistrationTime = undefined;
        }

        await tournament.save();

        const io: Server = req.app.get('io');
        io.emit('tournamentUpdated', tournament);

        res.json({ message: 'Регистрация отменена, взнос возвращен' });
    } catch (error) {
        console.error('Error unregistering from tournament:', error);
        res.status(500).json({ message: 'Ошибка при отмене регистрации' });
    }
};

export const getPlayerTournaments = async (req: Request, res: Response) => {
    try {
        const userId = req.user?._id?.toString();

        if (!userId) {
            return res.status(401).json({ message: 'Необходима авторизация' });
        }

        const tournaments = await Tournament.find({
            'players._id': userId
        }).sort({ createdAt: -1 });

        res.json(tournaments);
    } catch (error) {
        console.error('Error fetching player tournaments:', error);
        res.status(500).json({ message: 'Ошибка при получении турниров игрока' });
    }
};

export const getTournamentHistory = async (req: Request, res: Response) => {
    try {
        const { page = 1, limit = 10, gameType } = req.query;
        
        const query: any = { status: 'FINISHED' };
        if (gameType && gameType !== 'all') {
            query.gameType = gameType;
        }

        const tournaments = await Tournament.find(query)
            .sort({ finishedAt: -1 })
            .limit(Number(limit))
            .skip((Number(page) - 1) * Number(limit));

        const total = await Tournament.countDocuments(query);

        res.json({
            tournaments,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                pages: Math.ceil(total / Number(limit))
            }
        });
    } catch (error) {
        console.error('Error fetching tournament history:', error);
        res.status(500).json({ message: 'Ошибка при получении истории турниров' });
    }
};

export const getTournamentStats = async (req: Request, res: Response) => {
    try {
        const stats = await Tournament.aggregate([
            {
                $group: {
                    _id: '$gameType',
                    total: { $sum: 1 },
                    active: {
                        $sum: {
                            $cond: [{ $in: ['$status', ['WAITING', 'ACTIVE']] }, 1, 0]
                        }
                    },
                    finished: {
                        $sum: {
                            $cond: [{ $eq: ['$status', 'FINISHED'] }, 1, 0]
                        }
                    },
                    totalPrizePool: { $sum: '$prizePool' }
                }
            }
        ]);

        const totalStats = await Tournament.aggregate([
            {
                $group: {
                    _id: null,
                    totalTournaments: { $sum: 1 },
                    totalPrizePool: { $sum: '$prizePool' },
                    activeTournaments: {
                        $sum: {
                            $cond: [{ $in: ['$status', ['WAITING', 'ACTIVE']] }, 1, 0]
                        }
                    }
                }
            }
        ]);

        res.json({
            byGameType: stats,
            overall: totalStats[0] || {
                totalTournaments: 0,
                totalPrizePool: 0,
                activeTournaments: 0
            }
        });
    } catch (error) {
        console.error('Error fetching tournament stats:', error);
        res.status(500).json({ message: 'Ошибка при получении статистики турниров' });
    }
};