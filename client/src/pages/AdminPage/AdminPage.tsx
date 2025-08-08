import React, { useState } from 'react';
import { createTournament, createLobbyRoom } from '../../services/adminService';
import styles from './AdminPage.module.css';
import { PlusCircle, Trophy } from 'lucide-react';

const AdminPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState('createTournament');
    
    const [lobbyGameType, setLobbyGameType] = useState('tic-tac-toe');
    const [lobbyBet, setLobbyBet] = useState(50);
    const [lobbyMessage, setLobbyMessage] = useState('');

    const [tourneyName, setTourneyName] = useState('Daily tournament');
    const [tourneyGameType, setTourneyGameType] = useState('chess');
    const [tourneyEntryFee, setTourneyEntryFee] = useState(10);
    const [tourneyMaxPlayers, setTourneyMaxPlayers] = useState(8);
    const [tourneyStartTime, setTourneyStartTime] = useState('');
    const [tourneyMessage, setTourneyMessage] = useState('');

    const handleLobbySubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLobbyMessage('');
        try {
            const data = await createLobbyRoom({ gameType: lobbyGameType, bet: lobbyBet });
            setLobbyMessage(`Success! The room has been created.: ${data.room.id}`);
        } catch (error: any) {
            setLobbyMessage(`Error: ${error.response?.data?.message || 'Something went wrong'}`);
        }
    };
    
    const handleTournamentSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setTourneyMessage('');
        try {
            const tournamentData = { name: tourneyName, gameType: tourneyGameType, entryFee: tourneyEntryFee, maxPlayers: tourneyMaxPlayers };
            const data = await createTournament(tournamentData);
            setTourneyMessage(`Success! Tournament "${data.name}" created.`);
        } catch (error: any) {
            setTourneyMessage(`Error: ${error.response?.data?.message || 'Something went wrong'}`);
        }
    };

    return (
        <div className={styles.pageContainer}>
            <aside className={styles.sidebar}>
                <button 
                    onClick={() => setActiveTab('createTournament')} 
                    className={`${styles.navButton} ${activeTab === 'createTournament' ? styles.active : ''}`}
                >
                    <Trophy /> Create Tournament
                </button>
                <button 
                    onClick={() => setActiveTab('createRoom')} 
                    className={`${styles.navButton} ${activeTab === 'createRoom' ? styles.active : ''}`}
                >
                    <PlusCircle /> Create a Room
                </button>
            </aside>

            <main className={styles.content}>
                {activeTab === 'createTournament' && (
                    <section>
                        <h1>Creating a Tournament</h1>
                        <div className={styles.card}>
                            <h3>New tournament</h3>
                            <form onSubmit={handleTournamentSubmit} className={styles.form}>
                                <input type="text" value={tourneyName} onChange={e => setTourneyName(e.target.value)} placeholder="Tournament name" required className={styles.formInput} />
                                <select value={tourneyGameType} onChange={e => setTourneyGameType(e.target.value)} className={styles.formSelect}>
                                    <option value="chess">Chess</option>
                                    <option value="checkers">Checkers</option>
                                    <option value="tic-tac-toe">Tic Tac Toe</option>
                                    <option value="backgammon">Backgammon</option>
                                    <option value="bingo">Bingo</option>
                                    <option value="durak">Durak</option>
                                    <option value="domino">Domino</option>
                                    <option value="dice">Dice</option>
                                </select>
                                <input type="number" value={tourneyEntryFee} onChange={e => setTourneyEntryFee(Number(e.target.value))} min="0" placeholder="Entry fee" className={styles.formInput} />
                                <select value={tourneyMaxPlayers} onChange={e => setTourneyMaxPlayers(Number(e.target.value))} className={styles.formSelect}>
                                    <option value={4}>4 players</option>
                                    <option value={8}>8 players</option>
                                    <option value={16}>16 players</option>
                                    <option value={32}>32 players</option>
                                </select>
                                <button type="submit" className={styles.formButton}>Create a tournament</button>
                                {tourneyMessage && <p className={`${styles.message} ${tourneyMessage.startsWith('Error') ? styles.error : styles.success}`}>{tourneyMessage}</p>}
                            </form>
                        </div>
                    </section>
                )}

                {activeTab === 'createRoom' && (
                    <section>
                        <h1>Creating a Room in the Lobby</h1>
                        <div className={styles.card}>
                            <h3>New room</h3>
                            <form onSubmit={handleLobbySubmit} className={styles.form}>
                                <select value={lobbyGameType} onChange={e => setLobbyGameType(e.target.value)} className={styles.formSelect}>
                                    <option value="tic-tac-toe">Tic Tac Toe</option>
                                    <option value="checkers">Checkers</option>
                                    <option value="chess">Chess</option>
                                    <option value="backgammon">Backgammon</option>
                                    <option value="bingo">Bingo</option>
                                    <option value="durak">Durak</option>
                                    <option value="domino">Domino</option>
                                    <option value="dice">Dice</option>
                                </select>
                                <input type="number" value={lobbyBet} onChange={e => setLobbyBet(Number(e.target.value))} min="1" placeholder="Bet" className={styles.formInput} />
                                <button type="submit" className={styles.formButton}>Create room</button>
                                {lobbyMessage && <p className={`${styles.message} ${lobbyMessage.startsWith('Error') ? styles.error : styles.success}`}>{lobbyMessage}</p>}
                            </form>
                        </div>
                    </section>
                )}
            </main>
        </div>
    );
};

export default AdminPage;