import axios from 'axios';
const apiClient = axios.create({ baseURL: 'https://sklgmsapi.koltech.dev/api' });

export const submitKycDocument = (formData: FormData) => {
    const token = localStorage.getItem('token');

    const config = {
        headers: {
            'Content-Type': 'multipart/form-data',
            'Authorization': `Bearer ${token}`
        }
    };

    return apiClient.post('/users/kyc', formData, config);
};

export default apiClient;