import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import styles from './HomePage.module.css';
import { Star } from 'lucide-react';

const gamesData = [
    { name: 'Chess', image: 'https://images.pexels.com/photos/260024/pexels-photo-260024.jpeg?auto=compress&cs=tinysrgb&w=800', gameType: 'chess', status: 'Available', category: 'Strategy', tag: 'Advanced', avatar: 'C', rating: 4.9, difficulty: 'Difficult', players: '2 players', time: '30-60 min' },
    { name: 'Checkers', image: 'https://avatars.dzeninfra.ru/get-zen_doc/271828/pub_67a99e7d6bcf180eb89c36da_67a99e866bcf180eb89c3b0d/scale_1200', gameType: 'checkers', status: 'Available', category: 'Strategy', tag: 'Average', avatar: 'C', rating: 4.7, difficulty: 'Average', players: '2 players', time: '15-30 min' },
    { name: 'Backgammon', image: 'https://www.superbetinyeniadresi.net/wp-content/uploads/2020/10/Tavla-Oynanan-Bahis-Siteleri.jpg', gameType: 'backgammon', status: 'Available', category: 'Strategy', tag: 'Average', avatar: 'B', rating: 4.8, difficulty: 'Average', players: '2 players', time: '20-45 min' },
    { name: 'Domino', image: 'https://images.unsplash.com/photo-1611371805429-8b5c1b2c34ba?auto=compress&cs=tinysrgb&w=800', gameType: 'domino', status: 'Available', category: 'Strategy', tag: 'Average', avatar: 'D', rating: 4.7, difficulty: 'Average', players: '2 players', time: '15-30 min' },
    { name: 'Durak', image: 'https://images.unsplash.com/photo-1606092195730-5d7b9af1efc5?auto=compress&cs=tinysrgb&w=800', gameType: 'durak', status: 'Available', category: 'Strategy', tag: 'Average', avatar: 'D', rating: 4.6, difficulty: 'Average', players: '2 players', time: '10-25 min' },
    { name: 'Dice', image: 'https://images.unsplash.com/photo-1522069169874-c58ec4b76be5?auto=compress&cs=tinysrgb&w=800', gameType: 'dice', status: 'Available', category: 'Casual', tag: 'Average', avatar: '🎲', rating: 4.6, difficulty: 'Average', players: '2 players', time: '10-20 min' },
    { name: 'Tic Tac Toe', image: 'https://media.printables.com/media/prints/996434/images/7583870_392cdefa-1c3e-4318-9225-1bc12ed72a34_47a94660-c70d-4554-8a25-288442c379ea/tictac-2_configuration_no-configuration.png', gameType: 'tic-tac-toe', status: 'Available', category: 'Casual', tag: 'Easy', avatar: 'T', rating: 4.5, difficulty: 'Easily', players: '2 players', time: '1-5 min' },
];

const GameCard: React.FC<{ game: typeof gamesData[0] }> = ({ game }) => (
    <div className={styles.gameCard}>
            <img 
                  src={game.image} 
                  alt={game.avatar}
                  className={styles.cardImage}
                />
        <div className={styles.cardAvatar}>{game.avatar}</div>
        <div className={styles.cardContent}>
            <div className={styles.cardHeader}>
                <div>
                    <h3>{game.name}</h3>
                    <p>{game.category}</p>
                </div>
                <div className={styles.cardRating}>
                    <Star size={16} fill="currentColor" />
                    <span>{game.rating}</span>
                </div>
            </div>
            <div className={styles.cardTag}>{game.tag}</div>
            <div className={styles.cardStats}>
                <div className={styles.statItem}><p>{game.difficulty}</p><p>Complexity</p></div>
                <div className={styles.statItem}><p>{game.players}</p><p>Players</p></div>
                <div className={styles.statItem}><p>{game.time}</p><p>Time</p></div>
            </div>
            <Link to={`/lobby/${game.gameType}`} className={styles.cardButton}>
                ▷ Play now
            </Link>
        </div>
    </div>
);

const HomePage: React.FC = () => {
    const [categoryFilter, setCategoryFilter] = useState('All games');

    const filteredGames = useMemo(() => {
        if (categoryFilter === 'All games') return gamesData;
        return gamesData.filter(game => game.category === categoryFilter);
    }, [categoryFilter]);

    return (
        <div>
            <div className={styles.pageHeader}>
                <h1>Games</h1>
                <p>Select a game and start playing!</p>
            </div>
            
            <div className={styles.filtersContainer}>
                <div className={styles.filterGroup}>
                    <span>Categories:</span>
                    <div className={styles.filterButtons}>
                        <button onClick={() => setCategoryFilter('All games')} className={`${styles.filterButton} ${categoryFilter === 'All games' ? styles.active : ''}`}>All games</button>
                        <button onClick={() => setCategoryFilter('Strategy')} className={`${styles.filterButton} ${categoryFilter === 'Strategy' ? styles.active : ''}`}>Strategy</button>
                        <button onClick={() => setCategoryFilter('Casual')} className={`${styles.filterButton} ${categoryFilter === 'Casual' ? styles.active : ''}`}>Casual</button>
                    </div>
                </div>
            </div>

            <div className={styles.gameGrid}>
                {filteredGames.map(game => (
                    <GameCard key={game.gameType} game={game} />
                ))}
            </div>
        </div>
    );
};

export default HomePage;