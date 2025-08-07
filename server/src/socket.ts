import { Server, Socket } from 'socket.io';
import jwt, { JwtPayload } from 'jsonwebtoken';
import User, { IUser } from './models/User.model';
import GameRecord from './models/GameRecord.model';
import Transaction from './models/Transaction.model';
import { IGameLogic, GameState, GameMove } from './games/game.logic.interface';
import { ticTacToeLogic } from './games/tic-tac-toe.logic';
import { checkersLogic } from './games/checkers.logic';
import { chessLogic } from './games/chess.logic';
import { backgammonLogic, rollDiceForBackgammon } from './games/backgammon.logic';
import {
    advanceTournamentWinner,
    handleTournamentPlayerLeft,
    handleTournamentPlayerReturned,
    handleTournamentPlayerForfeited
} from './services/tournament.service';
import {
    joinTournamentRoom,
    processTournamentMove,
    tournamentPlayerSockets
} from './services/tournamentRoom.service';

interface Player {
    socketId: string;
    user: Pick<IUser, '_id' | 'username' | 'avatar' | 'balance'>;
}

export interface Room {
    id: string;
    gameType: 'tic-tac-toe' | 'checkers' | 'chess' | 'backgammon';
    bet: number;
    players: Player[];
    gameState: GameState;
    botJoinTimer?: NodeJS.Timeout;
    disconnectTimer?: NodeJS.Timeout;
}

export const rooms: Record<string, Room> = {};
export const userSocketMap: Record<string, string> = {};

let globalIO: Server | null = null;

export const getIO = (): Server | null => globalIO;
export const setIO = (io: Server): void => {
    globalIO = io;
};

export const gameLogics: Record<Room['gameType'], IGameLogic> = {
    'tic-tac-toe': ticTacToeLogic,
    'checkers': checkersLogic,
    'chess': chessLogic,
    'backgammon': backgammonLogic
};

const BOT_WAIT_TIME = 15000;
export const botUsernames = ["Shadow", "Vortex", "Raptor", "Ghost", "Cipher", "Blaze"];

function isBot(player: Player): boolean {
    if (!player || !player.user || !player.user._id) return false;
    return player.user._id.toString().startsWith('bot-');
}

function broadcastLobbyState(io: Server, gameType: Room['gameType']) {
    const availableRooms = Object.values(rooms)
        .filter(room => room.gameType === gameType && room.players.length < 2)
        .map(r => ({ id: r.id, bet: r.bet, host: r.players.length > 0
                ? r.players[0]
                : { user: { username: 'Ожидание игрока' } } }));
    
    io.to(`lobby-${gameType}`).emit('roomsList', availableRooms);
}

function getPublicRoomState(room: Room) {
    const { botJoinTimer, disconnectTimer, ...publicState } = room;
    return publicState;
}

function formatGameNameForDB(gameType: string): 'Checkers' | 'Chess' | 'Backgammon' | 'Tic-Tac-Toe' {
    switch (gameType) {
        case 'tic-tac-toe': return 'Tic-Tac-Toe';
        case 'checkers': return 'Checkers';
        case 'chess': return 'Chess';
        case 'backgammon': return 'Backgammon';
        default: return 'Tic-Tac-Toe';
    }
}

