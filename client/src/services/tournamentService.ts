import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

export interface TournamentPlayer {
    _id: string;
    username: string;
    socketId?: string;
    isBot: boolean;
    registeredAt: Date;
}

export interface TournamentMatch {
    matchId: string;
    player1: TournamentPlayer;
    player2: TournamentPlayer;
    winner?: TournamentPlayer;
    status: 'WAITING' | 'PENDING' | 'ACTIVE' | 'FINISHED';
}

export interface TournamentRound {
    round: number;
    matches: TournamentMatch[];
}

export interface Tournament {
    _id: string;
    name: string;
    gameType: 'tic-tac-toe' | 'checkers' | 'chess' | 'backgammon';
    status: 'WAITING' | 'ACTIVE' | 'FINISHED' | 'CANCELLED';
    entryFee: number;
    prizePool: number;
    maxPlayers: number;
    players: TournamentPlayer[];
    bracket: TournamentRound[];
    platformCommission: number;
    firstRegistrationTime?: Date;
    startedAt?: Date;
    finishedAt?: Date;
    winner?: TournamentPlayer;
    createdAt: Date;
    updatedAt: Date;
}

export interface CreateTournamentRequest {
    name: string;
    gameType: string;
    maxPlayers: number;
    entryFee: number;
    platformCommission?: number;
}

export interface TournamentStats {
    byGameType: Array<{
        _id: string;
        total: number;
        active: number;
        finished: number;
        totalPrizePool: number;
    }>;
    overall: {
        totalTournaments: number;
        totalPrizePool: number;
        activeTournaments: number;
    };
}

export interface TournamentHistory {
    tournaments: Tournament[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
    };
}

class TournamentService {
    private token: string | null = null;

    constructor() {
        this.token = localStorage.getItem('token');
    }

    private getAuthHeaders() {
        return {
            headers: {
                Authorization: `Bearer ${this.token}`,
                'Content-Type': 'application/json'
            }
        };
    }

    private updateToken() {
        this.token = localStorage.getItem('token');
    }

    async getActiveTournaments(): Promise<Tournament[]> {
        try {
            this.updateToken();
            const response = await axios.get(`${API_BASE_URL}/api/tournaments`, this.getAuthHeaders());
            return response.data;
        } catch (error) {
            console.error('Error fetching tournaments:', error);
            throw new Error('Error fetching tournaments list');
        }
    }

    async getAllTournaments(): Promise<Tournament[]> {
        try {
            this.updateToken();
            const response = await axios.get(`${API_BASE_URL}/api/tournaments/all`, this.getAuthHeaders());
            return response.data;
        } catch (error) {
            console.error('Error fetching all tournaments:', error);
            throw new Error('Error fetching all tournaments list');
        }
    }

    async getTournamentById(tournamentId: string): Promise<Tournament> {
        try {
            this.updateToken();
            const response = await axios.get(`${API_BASE_URL}/api/tournaments/${tournamentId}`, this.getAuthHeaders());
            return response.data;
        } catch (error) {
            console.error('Error fetching tournament:', error);
            throw new Error('Error fetching tournament');
        }
    }

    async createTournament(tournamentData: CreateTournamentRequest): Promise<Tournament> {
        try {
            this.updateToken();
            const response = await axios.post(
                `${API_BASE_URL}/api/tournaments`,
                tournamentData,
                this.getAuthHeaders()
            );
            return response.data.tournament;
        } catch (error: any) {
            console.error('Error creating tournament:', error);
            const message = error.response?.data?.message || 'Error creating tournament';
            throw new Error(message);
        }
    }

    async registerInTournament(tournamentId: string, socketId?: string): Promise<{ message: string }> {
        try {
            this.updateToken();
            const headers = {
                ...this.getAuthHeaders().headers,
                'x-socket-id': socketId || 'offline'
            };
            
            const response = await axios.post(
                `${API_BASE_URL}/api/tournaments/${tournamentId}/register`,
                {},
                { headers }
            );
            return response.data;
        } catch (error: any) {
            console.error('Error registering in tournament:', error);
            const message = error.response?.data?.message || 'Error registering in tournament';
            throw new Error(message);
        }
    }

    async unregisterFromTournament(tournamentId: string): Promise<{ message: string }> {
        try {
            this.updateToken();
            const response = await axios.delete(
                `${API_BASE_URL}/api/tournaments/${tournamentId}/register`,
                this.getAuthHeaders()
            );
            return response.data;
        } catch (error: any) {
            console.error('Error unregistering from tournament:', error);
            const message = error.response?.data?.message || 'Error cancelling registration';
            throw new Error(message);
        }
    }

