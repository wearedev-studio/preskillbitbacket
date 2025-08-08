import React, { useState } from 'react';
import { submitKycDocument } from '../../services/api';
import styles from './KycModal.module.css';
import { X, ShieldCheck } from 'lucide-react';

interface KycModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const KycModal: React.FC<KycModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const [kycFile, setKycFile] = useState<File | null>(null);
    const [kycDocType, setKycDocType] = useState('PASSPORT');
    const [message, setMessage] = useState({ type: '', text: '' });
    const [isLoading, setIsLoading] = useState(false);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) setKycFile(file);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!kycFile) {
            setMessage({ type: 'error', text: 'Please select a file.' });
            return;
        }
        
        setIsLoading(true);
        setMessage({ type: '', text: '' });

        const formData = new FormData();
        formData.append('document', kycFile);
        formData.append('documentType', kycDocType);

        try {
            const res = await submitKycDocument(formData);
            setMessage({ type: 'success', text: res.data.message });
            
            onSuccess();

            setTimeout(() => {
                onClose();
            }, 2000);
        } catch (error: any) {
            setMessage({ type: 'error', text: error.response?.data?.message || 'Upload error' });
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className={styles.overlay}>
            <div className={styles.modal}>
                <div className={styles.header}>
                    <div style={{display: 'flex', alignItems: 'center', gap: '0.75rem'}}>
                        <ShieldCheck />
                        <h2>Account Verification</h2>
                    </div>
                    <button onClick={onClose} className={styles.closeButton}><X /></button>
                </div>
                <p style={{color: '#94a3b8', marginBottom: '1.5rem'}}>
                    To withdraw funds, you need to verify your identity. Please upload one of the documents.
                </p>
                <form onSubmit={handleSubmit} className={styles.form}>
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Document Type</label>
                        <select value={kycDocType} onChange={(e) => setKycDocType(e.target.value)} className={styles.formInput}>
                            <option value="PASSPORT">Passport</option>
                            <option value="UTILITY_BILL">Utility bill</option>
                            <option value="INTERNATIONAL_PASSPORT">International passport</option>
                            <option value="RESIDENCE_PERMIT">Residence Permit</option>
                        </select>
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>File (up to 10MB)</label>
                        <input type="file" accept="image/*,.pdf" onChange={handleFileChange} className={styles.formInput} required />
                    </div>
                    <button type="submit" disabled={isLoading} className={`${styles.btn} ${styles.btnPrimary}`}>
                        {isLoading ? 'Sending...' : 'Submit for Review'}
                    </button>
                    {message.text && <p style={{color: message.type === 'error' ? 'salmon' : 'lightgreen', marginTop: '1rem'}}>{message.text}</p>}
                </form>
            </div>
        </div>
    );
};

export default KycModal;