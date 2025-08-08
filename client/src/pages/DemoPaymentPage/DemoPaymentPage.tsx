import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import styles from './DemoPaymentPage.module.css';
import { CheckCircle, XCircle, Clock } from 'lucide-react';

const DemoPaymentPage: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [status, setStatus] = useState<'processing' | 'success' | 'failed'>('processing');
    const [countdown, setCountdown] = useState(10);

    const paymentId = searchParams.get('paymentId');
    const amount = searchParams.get('amount');
    const orderId = searchParams.get('orderId');

    useEffect(() => {
        if (!paymentId || !amount || !orderId) {
            navigate('/profile');
            return;
        }

        // Simulate payment processing
        const timer = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    // Simulate 90% success rate
                    setStatus(Math.random() > 0.1 ? 'success' : 'failed');
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [paymentId, amount, orderId, navigate]);

    const handleReturn = () => {
        navigate('/profile');
    };

    const handleRetry = () => {
        setStatus('processing');
        setCountdown(10);
        
        const timer = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    setStatus(Math.random() > 0.1 ? 'success' : 'failed');
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    const getStatusIcon = () => {
        switch (status) {
            case 'processing':
                return <Clock className={styles.iconProcessing} />;
            case 'success':
                return <CheckCircle className={styles.iconSuccess} />;
            case 'failed':
                return <XCircle className={styles.iconFailed} />;
        }
    };

    const getStatusMessage = () => {
        switch (status) {
            case 'processing':
                return {
                    title: 'Processing Payment',
                    message: `Your payment is being processed. Please wait ${countdown} seconds...`,
                    description: 'Do not close this window or navigate away.'
                };
            case 'success':
                return {
                    title: 'Payment Successful!',
                    message: `Your deposit of $${amount} has been processed successfully.`,
                    description: 'Your account balance will be updated shortly.'
                };
            case 'failed':
                return {
                    title: 'Payment Failed',
                    message: `Your payment of $${amount} could not be processed.`,
                    description: 'Please try again or contact support if the problem persists.'
                };
        }
    };

    const statusInfo = getStatusMessage();

    return (
        <div className={styles.container}>
            <div className={styles.paymentCard}>
                <div className={styles.statusIcon}>
                    {getStatusIcon()}
                </div>
                
                <div className={styles.content}>
                    <h1 className={styles.title}>{statusInfo.title}</h1>
                    <p className={styles.message}>{statusInfo.message}</p>
                    <p className={styles.description}>{statusInfo.description}</p>
                    
                    <div className={styles.details}>
                        <div className={styles.detailRow}>
                            <span className={styles.detailLabel}>Amount:</span>
                            <span className={styles.detailValue}>${amount}</span>
                        </div>
                        <div className={styles.detailRow}>
                            <span className={styles.detailLabel}>Payment ID:</span>
                            <span className={styles.detailValue}>{paymentId}</span>
                        </div>
                        <div className={styles.detailRow}>
                            <span className={styles.detailLabel}>Order ID:</span>
                            <span className={styles.detailValue}>{orderId}</span>
                        </div>
                    </div>
                    
                    {status === 'processing' && (
                        <div className={styles.progressBar}>
                            <div 
                                className={styles.progressFill}
                                style={{ width: `${((10 - countdown) / 10) * 100}%` }}
                            />
                        </div>
                    )}
                    
                    <div className={styles.actions}>
                        {status === 'processing' ? (
                            <div className={styles.processingText}>
                                Processing... {countdown}s
                            </div>
                        ) : (
                            <>
                                <button 
                                    onClick={handleReturn}
                                    className={`${styles.button} ${styles.buttonPrimary}`}
                                >
                                    Return to Profile
                                </button>
                                
                                {status === 'failed' && (
                                    <button 
                                        onClick={handleRetry}
                                        className={`${styles.button} ${styles.buttonSecondary}`}
                                    >
                                        Try Again
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
            
            <div className={styles.demoNotice}>
                <h4>Demo Mode</h4>
                <p>This is a demonstration of the payment process. In production, this would redirect to the actual G2Pay payment gateway.</p>
            </div>
        </div>
    );
};

export default DemoPaymentPage;