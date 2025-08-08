import { Server } from 'socket.io';
import Tournament, { ITournament, ITournamentPlayer, ITournamentMatch } from '../models/Tournament.model';
import User from '../models/User.model';
import Transaction from '../models/Transaction.model';
import { createNotification } from './notification.service';
import { createTournamentRoom } from './tournamentRoom.service';
import { Types } from 'mongoose';

export const activeTournaments: Record<string, ITournament> = {};

const tournamentTimers: Record<string, NodeJS.Timeout> = {};

const BOT_NAMES = [
    'AlphaBot', 'BetaBot', 'GammaBot', 'DeltaBot', 'EpsilonBot',
    'ZetaBot', 'EtaBot', 'ThetaBot', 'IotaBot', 'KappaBot',
    'LambdaBot', 'MuBot', 'NuBot', 'XiBot', 'OmicronBot',
    'PiBot', 'RhoBot', 'SigmaBot', 'TauBot', 'UpsilonBot'
];

export async function createTournament(
    io: Server,
    name: string,
    gameType: string,
    maxPlayers: number,
    entryFee: number,
    prizePool: number,
    platformCommission: number = 10
): Promise<ITournament | null> {
    try {
        console.log(`[Tournament] Creating tournament: ${name}, ${gameType}, ${maxPlayers} players`);

        if (![4, 8, 16, 32].includes(maxPlayers)) {
            throw new Error('Количество игроков должно быть 4, 8, 16 или 32');
        }

        if (!['checkers', 'chess', 'backgammon', 'tic-tac-toe', 'durak'].includes(gameType)) {
            throw new Error('Неподдерживаемый тип игры');
        }

        const tournament = new Tournament({
            name,
            gameType,
            maxPlayers,
            entryFee,
            prizePool,
            platformCommission,
            status: 'WAITING',
            players: [],
            bracket: [],
            createdAt: new Date(),
            firstRegistrationTime: null
        });

        await tournament.save();

        activeTournaments[tournament._id.toString()] = tournament;

        io.emit('tournamentCreated', tournament);

        console.log(`[Tournament] Created tournament ${tournament._id}`);
        return tournament;
    } catch (error) {
        console.error(`[Tournament] Error creating tournament:`, error);
        return null;
    }
}

export async function registerPlayerInTournament(
    io: Server,
    tournamentId: string,
    userId: string,
    socketId: string
): Promise<{ success: boolean; message: string }> {
    try {
        console.log(`[Tournament] Registering player ${userId} in tournament ${tournamentId}`);

        const tournament = activeTournaments[tournamentId] || await Tournament.findById(tournamentId);
        if (!tournament) {
            return { success: false, message: 'Турнир не найден' };
        }

        if (tournament.status !== 'WAITING') {
            return { success: false, message: 'Турнир уже начался или завершен' };
        }

        if (tournament.players.some(p => p._id === userId)) {
            return { success: false, message: 'Вы уже зарегистрированы в этом турнире' };
        }

        if (tournament.players.length >= tournament.maxPlayers) {
            return { success: false, message: 'Турнир заполнен' };
        }

        const user = await User.findById(userId);
        if (!user) {
            return { success: false, message: 'Пользователь не найден' };
        }

        if (user.balance < tournament.entryFee) {
            return { success: false, message: 'Недостаточно средств для участия' };
        }

        user.balance -= tournament.entryFee;
        await user.save();

        await new Transaction({
            user: userId,
            type: 'TOURNAMENT_FEE',
            amount: -tournament.entryFee
        }).save();

        const player: ITournamentPlayer = {
            _id: userId,
            username: user.username,
            socketId,
            isBot: false,
            registeredAt: new Date()
        };

        tournament.players.push(player);

        if (!tournament.firstRegistrationTime) {
            tournament.firstRegistrationTime = new Date();
            
            const timer = setTimeout(() => {
                startTournamentWithBots(io, tournamentId);
            }, 15000);
            
            tournamentTimers[tournamentId] = timer;
            console.log(`[Tournament] Started 15-second timer for tournament ${tournamentId}`);
        }

        await tournament.save();
        activeTournaments[tournamentId] = tournament;

        io.emit('tournamentUpdated', tournament);

        await createNotification(io, userId, {
            title: `🎯 Регистрация в турнире "${tournament.name}"`,
            message: `Вы успешно зарегистрированы! Игроков: ${tournament.players.length}/${tournament.maxPlayers}`,
            link: `/tournament/${tournamentId}`
        });

        console.log(`[Tournament] Player ${user.username} registered in tournament ${tournamentId}`);

        if (tournament.players.length === tournament.maxPlayers) {
            if (tournamentTimers[tournamentId]) {
                clearTimeout(tournamentTimers[tournamentId]);
                delete tournamentTimers[tournamentId];
            }
            await startTournament(io, tournamentId);
        }

        return { success: true, message: 'Успешно зарегистрированы в турнире' };
    } catch (error) {
        console.error(`[Tournament] Error registering player:`, error);
        return { success: false, message: 'Ошибка регистрации в турнире' };
    }
}

