import React, { useState } from 'react';
import { paymentService, CreateWithdrawalRequest } from '../../services/paymentService';
import styles from './WithdrawModal.module.css';
import { X, Banknote } from 'lucide-react';

interface WithdrawModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (amount: number) => void;
    currentBalance: number;
}

const WithdrawModal: React.FC<WithdrawModalProps> = ({ 
    isOpen, 
    onClose, 
    onSuccess, 
    currentBalance 
}) => {
    const [amount, setAmount] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('');
    const [accountDetails, setAccountDetails] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const paymentMethods = [
        { value: 'bank', label: 'Bank Transfer' },
        { value: 'card', label: 'Credit/Debit Card' },
        { value: 'wallet', label: 'E-Wallet (PayPal, Skrill, etc.)' }
    ];

    const predefinedAmounts = [10, 25, 50, 100, 250, 500].filter(value => value <= currentBalance);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        
        const numericAmount = Number(amount);
        if (isNaN(numericAmount) || numericAmount <= 0) {
            setError('Please enter a valid amount');
            return;
        }

        if (numericAmount < 5) {
            setError('Minimum withdrawal amount is $5');
            return;
        }

        if (numericAmount > currentBalance) {
            setError('Insufficient balance');
            return;
        }

        if (numericAmount > 5000) {
            setError('Maximum withdrawal amount is $5,000');
            return;
        }

        if (!paymentMethod) {
            setError('Please select a payment method');
            return;
        }

        if (!accountDetails.trim()) {
            setError('Please provide account details');
            return;
        }

        setIsLoading(true);

        try {
            const request: CreateWithdrawalRequest = {
                amount: numericAmount,
                recipientDetails: {
                    method: paymentMethod as 'card' | 'bank' | 'wallet',
                    ...(paymentMethod === 'card' && { cardNumber: accountDetails.trim() }),
                    ...(paymentMethod === 'bank' && { bankAccount: accountDetails.trim() }),
                    ...(paymentMethod === 'wallet' && { walletAddress: accountDetails.trim() })
                }
            };

            await paymentService.createWithdrawal(request);
            onSuccess(numericAmount);
            onClose();
            
            // Reset form
            setAmount('');
            setPaymentMethod('');
            setAccountDetails('');
        } catch (error: any) {
            setError(error.response?.data?.message || 'Failed to create withdrawal request');
        } finally {
            setIsLoading(false);
        }
    };

    const handlePredefinedAmount = (value: number) => {
        setAmount(value.toString());
    };

    const getAccountDetailsPlaceholder = () => {
        switch (paymentMethod) {
            case 'bank':
                return 'Bank account number and routing number';
            case 'card':
                return 'Card number (last 4 digits for verification)';
            case 'wallet':
                return 'E-wallet address or email (PayPal, Skrill, Neteller, etc.)';
            default:
                return 'Account details';
        }
    };

    if (!isOpen) return null;

    return (
        <div className={styles.overlay}>
            <div className={styles.modal}>
                <div className={styles.header}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <Banknote />
                        <h2>Withdraw Funds</h2>
                    </div>
                    <button onClick={onClose} className={styles.closeButton} disabled={isLoading}>
                        <X />
                    </button>
                </div>

                <div className={styles.content}>
                    <div className={styles.balanceInfo}>
                        <span>Available Balance: <strong>${currentBalance.toFixed(2)}</strong></span>
                    </div>

                    <p className={styles.description}>
                        Request a withdrawal from your gaming account. Withdrawals are processed within 1-3 business days.
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
                                min="5"
                                max={Math.min(currentBalance, 5000)}
                                step="0.01"
                                required
                                disabled={isLoading}
                            />
                        </div>

                        {predefinedAmounts.length > 0 && (
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
                        )}

                        <div className={styles.formGroup}>
                            <label className={styles.formLabel}>Payment Method</label>
                            <select
                                value={paymentMethod}
                                onChange={(e) => setPaymentMethod(e.target.value)}
                                className={styles.formSelect}
                                required
                                disabled={isLoading}
                            >
                                <option value="">Select payment method</option>
                                {paymentMethods.map((method) => (
                                    <option key={method.value} value={method.value}>
                                        {method.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.formLabel}>Account Details</label>
                            <textarea
                                value={accountDetails}
                                onChange={(e) => setAccountDetails(e.target.value)}
                                className={styles.formTextarea}
                                placeholder={getAccountDetailsPlaceholder()}
                                rows={3}
                                required
                                disabled={isLoading}
                            />
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
                                disabled={isLoading || !amount || !paymentMethod || !accountDetails.trim()}
                            >
                                {isLoading ? 'Processing...' : `Withdraw $${amount || '0'}`}
                            </button>
                        </div>
                    </form>

                    <div className={styles.info}>
                        <h4>Withdrawal Information:</h4>
                        <ul>
                            <li>Processing time: 1-3 business days</li>
                            <li>Minimum withdrawal: $5</li>
                            <li>Maximum withdrawal: $5,000</li>
                            <li>Withdrawal fees may apply depending on payment method</li>
                            <li>Identity verification may be required for large withdrawals</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WithdrawModal;