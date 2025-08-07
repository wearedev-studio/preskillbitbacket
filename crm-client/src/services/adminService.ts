import axios from 'axios';
import { API_URL } from '../api';

export interface IUpdateUserData {
    username?: string;
    email?: string;
    role?: 'USER' | 'ADMIN';
    balance?: number;
}

export interface ITransaction {
    _id: string;
    user: {
        _id: string;
        username: string;
    };
    type: string;
    status: string;
    amount: number;
    createdAt: string;
}

export interface IGameRecord {
    _id: string;
    user: {
        _id: string;
        username: string;
    };
    gameName: string;
    opponent: string;
    status: 'WON' | 'LOST' | 'DRAW';
    amountChanged: number;
    createdAt: string;
}

export interface IActiveRoom {
    id: string;
    gameType: string;
    bet: number;
    players: string[];
}

export interface ITournament {
    _id: string;
    name: string;
    gameType: string;
    status: string;
    players: any[];
    maxPlayers: number;
    entryFee: number;
    startTime: string;
}

export interface IUpdateTournamentData {
    name?: string;
    gameType?: string;
    entryFee?: number;
    maxPlayers?: number;
    startTime?: string;
}

export interface ICreateTournamentData {
    name: string;
    gameType: string;
    entryFee: number;
    maxPlayers: number;
    startTime: string;
}

export interface IKycSubmission {
    _id: string;
    username: string;
    email: string;
    kycStatus: string;
    kycDocuments: {
        documentType: string;
        filePath: string;
        submittedAt: string;
    }[];
}

export const getAdminUsers = async () => {
    const { data } = await axios.get(`${API_URL}/api/admin/users`);
    return data;
};

export const getAdminGameRecords = async (): Promise<IGameRecord[]> => {
    const { data } = await axios.get(`${API_URL}/api/admin/games`);
    return data;
};

export const updateUser = async (userId: string, userData: IUpdateUserData) => {
    const { data } = await axios.put(`${API_URL}/api/admin/users/${userId}`, userData);
    return data;
};

export const deleteUser = async (userId: string) => {
    const { data } = await axios.delete(`${API_URL}/api/admin/users/${userId}`);
    return data;
};

export const getAdminTransactions = async (): Promise<ITransaction[]> => {
    const { data } = await axios.get(`${API_URL}/api/admin/transactions`);
    return data;
};

export const getAdminActiveRooms = async (): Promise<IActiveRoom[]> => {
    const { data } = await axios.get(`${API_URL}/api/admin/rooms`);
    return data;
};

export const createAdminRoom = async (roomData: { gameType: string, bet: number }): Promise<any> => {
    const { data } = await axios.post(`${API_URL}/api/admin/create-room`, roomData);
    return data;
};

export const deleteAdminRoom = async (roomId: string): Promise<{ message: string }> => {
    const { data } = await axios.delete(`${API_URL}/api/admin/rooms/${roomId}`);
    return data;
};

export const getAdminTournaments = async (): Promise<ITournament[]> => {
    const { data } = await axios.get(`${API_URL}/api/tournaments`);
    return data;
};

export const createAdminTournament = async (tournamentData: ICreateTournamentData): Promise<ITournament> => {
    const { data } = await axios.post(`${API_URL}/api/admin/tournaments`, tournamentData);
    return data;
};

export const updateAdminTournament = async (tournamentId: string, tournamentData: IUpdateTournamentData): Promise<ITournament> => {
    const { data } = await axios.put(`${API_URL}/api/admin/tournaments/${tournamentId}`, tournamentData);
    return data;
};

export const deleteAdminTournament = async (tournamentId: string): Promise<{ message: string }> => {
    const { data } = await axios.delete(`${API_URL}/api/admin/tournaments/${tournamentId}`);
    return data;
};

export const getKycSubmissions = async (status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL'): Promise<IKycSubmission[]> => {
    const params = status === 'ALL' ? {} : { status };
    const { data } = await axios.get(`${API_URL}/api/admin/kyc-submissions`, { params });
    return data;
};

export const reviewKycSubmission = async (userId: string, action: 'APPROVE' | 'REJECT', reason?: string) => {
    const { data } = await axios.post(`${API_URL}/api/admin/kyc-submissions/${userId}/review`, { action, reason });
    return data;
};

export const getKycDocumentFile = async (userId: string, fileName: string): Promise<Blob> => {
    const token = localStorage.getItem('crm_token');

    const config = {
        headers: {
            'Authorization': `Bearer ${token}`
        },
        responseType: 'blob' as 'blob',
    };

    const response = await axios.get(`${API_URL}/api/admin/kyc-document/${userId}/${fileName}`, config);
    return response.data;
};