async function startTournamentWithBots(io: Server, tournamentId: string): Promise<void> {
    try {
        console.log(`[Tournament] Starting tournament ${tournamentId} with bots`);

        const tournament = activeTournaments[tournamentId] || await Tournament.findById(tournamentId);
        if (!tournament || tournament.status !== 'WAITING') {
            console.log(`[Tournament] Tournament ${tournamentId} not found or not waiting`);
            return;
        }

        if (tournamentTimers[tournamentId]) {
            clearTimeout(tournamentTimers[tournamentId]);
            delete tournamentTimers[tournamentId];
        }

        const botsNeeded = tournament.maxPlayers - tournament.players.length;
        if (botsNeeded > 0) {
            const usedBotNames = new Set();
            
            for (let i = 0; i < botsNeeded; i++) {
                let botName;
                do {
                    botName = BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)];
                } while (usedBotNames.has(botName));
                
                usedBotNames.add(botName);

                const botPlayer: ITournamentPlayer = {
                    _id: new Types.ObjectId().toString(),
                    username: botName,
                    socketId: 'bot',
                    isBot: true,
                    registeredAt: new Date()
                };

                tournament.players.push(botPlayer);
            }

            console.log(`[Tournament] Added ${botsNeeded} bots to tournament ${tournamentId}`);
        }

        await startTournament(io, tournamentId);
    } catch (error) {
        console.error(`[Tournament] Error starting tournament with bots:`, error);
    }
}

async function startTournament(io: Server, tournamentId: string): Promise<void> {
    try {
        console.log(`[Tournament] Starting tournament ${tournamentId}`);

        const tournament = activeTournaments[tournamentId] || await Tournament.findById(tournamentId);
        if (!tournament || tournament.status !== 'WAITING') {
            console.log(`[Tournament] Tournament ${tournamentId} not found or not waiting`);
            return;
        }

        const shuffledPlayers = [...tournament.players].sort(() => Math.random() - 0.5);

        const bracket = createTournamentBracket(shuffledPlayers);
        tournament.bracket = bracket;
        tournament.status = 'ACTIVE';
        tournament.startedAt = new Date();

        await tournament.save();
        activeTournaments[tournamentId] = tournament;

        io.emit('tournamentStarted', tournament);

        for (const player of tournament.players) {
            if (!player.isBot) {
                await createNotification(io, player._id, {
                    title: `🚀 Турнир "${tournament.name}" начался!`,
                    message: `Игра: ${tournament.gameType}. Удачи в первом раунде!`,
                    link: `/tournament/${tournamentId}`
                });
            }
        }

        console.log(`[Tournament] Tournament ${tournamentId} started with ${tournament.players.length} players`);

        await createFirstRoundMatches(io, tournament);
    } catch (error) {
        console.error(`[Tournament] Error starting tournament:`, error);
    }
}

function createTournamentBracket(players: ITournamentPlayer[]): any[] {
    const bracket = [];
    const totalPlayers = players.length;
    let currentRoundPlayers = [...players];
    let roundNumber = 1;

    while (currentRoundPlayers.length > 1) {
        const matches = [];
        const nextRoundPlayers: ITournamentPlayer[] = [];

        for (let i = 0; i < currentRoundPlayers.length; i += 2) {
            const player1 = currentRoundPlayers[i];
            const player2 = currentRoundPlayers[i + 1];

            const match: ITournamentMatch = {
                matchId: new Types.ObjectId(),
                player1,
                player2,
                winner: undefined,
                status: roundNumber === 1 ? 'PENDING' : 'WAITING'
            };

            matches.push(match);
            nextRoundPlayers.push({
                _id: 'temp',
                username: 'TBD',
                socketId: 'temp',
                isBot: false,
                registeredAt: new Date()
            });
        }

        bracket.push({
            round: roundNumber,
            matches
        });

        currentRoundPlayers = nextRoundPlayers;
        roundNumber++;
    }

    return bracket;
}