async function endGame(io: Server, room: Room, winnerId?: string, isDraw: boolean = false) {
    console.log(`[EndGame] Room: ${room.id}, Winner: ${winnerId}, Draw: ${isDraw}`);
    
    if (!room) return;
    if (room.disconnectTimer) clearTimeout(room.disconnectTimer);
    if (room.botJoinTimer) clearTimeout(room.botJoinTimer);
    
    // @ts-ignore
    const winner = room.players.find(p => p.user._id.toString() === winnerId);
    // @ts-ignore
    const loser = room.players.find(p => p.user._id.toString() !== winnerId);

    const gameNameForDB = formatGameNameForDB(room.gameType);

    if (isDraw) {
        for (const player of room.players) {
            if (!isBot(player)) {
                const opponent = room.players.find(p => p.user._id !== player.user._id);
                await GameRecord.create({
                    user: player.user._id,
                    gameName: gameNameForDB,
                    status: 'DRAW',
                    amountChanged: 0,
                    opponent: opponent?.user.username || 'Bot'
                });
            }
        }
        io.to(room.id).emit('gameEnd', { winner: null, isDraw: true });
    } else if (winner && loser) {
        if (!isBot(winner)) {
            const updatedWinner = await User.findByIdAndUpdate(winner.user._id, { $inc: { balance: room.bet } }, { new: true });
            await GameRecord.create({
                user: winner.user._id,
                gameName: gameNameForDB,
                status: 'WON',
                amountChanged: room.bet,
                opponent: loser.user.username
            });
            const winnerTransaction = await Transaction.create({
                user: winner.user._id,
                type: 'WAGER_WIN',
                amount: room.bet
            });

            if (updatedWinner) {
                io.emit('balanceUpdated', {
                    userId: (winner.user._id as any).toString(),
                    newBalance: updatedWinner.balance,
                    transaction: {
                        type: winnerTransaction.type,
                        amount: winnerTransaction.amount,
                        status: winnerTransaction.status,
                        createdAt: new Date()
                    }
                });
            }
        }
        if (!isBot(loser)) {
            const updatedLoser = await User.findByIdAndUpdate(loser.user._id, { $inc: { balance: -room.bet } }, { new: true });
            await GameRecord.create({
                user: loser.user._id,
                gameName: gameNameForDB,
                status: 'LOST',
                amountChanged: -room.bet,
                opponent: winner.user.username
            });
            const loserTransaction = await Transaction.create({
                user: loser.user._id,
                type: 'WAGER_LOSS',
                amount: room.bet
            });

            if (updatedLoser) {
                io.emit('balanceUpdated', {
                    userId: (loser.user._id as any).toString(),
                    newBalance: updatedLoser.balance,
                    transaction: {
                        type: loserTransaction.type,
                        amount: loserTransaction.amount,
                        status: loserTransaction.status,
                        createdAt: new Date()
                    }
                });
            }
        }
        io.to(room.id).emit('gameEnd', { winner, isDraw: false });
    }
    
    const gameType = room.gameType;
    delete rooms[room.id];
    broadcastLobbyState(io, gameType);
}

