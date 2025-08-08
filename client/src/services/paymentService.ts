import axios from 'axios';
import { API_URL } from '../api/index';

export interface CreateDepositRequest {
    amount: number;
}

export interface CreateDepositResponse {
    success: boolean;
    paymentId: string;
    paymentUrl: string;
    orderId: string;
    amount: number;
    currency: string;
}

export interface CreateWithdrawalRequest {
    amount: number;
    recipientDetails: {
        cardNumber?: string;
        bankAccount?: string;
        walletAddress?: string;
        method: 'card' | 'bank' | 'wallet';
    };
}

export interface CreateWithdrawalResponse {
    success: boolean;
    withdrawalId: string;
    orderId: string;
    amount: number;
    currency: string;
    status: string;
}

export interface PaymentStatus {
    orderId: string;
    paymentId: string;
    type: 'DEPOSIT' | 'WITHDRAWAL';
    amount: number;
    currency: string;
    status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
    createdAt: string;
    completedAt?: string;
}

export interface PaymentHistory {
    payments: PaymentStatus[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
    };
}

class PaymentService {
    async createDeposit(request: CreateDepositRequest): Promise<CreateDepositResponse> {
        const response = await axios.post(`${API_URL}/api/payments/deposit`, request);
        return response.data;
    }

    async createWithdrawal(request: CreateWithdrawalRequest): Promise<CreateWithdrawalResponse> {
        const response = await axios.post(`${API_URL}/api/payments/withdrawal`, request);
        return response.data;
    }

    async getPaymentStatus(paymentId: string): Promise<PaymentStatus> {
        const response = await axios.get(`${API_URL}/api/payments/status/${paymentId}`);
        return response.data;
    }

    async getPaymentHistory(page: number = 1, limit: number = 20, type?: 'DEPOSIT' | 'WITHDRAWAL'): Promise<PaymentHistory> {
        const params = new URLSearchParams({
            page: page.toString(),
            limit: limit.toString()
        });
        
        if (type) {
            params.append('type', type);
        }

        const response = await axios.get(`${API_URL}/api/payments/history?${params}`);
        return response.data;
    }

    openPaymentWindow(paymentUrl: string): Window | null {
        const width = 600;
        const height = 700;
        const left = (window.screen.width / 2) - (width / 2);
        const top = (window.screen.height / 2) - (height / 2);

        return window.open(
            paymentUrl,
            'payment',
            `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
        );
    }

    async pollPaymentStatus(paymentId: string, onStatusChange: (status: PaymentStatus) => void, maxAttempts: number = 60): Promise<void> {
        let attempts = 0;
        
        const poll = async () => {
            try {
                const status = await this.getPaymentStatus(paymentId);
                onStatusChange(status);
                
                if (status.status === 'COMPLETED' || status.status === 'FAILED' || status.status === 'CANCELLED') {
                    return; // Stop polling
                }
                
                attempts++;
                if (attempts < maxAttempts) {
                    setTimeout(poll, 3000); // Poll every 3 seconds
                }
            } catch (error) {
                console.error('Error polling payment status:', error);
                attempts++;
                if (attempts < maxAttempts) {
                    setTimeout(poll, 5000); // Retry after 5 seconds on error
                }
            }
        };

        poll();
    }
}

export const paymentService = new PaymentService();