async function createFirstRoundMatches(io: Server, tournament: ITournament): Promise<void> {
    try {
        console.log(`[Tournament] Creating first round matches for tournament ${tournament._id}`);

        const firstRound = tournament.bracket[0];
        if (!firstRound) {
            console.error(`[Tournament] No first round found for tournament ${tournament._id}`);
            return;
        }

        for (const match of firstRound.matches) {
            const players = [
                {
                    _id: match.player1._id,
                    username: match.player1.username,
                    socketId: match.player1.socketId,
                    isBot: match.player1.isBot
                },
                {
                    _id: match.player2._id,
                    username: match.player2.username,
                    socketId: match.player2.socketId,
                    isBot: match.player2.isBot
                }
            ];

            const room = await createTournamentRoom(
                io,
                tournament._id.toString(),
                match.matchId.toString(),
                tournament.gameType,
                players
            );

            if (room) {
                match.status = 'ACTIVE';
                console.log(`[Tournament] Created room for match ${match.matchId}`);

                if (match.player1.isBot && match.player2.isBot) {
                    setTimeout(() => {
                        simulateBotVsBotMatch(io, room, tournament);
                    }, 2000 + Math.random() * 3000);
                }
            }
        }

        await tournament.save();
        activeTournaments[tournament._id.toString()] = tournament;

        io.emit('tournamentUpdated', tournament);

        console.log(`[Tournament] Created ${firstRound.matches.length} matches for first round`);
    } catch (error) {
        console.error(`[Tournament] Error creating first round matches:`, error);
    }
}

async function simulateBotVsBotMatch(io: Server, room: any, tournament: ITournament): Promise<void> {
    try {
        console.log(`[Tournament] Simulating bot vs bot match ${room.matchId}`);

        const winner = room.players[Math.floor(Math.random() * room.players.length)];

        const gameTime = 30000 + Math.random() * 90000;

        setTimeout(async () => {
            room.status = 'FINISHED';
            room.winner = winner;

            io.to(`tournament-${room.matchId}`).emit('tournamentGameEnd', {
                matchId: room.matchId,
                winner,
                isDraw: false
            });

            await advanceTournamentWinner(io, tournament._id.toString(), room.matchId, winner);

            console.log(`[Tournament] Bot match ${room.matchId} finished, winner: ${winner.username}`);
        }, gameTime);
    } catch (error) {
        console.error(`[Tournament] Error simulating bot match:`, error);
    }
}

export async function advanceTournamentWinner(
    io: Server,
    tournamentId: string,
    matchId: string,
    winner: any
): Promise<void> {
    try {
        console.log(`[Tournament] Advancing winner ${winner.username} in tournament ${tournamentId}`);

        const tournament = activeTournaments[tournamentId] || await Tournament.findById(tournamentId);
        if (!tournament || tournament.status !== 'ACTIVE') {
            console.log(`[Tournament] Tournament ${tournamentId} not found or not active`);
            return;
        }

        let currentRoundIndex = -1;
        let matchIndex = -1;

        for (let i = 0; i < tournament.bracket.length; i++) {
            const round = tournament.bracket[i];
            const foundMatchIndex = round.matches.findIndex(m => m.matchId.toString() === matchId);
            if (foundMatchIndex !== -1) {
                currentRoundIndex = i;
                matchIndex = foundMatchIndex;
                break;
            }
        }

        if (currentRoundIndex === -1 || matchIndex === -1) {
            console.log(`[Tournament] Match ${matchId} not found in tournament bracket`);
            return;
        }

        const match = tournament.bracket[currentRoundIndex].matches[matchIndex];
        match.winner = winner;
        match.status = 'FINISHED';

        const currentRound = tournament.bracket[currentRoundIndex];
        const allMatchesFinished = currentRound.matches.every(m => m.status === 'FINISHED');

        await tournament.save();
        activeTournaments[tournamentId] = tournament;

        io.emit('tournamentUpdated', tournament);

        console.log(`[Tournament] Winner ${winner.username} advanced in tournament ${tournamentId}`);

        if (allMatchesFinished) {
            console.log(`[Tournament] Round ${currentRound.round} finished, checking next round`);
            
            const { checkAndCreateNextRound } = await import('./tournamentRoom.service');
            setTimeout(async () => {
                try {
                    const updatedTournament = await Tournament.findById(tournamentId);
                    if (updatedTournament) {
                        await checkAndCreateNextRound(io, updatedTournament);
                    }
                } catch (error) {
                    console.error(`[Tournament] Error checking next round:`, error);
                }
            }, 500);
        }
    } catch (error) {
        console.error(`[Tournament] Error advancing winner:`, error);
    }
}

export async function getActiveTournaments(): Promise<ITournament[]> {
    try {
        const tournaments = await Tournament.find({
            status: { $in: ['WAITING', 'ACTIVE'] }
        }).sort({ createdAt: -1 });

        return tournaments;
    } catch (error) {
        console.error(`[Tournament] Error getting active tournaments:`, error);
        return [];
    }
}

export async function getAllTournaments(): Promise<ITournament[]> {
    try {
        const tournaments = await Tournament.find({})
            .sort({ createdAt: -1 });

        return tournaments;
    } catch (error) {
        console.error(`[Tournament] Error getting all tournaments:`, error);
        return [];
    }
}

