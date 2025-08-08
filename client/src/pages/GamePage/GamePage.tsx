import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSocket } from '../../context/SocketContext';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import TicTacToeBoard from '../../components/game/TicTacToeBoard';
import CheckersBoard from '../../components/game/CheckersBoard';
import ChessBoard from '../../components/game/ChessBoard';
import BackgammonBoard from '../../components/game/BackgammonBoard';
import DurakBoard from '../../components/game/DurakBoard';
import DominoBoard from '../../components/game/DominoBoard';
import DiceBoard from '../../components/game/DiceBoard';
import BingoBoard from '../../components/game/BingoBoard';
import ErrorModal from '../../components/modals/ErrorModal';
import GameResultModal from '../../components/modals/GameResultModal';
import { Chess } from 'chess.js';
import styles from './GamePage.module.css';

interface Player {
    user: { _id: string; username: string; }
}

interface GameRoomState {
    id: string;
    gameType: string;
    players: Player[];
    gameState: { board: ('X' | 'O' | null)[]; turn: string; };
    bet: number;
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
        case 'dice': return '🎯';
        case 'bingo': return '🎱';
        default: return '🎮';
    }
}

const GamePage: React.FC = () => {
    const { gameType, roomId } = useParams<{ gameType: string; roomId: string }>();
    const navigate = useNavigate();
    const { socket } = useSocket();
    const { user, refreshUser } = useAuth();
    
    const [roomState, setRoomState] = useState<GameRoomState | null>(null);
    const [gameMessage, setGameMessage] = useState('');
    const [countdown, setCountdown] = useState(0);
    const [redirectCountdown, setRedirectCountdown] = useState(5);
    const [errorModal, setErrorModal] = useState({ isOpen: false, message: '' });
    const [gameResultModal, setGameResultModal] = useState({
        isOpen: false,
        result: 'win' as 'win' | 'lose' | 'draw',
        opponentName: ''
    });
    const redirectTimerRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (!socket || !roomId) return;

        const isTournamentGame = roomId.startsWith('tourney-');

        if (isTournamentGame) {
            socket.emit('joinTournamentGame', roomId);
        } else {
            socket.emit('getGameState', roomId);
        }

        const onGameStart = (state: GameRoomState) => {
            console.log('Game started:', state);
            setGameMessage('');
            setRoomState(state);
            if (state.players.length === 1 && !isTournamentGame) {
                setCountdown(15);
            }
        };

        const onGameUpdate = (state: GameRoomState) => {
            console.log('Game updated:', state);
            setRoomState(state);
        };

        const onGameEnd = async ({ winner, isDraw }: { winner: Player | null, isDraw: boolean }) => {
            console.log('Game ended:', { winner, isDraw });
            
            let result: 'win' | 'lose' | 'draw';
            let opponentName = '';
            
            if (isDraw) {
                result = 'draw';
                setGameMessage('🤝 Draw!');
            } else if (winner?.user.username === user?.username) {
                result = 'win';
                setGameMessage('🎉 You won!');
                opponentName = roomState?.players.find(p => p.user._id !== user?._id)?.user.username || '';
            } else {
                result = 'lose';
                setGameMessage(`😔 You lost. Winner: ${winner?.user.username || 'Unknown'}`);
                opponentName = winner?.user.username || 'Unknown';
            }

            setGameResultModal({
                isOpen: true,
                result,
                opponentName
            });

            try {
                await refreshUser();
            } catch (error) {
                console.error("Failed to update profile after game", error);
            }
        };

        const onError = ({ message }: { message: string }) => {
            console.error('Game error:', message);
            setErrorModal({ isOpen: true, message });
        };

        const onPlayerReconnected = ({ message }: { message: string }) => {
            console.log('Player reconnected:', message);
            setGameMessage('');
        };

        const onOpponentDisconnected = ({ message }: { message: string }) => {
            console.log('Opponent disconnected:', message);
            setGameMessage(`⏳ ${message}`);
        };
        
        socket.on('gameStart', onGameStart);
        socket.on('gameUpdate', onGameUpdate);
        socket.on('gameEnd', onGameEnd);
        socket.on('error', onError);
        socket.on('playerReconnected', onPlayerReconnected);
        socket.on('opponentDisconnected', onOpponentDisconnected);

        socket.emit('getGameState', roomId);

        return () => {
            socket.off('gameStart', onGameStart);
            socket.off('gameUpdate', onGameUpdate);
            socket.off('gameEnd', onGameEnd);
            socket.off('error', onError);
            socket.off('playerReconnected', onPlayerReconnected);
            socket.off('opponentDisconnected', onOpponentDisconnected);
        };
    }, [socket, roomId, user?.username, navigate, gameType, refreshUser]);

    useEffect(() => {
        if (roomState?.players.length !== 1 || countdown <= 0 || gameMessage) return;
        const timer = setInterval(() => setCountdown(prev => prev > 0 ? prev - 1 : 0), 1000);
        return () => clearInterval(timer);
    }, [roomState, countdown, gameMessage]);

    useEffect(() => {
        if (gameMessage) {
            setRedirectCountdown(5);
            redirectTimerRef.current = setInterval(() => {
                setRedirectCountdown(prev => {
                    if (prev <= 1) {
                        if (redirectTimerRef.current) clearInterval(redirectTimerRef.current);
                        
                        if (roomId?.startsWith('tourney-')) {
                            const tournamentId = roomId.split('-')[1];
                            navigate(`/tournaments/${tournamentId}`);
                        } else {
                            navigate(`/lobby/${gameType}`);
                        }
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => {
            if (redirectTimerRef.current) clearInterval(redirectTimerRef.current);
        };
    }, [gameMessage, navigate, gameType]);

    const handleLeaveGame = () => {
        if (socket && roomId) {
            socket.emit('leaveGame', roomId);
        }
        
        if (roomId?.startsWith('tourney-')) {
            const tournamentId = roomId.split('-')[1];
            navigate(`/tournaments/${tournamentId}`);
        } else {
            navigate(`/lobby/${gameType}`);
        }
    };

    const handleMove = (moveData: any) => {
        if (socket) {
            socket.emit('playerMove', { roomId, move: moveData });
        }
    };

    const closeErrorModal = () => {
        setErrorModal({ isOpen: false, message: '' });
    };

    const closeGameResultModal = () => {
        setGameResultModal({ isOpen: false, result: 'win', opponentName: '' });
    };

    const handleBackToLobby = () => {
        if (roomId?.startsWith('tourney-')) {
            const tournamentId = roomId.split('-')[1];
            navigate(`/tournaments/${tournamentId}`);
        } else {
            navigate(`/lobby/${gameType}`);
        }
    };

    const handleRollDice = () => {
        if (socket) {
            socket.emit('rollDice', roomId);
        }
    };

    const renderGameBoard = () => {
        if (!roomState) return null;

        const myPlayerIndex = roomState.players.findIndex((p: Player) => p.user._id === user?._id);
        const isMyTurn = roomState.gameState.turn === user?._id;

        switch (gameType) {
            case 'tic-tac-toe':
                return (
                    <TicTacToeBoard 
                        board={roomState.gameState.board} 
                        onMove={(cellIndex) => handleMove({ cellIndex })} 
                        isMyTurn={roomState.gameState.turn === user?._id} 
                        isGameFinished={!!gameMessage} 
                    />
                );
            case 'checkers':
                if (myPlayerIndex === -1) return (
                    <div className="alert alert-error">
                        <p>Error: You are not a player in this room.</p>
                    </div>
                );
                return (
                    <CheckersBoard
                        // @ts-ignore
                        gameState={roomState.gameState}
                        // @ts-ignore
                        onMove={(move) => handleMove(move)}
                        isMyTurn={roomState.gameState.turn === user?._id}
                        isGameFinished={!!gameMessage}
                        myPlayerIndex={myPlayerIndex as 0 | 1}
                    />
                );
            case 'chess':
                return (
                    <ChessBoard 
                        // @ts-ignore
                        gameState={roomState.gameState} 
                        onMove={(move) => handleMove(move)} 
                        isMyTurn={isMyTurn} 
                        isGameFinished={!!gameMessage} 
                        myPlayerIndex={myPlayerIndex as 0 | 1} 
                    />
                );
            case 'backgammon':
                return (
                    <BackgammonBoard
                        // @ts-ignore
                        gameState={roomState.gameState}
                        onMove={(move) => handleMove(move)}
                        onRollDice={handleRollDice}
                        isMyTurn={isMyTurn}
                        isGameFinished={!!gameMessage}
                        myPlayerIndex={myPlayerIndex as 0 | 1}
                    />
                );
            case 'durak':
                if (myPlayerIndex === -1) return (
                    <div className="alert alert-error">
                        <p>Error: You are not a player in this room.</p>
                    </div>
                );
                return (
                    <DurakBoard
                        // @ts-ignore
                        gameState={roomState.gameState}
                        onMove={(move) => handleMove(move)}
                        isMyTurn={isMyTurn}
                        isGameFinished={!!gameMessage}
                        myPlayerIndex={myPlayerIndex as 0 | 1}
                    />
                );
            case 'domino':
                if (myPlayerIndex === -1) return (
                    <div className="alert alert-error">
                        <p>Error: You are not a player in this room.</p>
                    </div>
                );
                return (
                    <DominoBoard
                        // @ts-ignore
                        gameState={roomState.gameState}
                        onMove={(move) => handleMove(move)}
                        isMyTurn={isMyTurn}
                        isGameFinished={!!gameMessage}
                        myPlayerIndex={myPlayerIndex as 0 | 1}
                    />
                );
            case 'dice':
                if (myPlayerIndex === -1) return (
                    <div className="alert alert-error">
                        <p>Error: You are not a player in this room.</p>
                    </div>
                );
                return (
                    <DiceBoard
                        // @ts-ignore
                        gameState={roomState.gameState}
                        onMove={(move) => handleMove(move)}
                        isMyTurn={isMyTurn}
                        isGameFinished={!!gameMessage}
                        myPlayerIndex={myPlayerIndex as 0 | 1}
                    />
                );
            case 'bingo':
                if (myPlayerIndex === -1) return (
                    <div className="alert alert-error">
                        <p>Error: You are not a player in this room.</p>
                    </div>
                );
                return (
                    <BingoBoard
                        // @ts-ignore
                        gameState={roomState.gameState}
                        onMove={(move) => handleMove(move)}
                        isMyTurn={isMyTurn}
                        isGameFinished={!!gameMessage}
                        myPlayerIndex={myPlayerIndex as 0 | 1}
                    />
                );
            default:
                return (
                    <div className="alert alert-error">
                        <p>Game "{gameType}" not found.</p>
                    </div>
                );
        }
    };

    if (!roomState) {
        return (
            <div className="loading-container">
                <div className="loading-content">
                    <div className="spinner"></div>
                    <p className="loading-text">Loading game...</p>
                </div>
            </div>
        );
    }
    
    const isWaitingForOpponent = roomState.players.length < 2 && !gameMessage;
    const opponent = roomState.players.find(p => p.user._id !== user?._id);
    const isMyTurn = roomState.gameState.turn === user?._id;

    const isTournamentGame = roomId?.startsWith('tourney-');
    const backButtonText = isTournamentGame ? '← Back to tournament' : '← Back to lobby';
    const backButtonAction = () => {
        if (isTournamentGame) {
            const tournamentId = roomId!.split('-')[1];
            navigate(`/tournaments/${tournamentId}`);
        } else {
            navigate(`/lobby/${gameType}`);
        }
    };

    return (
        <div className={styles.pageContainer}>
            <div className={styles.header}>
                <button onClick={backButtonAction} className={styles.backButton}>
                    {backButtonText}
                </button>
                <div className={styles.gameHeader}>
                    <div className={styles.gameIcon}>{getGameIcon(gameType)}</div>
                    <div>
                        <h1>{formatGameName(gameType)}</h1>
                        {isTournamentGame && <p style={{fontSize: '0.9em', opacity: 0.8}}>Tournament Match</p>}
                    </div>
                </div>
            </div>

            <div className={`${styles.card} ${styles.cardPadding}`}>
                <div className={styles.gameInfoGrid}>
                    <div className={styles.gameInfoItem}>
                        <span className={styles.gameInfoIcon}>👥</span>
                        <div className={styles.gameInfoContent}><p>Players</p><p>{user?.username} vs {opponent?.user.username || '...'}</p></div>
                    </div>
                    <div className={styles.gameInfoItem}>
                        <span className={styles.gameInfoIcon}>💰</span>
                        <div className={styles.gameInfoContent}><p>Bet</p><p>${roomState.bet}</p></div>
                    </div>
                    <div className={styles.gameInfoItem}>
                        <span className={styles.gameInfoIcon}>🏆</span>
                        <div className={styles.gameInfoContent}><p>Prise</p><p>${roomState.bet * 2}</p></div>
                    </div>
                </div>
            </div>

            <div className={styles.statusMessageContainer}>
                {isWaitingForOpponent ? (
                    <div className={`${styles.statusMessage} ${styles.statusWaiting}`}>
                        <div className={styles.statusIcon}>⏰</div>
                        <h3 className={styles.statusTitleWaiting}>⏳ Waiting for the opponent...</h3>
                        <p>Automatic cancellation after: <span style={{fontWeight: 'bold'}}>{countdown} s</span></p>
                    </div>
                ) : !gameMessage ? (
                    <div className={`${styles.statusMessage} ${isMyTurn ? styles.statusTurn : styles.statusOpponentTurn}`}>
                        <h3 className={`${styles.statusTitle} ${isMyTurn ? styles.statusTitleMyTurn : styles.statusTitleOpponentTurn}`}>
                            {isMyTurn ? '✅ Your move' : '⏳ Opponents move'}
                        </h3>
                    </div>
                ) : (
                    <div className={`${styles.statusMessage} ${styles.statusTurn}`}>
                        <h3 className={`${styles.statusTitle} ${styles.statusTitleMyTurn}`}>
                            🎮 Game completed
                        </h3>
                        <p>Check the result in the modal window</p>
                    </div>
                )}
            </div>

            <div className={`${styles.card} ${styles.cardPadding}`}>
                {renderGameBoard()}
            </div>

            {!gameMessage && (
                <div style={{textAlign: 'center'}}>
                    <button onClick={handleLeaveGame} className={`${styles.btn} ${styles.btnDanger}`}>
                        {isWaitingForOpponent ? 'Cancel search' : 'Surrender'}
                    </button>
                </div>
            )}

            <ErrorModal
                isOpen={errorModal.isOpen}
                message={errorModal.message}
                onClose={closeErrorModal}
            />

            <GameResultModal
                isOpen={gameResultModal.isOpen}
                result={gameResultModal.result}
                opponentName={gameResultModal.opponentName}
                onClose={closeGameResultModal}
                onBackToLobby={handleBackToLobby}
                countdown={redirectCountdown}
            />
        </div>
    );
};

export default GamePage;