    async getPlayerTournaments(): Promise<Tournament[]> {
        try {
            this.updateToken();
            const response = await axios.get(`${API_BASE_URL}/api/tournaments/player`, this.getAuthHeaders());
            return response.data;
        } catch (error) {
            console.error('Error fetching player tournaments:', error);
            throw new Error('Error fetching player tournaments');
        }
    }

    async getTournamentHistory(
        page: number = 1,
        limit: number = 10,
        gameType: string = 'all'
    ): Promise<TournamentHistory> {
        try {
            this.updateToken();
            const params = new URLSearchParams({
                page: page.toString(),
                limit: limit.toString(),
                ...(gameType !== 'all' && { gameType })
            });

            const response = await axios.get(
                `${API_BASE_URL}/api/tournaments/history?${params}`,
                this.getAuthHeaders()
            );
            return response.data;
        } catch (error) {
            console.error('Error fetching tournament history:', error);
            throw new Error('Error fetching tournament history');
        }
    }

    async getTournamentStats(): Promise<TournamentStats> {
        try {
            this.updateToken();
            const response = await axios.get(`${API_BASE_URL}/api/tournaments/stats`, this.getAuthHeaders());
            return response.data;
        } catch (error) {
            console.error('Error fetching tournament stats:', error);
            throw new Error('Error fetching tournament statistics');
        }
    }

    isPlayerRegistered(tournament: Tournament, playerId: string): boolean {
        return tournament.players.some(player => player._id === playerId);
    }

    getAvailableSpots(tournament: Tournament): number {
        return tournament.maxPlayers - tournament.players.length;
    }

    canPlayerRegister(tournament: Tournament, playerId: string): boolean {
        return (
            tournament.status === 'WAITING' &&
            !this.isPlayerRegistered(tournament, playerId) &&
            this.getAvailableSpots(tournament) > 0
        );
    }

    getCurrentRound(tournament: Tournament): TournamentRound | null {
        if (tournament.status !== 'ACTIVE' || tournament.bracket.length === 0) {
            return null;
        }

        for (const round of tournament.bracket) {
            const hasActiveMatches = round.matches.some(match => 
                match.status === 'ACTIVE' || match.status === 'PENDING'
            );
            if (hasActiveMatches) {
                return round;
            }
        }

        return tournament.bracket[tournament.bracket.length - 1];
    }

    getPlayerCurrentMatch(tournament: Tournament, playerId: string): TournamentMatch | null {
        const currentRound = this.getCurrentRound(tournament);
        if (!currentRound) return null;

        return currentRound.matches.find(match => 
            match.player1._id === playerId || match.player2._id === playerId
        ) || null;
    }

    formatRoundName(roundNumber: number, totalRounds: number): string {
        if (roundNumber === totalRounds) return 'Final';
        if (roundNumber === totalRounds - 1) return 'Semifinal';
        if (roundNumber === totalRounds - 2) return 'Quarterfinal';
        return `Round ${roundNumber}`;
    }

    getTimeUntilStart(tournament: Tournament): number {
        if (!tournament.firstRegistrationTime || tournament.status !== 'WAITING') {
            return 0;
        }

        const startTime = new Date(tournament.firstRegistrationTime).getTime() + 15000; // +15 seconds
        const now = Date.now();
        return Math.max(0, startTime - now);
    }

    isStartingSoon(tournament: Tournament): boolean {
        return this.getTimeUntilStart(tournament) > 0;
    }

    getFilledPercentage(tournament: Tournament): number {
        return Math.round((tournament.players.length / tournament.maxPlayers) * 100);
    }

    getPlayerPrizePlace(tournament: Tournament, playerId: string): number | null {
        if (tournament.status !== 'FINISHED' || !tournament.winner) {
            return null;
        }

        if (tournament.winner._id === playerId) {
            return 1;
        }

        const finalRound = tournament.bracket[tournament.bracket.length - 1];
        if (finalRound && finalRound.matches.length > 0) {
            const finalMatch = finalRound.matches[0];
            const finalist = finalMatch.player1._id === tournament.winner._id 
                ? finalMatch.player2 
                : finalMatch.player1;
            
            if (finalist._id === playerId) {
                return 2;
            }
        }

        const semiFinalRound = tournament.bracket[tournament.bracket.length - 2];
        if (semiFinalRound) {
            for (const match of semiFinalRound.matches) {
                if (match.winner) {
                    const loser = match.winner._id === match.player1._id 
                        ? match.player2 
                        : match.player1;
                    
                    if (loser._id === playerId) {
                        return 3;
                    }
                }
            }
        }

        return null;
    }
}

export const tournamentService = new TournamentService();
export default tournamentService;