export async function getTournamentById(tournamentId: string): Promise<ITournament | null> {
    try {
        const tournament = activeTournaments[tournamentId] || await Tournament.findById(tournamentId);
        return tournament;
    } catch (error) {
        console.error(`[Tournament] Error getting tournament:`, error);
        return null;
    }
}

export function cleanupFinishedTournaments(): void {
    Object.keys(activeTournaments).forEach(tournamentId => {
        const tournament = activeTournaments[tournamentId];
        if (tournament.status === 'FINISHED') {
            delete activeTournaments[tournamentId];
            console.log(`[Tournament] Cleaned up finished tournament ${tournamentId}`);
        }
    });
}

export async function handleTournamentPlayerLeft(
    io: Server,
    matchId: string,
    playerId: string,
    timestamp: number
): Promise<void> {
    try {
        console.log(`[Tournament] Player ${playerId} left match ${matchId} at ${timestamp}`);
        
        io.to(`tournament-${matchId}`).emit('tournamentPlayerLeft', {
            matchId,
            playerId,
            timestamp,
            message: 'Игрок покинул матч. У него есть 30 секунд на возврат.'
        });
        
        setTimeout(() => {
            checkPlayerReturnStatus(io, matchId, playerId, timestamp);
        }, 30000);
        
    } catch (error) {
        console.error(`[Tournament] Error handling player left:`, error);
    }
}

export async function handleTournamentPlayerReturned(
    io: Server,
    matchId: string,
    playerId: string
): Promise<void> {
    try {
        console.log(`[Tournament] Player ${playerId} returned to match ${matchId}`);
        
        io.to(`tournament-${matchId}`).emit('tournamentPlayerReturned', {
            matchId,
            playerId,
            message: 'Игрок вернулся в матч!'
        });
        
    } catch (error) {
        console.error(`[Tournament] Error handling player returned:`, error);
    }
}

export async function handleTournamentPlayerForfeited(
    io: Server,
    matchId: string,
    playerId: string,
    reason: string = 'left_game'
): Promise<void> {
    try {
        console.log(`[Tournament] Player ${playerId} forfeited match ${matchId}, reason: ${reason}`);
        
        let tournament: ITournament | null = null;
        let currentRoundIndex = -1;
        let matchIndex = -1;
        
        for (const tournamentId of Object.keys(activeTournaments)) {
            const t = activeTournaments[tournamentId];
            for (let i = 0; i < t.bracket.length; i++) {
                const round = t.bracket[i];
                const foundMatchIndex = round.matches.findIndex(m => m.matchId.toString() === matchId);
                if (foundMatchIndex !== -1) {
                    tournament = t;
                    currentRoundIndex = i;
                    matchIndex = foundMatchIndex;
                    break;
                }
            }
            if (tournament) break;
        }
        
        if (!tournament || currentRoundIndex === -1 || matchIndex === -1) {
            console.log(`[Tournament] Tournament or match not found for forfeit`);
            return;
        }
        
        const match = tournament.bracket[currentRoundIndex].matches[matchIndex];
        
        let winner;
        if (match.player1._id === playerId) {
            winner = match.player2;
        } else if (match.player2._id === playerId) {
            winner = match.player1;
        } else {
            console.log(`[Tournament] Player ${playerId} not found in match ${matchId}`);
            return;
        }
        
        match.winner = winner;
        match.status = 'FINISHED';
        
        const { tournamentRooms } = await import('./tournamentRoom.service');
        if (tournamentRooms[matchId]) {
            tournamentRooms[matchId].status = 'FINISHED';
            tournamentRooms[matchId].winner = winner;
        }
        
        await tournament.save();
        
        io.to(`tournament-${matchId}`).emit('tournamentGameEnd', {
            matchId,
            winner,
            isDraw: false,
            reason: 'forfeit',
            message: `Игрок покинул матч. Победа присуждена ${winner.username}!`
        });
        
        await advanceTournamentWinner(io, tournament._id.toString(), matchId, winner);
        
        const { checkAndCreateNextRound } = await import('./tournamentRoom.service');
        setTimeout(async () => {
            const updatedTournament = await Tournament.findById(tournament._id);
            if (updatedTournament) {
                await checkAndCreateNextRound(io, updatedTournament);
            }
        }, 1000);
        
    } catch (error) {
        console.error(`[Tournament] Error handling player forfeit:`, error);
    }
}

async function checkPlayerReturnStatus(
    io: Server,
    matchId: string,
    playerId: string,
    leftTimestamp: number
): Promise<void> {
    try {
        console.log(`[Tournament] Checking return status for player ${playerId} in match ${matchId}`);
    } catch (error) {
        console.error(`[Tournament] Error checking player return status:`, error);
    }
}

setInterval(cleanupFinishedTournaments, 30 * 60 * 1000);