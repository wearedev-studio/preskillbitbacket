import React, { useState, useEffect } from 'react';
import { paymentService, PaymentStatus } from '../../services/paymentService';
import styles from './PaymentHistory.module.css';
import { Clock, CheckCircle, XCircle, AlertCircle, CreditCard, Banknote } from 'lucide-react';

interface PaymentHistoryProps {
    userId?: string;
}

const PaymentHistory: React.FC<PaymentHistoryProps> = ({ userId }) => {
    const [payments, setPayments] = useState<PaymentStatus[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const loadPayments = async (page: number = 1) => {
        setIsLoading(true);
        setError('');

        try {
            const response = await paymentService.getPaymentHistory(page, 10);
            setPayments(response.payments);
            setTotalPages(response.pagination.pages);
            setCurrentPage(page);
        } catch (error: any) {
            setError(error.response?.data?.message || 'Failed to load payment history');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadPayments();
    }, []);

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'COMPLETED':
                return <CheckCircle className={styles.statusIconCompleted} />;
            case 'PENDING':
                return <Clock className={styles.statusIconPending} />;
            case 'FAILED':
                return <XCircle className={styles.statusIconFailed} />;
            case 'CANCELLED':
                return <AlertCircle className={styles.statusIconCancelled} />;
            default:
                return <Clock className={styles.statusIconPending} />;
        }
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case 'COMPLETED':
                return 'Completed';
            case 'PENDING':
                return 'Pending';
            case 'FAILED':
                return 'Failed';
            case 'CANCELLED':
                return 'Cancelled';
            default:
                return status;
        }
    };

    const getTypeIcon = (type: string) => {
        return type === 'DEPOSIT' ? 
            <CreditCard className={styles.typeIcon} /> : 
            <Banknote className={styles.typeIcon} />;
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const formatAmount = (amount: number, type: string) => {
        const sign = type === 'DEPOSIT' ? '+' : '-';
        return `${sign}$${amount.toFixed(2)}`;
    };

    const handlePageChange = (page: number) => {
        if (page >= 1 && page <= totalPages && page !== currentPage) {
            loadPayments(page);
        }
    };

    if (isLoading && payments.length === 0) {
        return (
            <div className={styles.container}>
                <div className={styles.loading}>
                    <div className={styles.spinner}></div>
                    <span>Loading payment history...</span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className={styles.container}>
                <div className={styles.error}>
                    <XCircle />
                    <span>{error}</span>
                    <button onClick={() => loadPayments()} className={styles.retryButton}>
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h3>Payment History</h3>
                <button onClick={() => loadPayments(currentPage)} className={styles.refreshButton}>
                    Refresh
                </button>
            </div>

            {payments.length === 0 ? (
                <div className={styles.emptyState}>
                    <CreditCard className={styles.emptyIcon} />
                    <h4>No payments found</h4>
                    <p>Your payment history will appear here once you make your first transaction.</p>
                </div>
            ) : (
                <>
                    <div className={styles.paymentsList}>
                        {payments.map((payment) => (
                            <div key={payment.orderId} className={styles.paymentItem}>
                                <div className={styles.paymentIcon}>
                                    {getTypeIcon(payment.type)}
                                </div>
                                
                                <div className={styles.paymentDetails}>
                                    <div className={styles.paymentHeader}>
                                        <span className={styles.paymentType}>
                                            {payment.type === 'DEPOSIT' ? 'Deposit' : 'Withdrawal'}
                                        </span>
                                        <span className={`${styles.paymentAmount} ${
                                            payment.type === 'DEPOSIT' ? styles.positive : styles.negative
                                        }`}>
                                            {formatAmount(payment.amount, payment.type)}
                                        </span>
                                    </div>
                                    
                                    <div className={styles.paymentMeta}>
                                        <span className={styles.paymentDate}>
                                            {formatDate(payment.createdAt)}
                                        </span>
                                        <span className={styles.paymentId}>
                                            ID: {payment.orderId}
                                        </span>
                                    </div>
                                </div>
                                
                                <div className={styles.paymentStatus}>
                                    {getStatusIcon(payment.status)}
                                    <span className={`${styles.statusText} ${styles[`status${payment.status}`]}`}>
                                        {getStatusText(payment.status)}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>

                    {totalPages > 1 && (
                        <div className={styles.pagination}>
                            <button
                                onClick={() => handlePageChange(currentPage - 1)}
                                disabled={currentPage === 1}
                                className={styles.paginationButton}
                            >
                                Previous
                            </button>
                            
                            <div className={styles.paginationInfo}>
                                <span>Page {currentPage} of {totalPages}</span>
                            </div>
                            
                            <button
                                onClick={() => handlePageChange(currentPage + 1)}
                                disabled={currentPage === totalPages}
                                className={styles.paginationButton}
                            >
                                Next
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default PaymentHistory;