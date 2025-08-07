import React, { useState, useEffect, useCallback } from 'react';
import { getKycSubmissions, reviewKycSubmission, getKycDocumentFile, type IKycSubmission } from '../../services/adminService';
import styles from './KYCPage.module.css';

type KycFilter = 'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL';

const KYCPage: React.FC = () => {
    const [submissions, setSubmissions] = useState<IKycSubmission[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewingDoc, setViewingDoc] = useState<string | null>(null);
    const [filter, setFilter] = useState<KycFilter>('PENDING');

    const fetchSubmissions = useCallback(async () => {
        try {
            setLoading(true);
            const data = await getKycSubmissions(filter);
            setSubmissions(data);
        } catch (error) {
            console.error("Failed to fetch KYC submissions", error);
        } finally {
            setLoading(false);
        }
    }, [filter]);

    useEffect(() => {
        fetchSubmissions();
    }, [fetchSubmissions]);

    const handleReview = async (userId: string, username: string, action: 'APPROVE' | 'REJECT') => {
        let reason: string | null = null;
        const actionText = action === 'APPROVE' ? 'approve' : 'reject';

        if (!window.confirm(`Are you sure you want to ${actionText} request from user ${username}?`)) {
            return;
        }

        if (action === 'REJECT') {
            reason = prompt('Please indicate the reason for refusal:');
            if (!reason) return;
        }

        try {
            await reviewKycSubmission(userId, action, reason || undefined);
            fetchSubmissions();
        } catch (error) {
            alert('Не удалось обработать заявку.');
        }
    };

    const handleViewDocument = async (userId: string, filePath: string) => {
        const fileName = filePath.split(/[\\/]/).pop();
        if (!fileName) return;

        setViewingDoc(filePath);
        try {
            const fileBlob = await getKycDocumentFile(userId, fileName);
            const fileURL = URL.createObjectURL(fileBlob);
            window.open(fileURL, '_blank');
        } catch (error) {
            alert('Failed to load document.');
            console.error(error);
        } finally {
            setViewingDoc(null);
        }
    };

    if (loading) return <p>Loading applications...</p>;

    return (
        <div className={styles.card}>
            <div className={styles.header}>
                <h1>Verification Requests</h1>
            </div>
            
            <div className={styles.filterBar}>
                <button onClick={() => setFilter('PENDING')} className={`${styles.filterButton} ${filter === 'PENDING' ? styles.active : ''}`}>Pending</button> 
                <button onClick={() => setFilter('APPROVED')} className={`${styles.filterButton} ${filter === 'APPROVED' ? styles.active : ''}`}>Approved</button> 
                <button onClick={() => setFilter('REJECTED')} className={`${styles.filterButton} ${filter === 'REJECTED' ? styles.active : ''}`}>Rejected</button> 
                <button onClick={() => setFilter('ALL')} className={`${styles.filterButton} ${filter === 'ALL' ? styles.active : ''}`}>All</button>
            </div>

            {loading ? <p>Loading requests...</p> : submissions.length === 0 ? (
                <p>There are no requests in this category..</p>
            ) : (
                <div className={styles.submissionList}>
                    {submissions.map(sub => (
                        <div key={sub._id} className={styles.submissionCard}>
                            <div className={styles.submissionInfo}>
                                <p><strong>User:</strong> {sub.username} ({sub.email})</p>
                                <p><strong>Статус:</strong> {sub.kycStatus}</p>
                                {/* @ts-ignore */}
                                {sub.kycDocuments.map((doc, index) => (
                                    <div key={index}>
                                        <p><strong>Document type:</strong> {doc.documentType}</p>
                                        <button 
                                            onClick={() => handleViewDocument(sub._id, doc.filePath)}
                                            className={styles.documentLink}
                                            disabled={viewingDoc === doc.filePath}
                                        >
                                            {viewingDoc === doc.filePath ? 'Loading...' : 'View document'}
                                        </button>
                                    </div>
                                ))}
                            </div>
                            {sub.kycStatus === 'PENDING' && (
                                <div className={styles.actions}>
                                    <button onClick={() => handleReview(sub._id, sub.username, 'APPROVE')} className={`${styles.btn} ${styles.btnApprove}`}>Approve</button>
                                    <button onClick={() => handleReview(sub._id, sub.username, 'REJECT')} className={`${styles.btn} ${styles.btnReject}`}>Reject</button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default KYCPage;