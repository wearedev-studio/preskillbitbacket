import axios from 'axios';
import { Tournament } from './tournamentService';

import { API_URL } from '../api/index';

interface TournamentCreationData {
    name: string;
    gameType: string;
    entryFee: number;
    maxPlayers: number;
}

export const createTournament = async (tournamentData: TournamentCreationData): Promise<Tournament> => {
    const { data } = await axios.post(`${API_URL}/api/admin/tournaments`, tournamentData);
    return data;
};

export const createLobbyRoom = async (roomData: { gameType: string, bet: number }) => {
    const { data } = await axios.post(`${API_URL}/api/admin/create-room`, roomData);
    return data;
}
