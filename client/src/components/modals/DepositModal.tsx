import React, { useState } from 'react';
import { paymentService, CreateDepositRequest } from '../../services/paymentService';
import styles from './DepositModal.module.css';
import { X, CreditCard } from 'lucide-react';

interface DepositModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (amount: number) => void;
}

const DepositModal: React.FC<DepositModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const [amount, setAmount] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const predefinedAmounts = [10, 25, 50, 100, 250, 500];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        
        const numericAmount = Number(amount);
        if (isNaN(numericAmount) || numericAmount <= 0) {
            setError('Please enter a valid amount');
            return;
        }

        if (numericAmount < 1) {
            setError('Minimum deposit amount is $1');
            return;
        }

        if (numericAmount > 10000) {
            setError('Maximum deposit amount is $10,000');
            return;
        }

        setIsLoading(true);

        try {
            const request: CreateDepositRequest = { amount: numericAmount };
            const response = await paymentService.createDeposit(request);

            // Open payment window
            const paymentWindow = paymentService.openPaymentWindow(response.paymentUrl);
            
            if (!paymentWindow) {
                setError('Please allow popups to complete the payment');
                setIsLoading(false);
                return;
            }

            // Start polling for payment status
            paymentService.pollPaymentStatus(response.paymentId, (status) => {
                if (status.status === 'COMPLETED') {
                    paymentWindow.close();
                    onSuccess(numericAmount);
                    onClose();
                } else if (status.status === 'FAILED' || status.status === 'CANCELLED') {
                    paymentWindow.close();
                    setError('Payment was cancelled or failed');
                    setIsLoading(false);
                }
            });

            // Monitor window close
            const checkClosed = setInterval(() => {
                if (paymentWindow.closed) {
                    clearInterval(checkClosed);
                    setIsLoading(false);
                }
            }, 1000);

        } catch (error: any) {
            setError(error.response?.data?.message || 'Failed to create deposit');
            setIsLoading(false);
        }
    };

    const handlePredefinedAmount = (value: number) => {
        setAmount(value.toString());
    };

    if (!isOpen) return null;

    return (
        <div className={styles.overlay}>
            <div className={styles.modal}>
                <div className={styles.header}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <CreditCard />
                        <h2>Deposit Funds</h2>
                    </div>
                    <button onClick={onClose} className={styles.closeButton} disabled={isLoading}>
                        <X />
                    </button>
                </div>

                <div className={styles.content}>
                    <p className={styles.description}>
                        Add funds to your gaming account using our secure payment gateway.
                    </p>

                    <form onSubmit={handleSubmit} className={styles.form}>
                        <div className={styles.formGroup}>
                            <label className={styles.formLabel}>Amount (USD)</label>
                            <input
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className={styles.formInput}
                                placeholder="Enter amount"
                                min="1"
                                max="10000"
                                step="0.01"
                                required
                                disabled={isLoading}
                            />
                        </div>

                        <div className={styles.predefinedAmounts}>
                            <label className={styles.formLabel}>Quick amounts:</label>
                            <div className={styles.amountButtons}>
                                {predefinedAmounts.map((value) => (
                                    <button
                                        key={value}
                                        type="button"
                                        onClick={() => handlePredefinedAmount(value)}
                                        className={`${styles.amountButton} ${amount === value.toString() ? styles.selected : ''}`}
                                        disabled={isLoading}
                                    >
                                        ${value}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {error && (
                            <div className={styles.error}>
                                {error}
                            </div>
                        )}

                        <div className={styles.actions}>
                            <button
                                type="button"
                                onClick={onClose}
                                className={styles.cancelButton}
                                disabled={isLoading}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className={styles.submitButton}
                                disabled={isLoading || !amount}
                            >
                                {isLoading ? 'Processing...' : `Deposit $${amount || '0'}`}
                            </button>
                        </div>
                    </form>

                    <div className={styles.info}>
                        <h4>Payment Information:</h4>
                        <ul>
                            <li>Secure payment processing via G2Pay</li>
                            <li>Funds are added instantly upon successful payment</li>
                            <li>Minimum deposit: $1</li>
                            <li>Maximum deposit: $10,000</li>
                            <li>Supported payment methods: Cards, Bank transfers, E-wallets</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DepositModal;