import React from 'react';
import styles from './PaymentStatusModal.module.css';

interface PaymentStatusModalProps {
    isOpen: boolean;
    onClose: () => void;
    status: 'success' | 'error' | 'loading';
    title: string;
    message: string;
    amount?: number;
    operation?: 'deposit' | 'withdraw';
}

const PaymentStatusModal: React.FC<PaymentStatusModalProps> = ({
    isOpen,
    onClose,
    status,
    title,
    message,
    amount,
    operation
}) => {
    if (!isOpen) return null;

    const getStatusIcon = () => {
        switch (status) {
            case 'success':
                return '✅';
            case 'error':
                return '❌';
            case 'loading':
                return '⏳';
            default:
                return '💰';
        }
    };

    const getStatusClass = () => {
        switch (status) {
            case 'success':
                return styles.success;
            case 'error':
                return styles.error;
            case 'loading':
                return styles.loading;
            default:
                return '';
        }
    };

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={`${styles.modal} ${getStatusClass()}`} onClick={(e) => e.stopPropagation()}>
                <div className={styles.header}>
                    <span className={styles.icon}>{getStatusIcon()}</span>
                    <h2 className={styles.title}>{title}</h2>
                </div>
                
                <div className={styles.content}>
                    <p className={styles.message}>{message}</p>
                    
                    {amount && operation && status === 'success' && (
                        <div className={styles.amountInfo}>
                            <div className={styles.operationType}>
                                {operation === 'deposit' ? '💰 Deposit' : '💸 Withdrawal'}
                            </div>
                            <div className={styles.amount}>
                                {operation === 'deposit' ? '+' : '-'}${amount.toFixed(2)}
                            </div>
                        </div>
                    )}
                </div>

                {status !== 'loading' && (
                    <div className={styles.actions}>
                        <button 
                            onClick={onClose} 
                            className={styles.closeButton}
                        >
                            Close
                        </button>
                    </div>
                )}

                {status === 'loading' && (
                    <div className={styles.loadingSpinner}>
                        <div className={styles.spinner}></div>
                        <p>Processing payment...</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PaymentStatusModal;