async function processBotMoveInRegularGame(
    io: Server,
    roomId: string,
    nextPlayer: any,
    gameLogic: any
): Promise<void> {
    try {
        let currentRoom = rooms[roomId];
        if (!currentRoom) return;

        if (currentRoom.gameType === 'backgammon') {
            // @ts-ignore
            const botPlayerId = nextPlayer.user._id.toString();
            
            if ((currentRoom.gameState as any).turnPhase === 'ROLLING') {
                const { newState: diceState, error: diceError } = rollDiceForBackgammon(
                    currentRoom.gameState,
                    botPlayerId,
                    currentRoom.players
                );
                
                if (diceError) {
                    console.log('[Bot] Dice roll error:', diceError);
                    return;
                }
                
                currentRoom.gameState = diceState;
                io.to(roomId).emit('gameUpdate', getPublicRoomState(currentRoom));
                
                if ((currentRoom.gameState as any).turnPhase === 'ROLLING') {
                    return;
                }
                
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }

        let botCanMove = true;
        let safetyBreak = 0;

        while (botCanMove && safetyBreak < 10) {
            safetyBreak++;
            
            const botPlayerIndex = currentRoom.players.findIndex(p => isBot(p)) as 0 | 1;
            const botMove = gameLogic.makeBotMove(currentRoom.gameState, botPlayerIndex);
            
            if (!botMove || Object.keys(botMove).length === 0) break;

            const botProcessResult = gameLogic.processMove(
                currentRoom.gameState,
                botMove,
                // @ts-ignore
                nextPlayer.user._id.toString(),
                currentRoom.players
            );

            if (botProcessResult.error) {
                console.log(`[Bot] Move error: ${botProcessResult.error}`);
                break;
            }

            currentRoom.gameState = botProcessResult.newState;
            
            const botGameResult = gameLogic.checkGameEnd(currentRoom.gameState, currentRoom.players);
            if (botGameResult.isGameOver) {
                return endGame(io, currentRoom, botGameResult.winnerId, botGameResult.isDraw);
            }
            
            botCanMove = !('turnShouldSwitch' in botProcessResult ? botProcessResult.turnShouldSwitch : true);
            
            if (currentRoom.gameType === 'backgammon' &&
                ('turnShouldSwitch' in botProcessResult ? botProcessResult.turnShouldSwitch : true)) {
                break;
            }
        }

        if (currentRoom) {
            io.to(roomId).emit('gameUpdate', getPublicRoomState(currentRoom));
        }
    } catch (error) {
        console.error(`[Bot] Error in regular game bot move:`, error);
    }
}

export const initializeSocket = (io: Server) => {
    setIO(io);

    io.use(async (socket: Socket, next: (err?: Error) => void) => {
        try {
            const token = socket.handshake.auth.token;
            if (!token) return next(new Error('Authentication error'));
            const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as JwtPayload;
            const user = await User.findById(decoded.id).select('username avatar balance').lean();
            if (!user) return next(new Error('User not found'));
            (socket as any).user = user;
            next();
        } catch (error) {
            next(new Error('Authentication error'));
        }
    });

    io.on('connection', (socket: Socket) => {
        const initialUser = (socket as any).user as IUser;
        // @ts-ignore
        userSocketMap[initialUser._id.toString()] = socket.id;

        const previousRoom = Object.values(rooms).find(r =>
            // @ts-ignore
            r.disconnectTimer && r.players.some(p => p.user._id.toString() === initialUser._id.toString())
        );

        if (previousRoom) {
            console.log(`[+] Player ${initialUser.username} reconnected to room ${previousRoom.id}`);
            
            clearTimeout(previousRoom.disconnectTimer);
            previousRoom.disconnectTimer = undefined;

            // @ts-ignore
            const playerInRoom = previousRoom.players.find(p => p.user._id.toString() === initialUser._id.toString())!;
            playerInRoom.socketId = socket.id;
            
            socket.join(previousRoom.id);
            io.to(previousRoom.id).emit('playerReconnected', { message: `Игрок ${initialUser.username} вернулся в игру!` });
            io.to(previousRoom.id).emit('gameUpdate', getPublicRoomState(previousRoom));
        }


        socket.on('joinLobby', (gameType: Room['gameType']) => {
            socket.join(`lobby-${gameType}`);
            broadcastLobbyState(io, gameType);
        });

        socket.on('leaveLobby', (gameType: Room['gameType']) => {
            socket.leave(`lobby-${gameType}`);
        });

        socket.on('joinTournamentGame', async (matchId: string) => {
            // @ts-ignore
            const userId = initialUser._id.toString();
            const success = await joinTournamentRoom(io, socket, matchId, userId);
            
            if (success) {
                tournamentPlayerSockets[userId] = socket.id;
            }
        });

        socket.on('leaveTournamentGame', async (matchId: string) => {
            // @ts-ignore
            const userId = initialUser._id.toString();
            console.log(`[Tournament] Player ${userId} leaving tournament game ${matchId}`);
            
            if (tournamentPlayerSockets[userId]) {
                delete tournamentPlayerSockets[userId];
            }
            
            socket.leave(`tournament-${matchId}`);
        });

        socket.on('tournamentMove', async ({ matchId, move }: { matchId: string, move: any }) => {
            // @ts-ignore
            const userId = initialUser._id.toString();
            await processTournamentMove(io, socket, matchId, userId, move);
        });

        socket.on('tournamentPlayerLeft', async ({ matchId, timestamp }: { matchId: string, timestamp: number }) => {
            // @ts-ignore
            const userId = initialUser._id.toString();
            await handleTournamentPlayerLeft(io, matchId, userId, timestamp);
        });

        socket.on('tournamentPlayerReturned', async ({ matchId }: { matchId: string }) => {
            // @ts-ignore
            const userId = initialUser._id.toString();
            await handleTournamentPlayerReturned(io, matchId, userId);
        });

        socket.on('tournamentPlayerForfeited', async ({ matchId, reason }: { matchId: string, reason?: string }) => {
            // @ts-ignore
            const userId = initialUser._id.toString();
            await handleTournamentPlayerForfeited(io, matchId, userId, reason);
        });

        socket.on('rollDice', (roomId: string) => {
            const room = rooms[roomId];
            const currentPlayerId = (socket as any).user._id.toString();

            if (!room || room.gameType !== 'backgammon') {
                return;
            }

            const { newState, error } = rollDiceForBackgammon(room.gameState, currentPlayerId, room.players);
            
            if (error) {
                return socket.emit('error', { message: error });
            }

            room.gameState = newState;
            io.to(roomId).emit('gameUpdate', getPublicRoomState(room));
            
            // @ts-ignore
            const nextPlayer = room.players.find(p => p.user._id.toString() === room.gameState.turn);
            if (nextPlayer && isBot(nextPlayer) && (room.gameState as any).turnPhase === 'ROLLING') {
                setTimeout(() => {
                    const currentRoom = rooms[roomId];
                    if (!currentRoom) return;
                    
                    // @ts-ignore
                    const botPlayerId = nextPlayer.user._id.toString();
                    const { newState: botDiceState, error: botDiceError } = rollDiceForBackgammon(
                        currentRoom.gameState,
                        botPlayerId,
                        currentRoom.players
                    );
                    
                    if (!botDiceError) {
                        currentRoom.gameState = botDiceState;
                        io.to(roomId).emit('gameUpdate', getPublicRoomState(currentRoom));
                    }
                }, 1000);
            }
        });

        socket.on('createRoom', async ({ gameType, bet }: { gameType: Room['gameType'], bet: number }) => {
            const gameLogic = gameLogics[gameType];
            if (!gameLogic || !gameLogic.createInitialState) return socket.emit('error', { message: "Игра недоступна." });
            
            const currentUser = await User.findById(initialUser._id);
            if (!currentUser) return socket.emit('error', { message: "Пользователь не найден." });
            if (currentUser.balance < bet) return socket.emit('error', { message: 'Недостаточно средств.' });

            const roomId = `room-${socket.id}`;
            const players: Player[] = [{ socketId: socket.id, user: currentUser }];
            const newRoom: Room = { id: roomId, gameType, bet, players, gameState: gameLogic.createInitialState(players) };
            rooms[roomId] = newRoom;
            socket.join(roomId);

            socket.emit('gameStart', getPublicRoomState(newRoom));
            broadcastLobbyState(io, gameType);

            newRoom.botJoinTimer = setTimeout(() => {
                const room = rooms[roomId];
                if (room && room.players.length === 1) {
                    const botUser: Player['user'] = { _id: `bot-${Date.now()}` as any, username: botUsernames[Math.floor(Math.random() * botUsernames.length)], avatar: 'bot_avatar.png', balance: 9999 };
                    room.players.push({ socketId: 'bot_socket_id', user: botUser });
                    room.gameState = gameLogic.createInitialState(room.players);
                    io.to(roomId).emit('gameStart', getPublicRoomState(room));
                }
            }, BOT_WAIT_TIME);
        });

        socket.on('joinRoom', async (roomId: string) => {
            const room = rooms[roomId];
            const currentUser = await User.findById(initialUser._id);

            if (!currentUser || !room) {
                return socket.emit('error', { message: 'Комната не найдена или пользователь не существует.' });
            }
            if (room.players.length >= 2) {
                return socket.emit('error', { message: 'Комната уже заполнена.' });
            }
            if (currentUser.balance < room.bet) {
                return socket.emit('error', { message: 'Недостаточно средств для присоединения.' });
            }

            const gameLogic = gameLogics[room.gameType];
            room.players.push({ socketId: socket.id, user: currentUser });
            socket.join(roomId);

            if (room.players.length === 1) {
                room.gameState = gameLogic.createInitialState(room.players);
                socket.emit('gameStart', getPublicRoomState(room));

                room.botJoinTimer = setTimeout(() => {
                    const currentRoom = rooms[roomId];
                    if (currentRoom && currentRoom.players.length === 1) {
                        const botUser: Player['user'] = { _id: `bot-${Date.now()}` as any, username: botUsernames[Math.floor(Math.random() * botUsernames.length)], avatar: 'bot_avatar.png', balance: 9999 };
                        currentRoom.players.push({ socketId: 'bot_socket_id', user: botUser });
                        currentRoom.gameState = gameLogic.createInitialState(currentRoom.players);
                        io.to(roomId).emit('gameStart', getPublicRoomState(currentRoom));
                    }
                }, BOT_WAIT_TIME);

            } else {
                if (room.botJoinTimer) {
                    clearTimeout(room.botJoinTimer);
                }
                
                room.gameState = gameLogic.createInitialState(room.players);
                io.to(roomId).emit('gameStart', getPublicRoomState(room));
            }
            
            broadcastLobbyState(io, room.gameType);
        });
        
        socket.on('playerMove', ({ roomId, move }: { roomId: string, move: GameMove }) => {
            const room = rooms[roomId];
            // @ts-ignore
            const currentPlayerId = initialUser._id.toString();

            if (!room) {
                return socket.emit('error', { message: 'Комната не найдена' });
            }
            if (room.players.length < 2) {
                return socket.emit('error', { message: 'Дождитесь второго игрока' });
            }
            if (room.gameState.turn !== currentPlayerId) {
                return socket.emit('error', { message: 'Сейчас не ваш ход' });
            }

            const gameLogic = gameLogics[room.gameType];
            
            const result = gameLogic.processMove(room.gameState, move, currentPlayerId, room.players);
            
            if (result.error) return socket.emit('error', { message: result.error });

            room.gameState = result.newState;
            
            const gameResult = gameLogic.checkGameEnd(room.gameState, room.players);
            if (gameResult.isGameOver) {
                return endGame(io, room, gameResult.winnerId, gameResult.isDraw);
            }
            
            io.to(roomId).emit('gameUpdate', getPublicRoomState(room));
            
            // @ts-ignore
            const nextPlayer = room.players.find(p => p.user._id.toString() === room.gameState.turn);
            const shouldScheduleBotMove = nextPlayer && isBot(nextPlayer) &&
                ('turnShouldSwitch' in result ? result.turnShouldSwitch : true);
                
            if (shouldScheduleBotMove) {
                setTimeout(() => {
                    processBotMoveInRegularGame(io, roomId, nextPlayer, gameLogic);
                }, 1200);
            }
        });

        socket.on('leaveGame', (roomId: string) => {
            const room = rooms[roomId];
            if (!room) return;
            
            const winningPlayer = room.players.find(p => p.socketId !== socket.id);
            if (winningPlayer) {
                // @ts-ignore
                endGame(io, room, winningPlayer.user._id.toString());
            } else {
                if (room.botJoinTimer) clearTimeout(room.botJoinTimer);
                delete rooms[roomId];
                broadcastLobbyState(io, room.gameType);
            }
        });

        socket.on('getGameState', (roomId: string) => {
            const room = rooms[roomId];
            if (room && room.players.some(p => p.socketId === socket.id)) {
                socket.emit('gameUpdate', getPublicRoomState(room));
            }
        });
        
        socket.on('disconnect', () => {
            console.log(`[-] User disconnected: ${initialUser.username}`);
            // @ts-ignore
            delete userSocketMap[initialUser._id.toString()];

            const roomId = Object.keys(rooms).find(id => rooms[id].players.some(p => p.socketId === socket.id));
            if (!roomId) return;

            const room = rooms[roomId];
            if (room.botJoinTimer) clearTimeout(room.botJoinTimer);
            
            const remainingPlayer = room.players.find(p => p.socketId !== socket.id);

            if (room.players.length < 2 || !remainingPlayer) {
                delete rooms[roomId];
                broadcastLobbyState(io, room.gameType);
            } else {
                io.to(remainingPlayer.socketId).emit('opponentDisconnected', { message: `Противник отключился. Ожидание переподключения (60 сек)...` });
                room.disconnectTimer = setTimeout(() => {
                    // @ts-ignore
                    endGame(io, room, remainingPlayer.user._id.toString());
                }, 60000);
            }
        });
    });
}