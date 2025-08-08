import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import styles from './LobbyPage.module.css';

interface RoomInfo {
    id: string;
    bet: number;
    host: { user: { username: string } };
}

interface GameRoom {
    id: string;
    gameType: string;
}

const formatGameName = (gameType: string = ''): string => {
    return gameType.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

const getGameIcon = (gameType: string = ''): string => {
    switch (gameType) {
        case 'tic-tac-toe': return '⭕';
        case 'checkers': return '⚫';
        case 'chess': return '♛';
        case 'backgammon': return '🎲';
        case 'durak': return '🃏';
        case 'domino': return '🀫';
        default: return '🎮';
    }
}

const LobbyPage: React.FC = () => {
    const { gameType } = useParams<{ gameType: string }>();
    const { socket } = useSocket();
    const { user } = useAuth();
    const navigate = useNavigate();

    const [rooms, setRooms] = useState<RoomInfo[]>([]);
    const [bet, setBet] = useState(10);
    const [error, setError] = useState('');
    const [isCreating, setIsCreating] = useState(false);

    useEffect(() => {
        if (!socket || !gameType) return;
        socket.emit('joinLobby', gameType);

        const onRoomsList = (availableRooms: RoomInfo[]) => setRooms(availableRooms);
        const onGameStart = (room: GameRoom) => navigate(`/game/${room.gameType}/${room.id}`);
        const onError = ({ message }: { message: string }) => {
            setError(message);
            setIsCreating(false);
        };
        
        socket.on('roomsList', onRoomsList);
        socket.on('gameStart', onGameStart);
        socket.on('error', onError);

        return () => {
            socket.emit('leaveLobby', gameType);
            socket.off('roomsList', onRoomsList);
            socket.off('gameStart', onGameStart);
            socket.off('error', onError);
        };
    }, [socket, gameType, navigate]);

    const handleCreateRoom = () => {
        if (socket && gameType) {
            setError('');
            setIsCreating(true);
            socket.emit('createRoom', { gameType, bet });
        }
    };

    const handleJoinRoom = (roomId: string) => {
        if (socket) {
            setError('');
            socket.emit('joinRoom', roomId);
        }
    };

    if (!user || !gameType) {
        return <div>Loading...</div>;
    }

    return (
        <div className={styles.pageContainer}>
            <button onClick={() => navigate('/games')} className={styles.backButton}>
                ← Back to games
            </button>
            
            <div className={styles.gameHeader}>
                <div className={styles.gameIcon}>{getGameIcon(gameType)}</div>
                <div>
                    <h1>Lobby: {formatGameName(gameType)}</h1>
                    <p>Your balance: <span>${user.balance.toFixed(2)}</span></p>
                </div>
            </div>

            {error && <div style={{color: 'salmon', textAlign: 'center', marginBottom: '1rem'}}>Error: {error}</div>}

            <div className={styles.mainGrid}>
                <div className={styles.lobbySection}>
                    <div className={styles.lobbySectionHeader}>
                        <span>➕</span>
                        <h2 className={styles.lobbySectionTitle}>Create a game</h2>
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Bet ($)</label>
                        <input
                            type="number"
                            value={bet}
                            onChange={(e) => setBet(Math.max(1, Number(e.target.value)))}
                            min="1"
                            max={user.balance}
                            className={styles.formInput}
                            placeholder="Enter bet"
                        />
                    </div>
                    <button onClick={handleCreateRoom} disabled={isCreating || bet > user.balance} className={`${styles.btn} ${styles.btnPrimary}`}>
                        {isCreating ? (
                            <>
                                <div className={styles.spinner}></div>
                                Creation...
                            </>
                        ) : (
                            `▶️ Create a game on $${bet}`
                        )}
                    </button>
                </div>

                <div className={styles.lobbySection}>
                    <div className={styles.lobbySectionHeader}>
                        <span>👥</span>
                        <h2 className={styles.lobbySectionTitle}>Available games</h2>
                    </div>
                    
                    <div className={styles.roomList}>
                        {rooms.length === 0 ? (
                            <div className={styles.emptyState}>
                                <div>⏰</div>
                                <p>No rooms available</p>
                                <p>Create your own game!</p>
                            </div>
                        ) : (
                            rooms.map(room => (
                                <div key={room.id} className={styles.roomItem}>
                                    <div className={styles.roomInfo}>
                                        <div className={styles.roomAvatar}>
                                            <span>👤</span>
                                        </div>
                                        <div className={styles.roomDetails}>
                                            <h4>{room.host.user.username}</h4>
                                            <p>Bet: ${room.bet}</p>
                                        </div>
                                    </div>
                                    <button onClick={() => handleJoinRoom(room.id)} className={`${styles.btn} ${styles.btnPrimary}`}>
                                        Join
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LobbyPage;