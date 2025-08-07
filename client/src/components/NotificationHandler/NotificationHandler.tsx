import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { toast } from 'react-hot-toast';
import { useSocket } from '../../context/SocketContext';

export const NotificationHandler: React.FC = () => {
    const { socket } = useSocket();
    const navigate = useNavigate();

    useEffect(() => {
        if (!socket) return;

        const handleNotification = (data: { title: string; message: string; link?: string }) => {
            // @ts-ignore
            console.log(message);
            toast.custom((t) => (
                <div
                    style={{
                        padding: '16px',
                        background: '#333',
                        color: 'white',
                        borderRadius: '8px',
                        boxShadow: '0 4px 15px rgba(0,0,0,0.5)',
                        opacity: t.visible ? 1 : 0,
                        transition: 'all 0.3s ease-in-out',
                        cursor: data.link ? 'pointer' : 'default',
                    }}
                    onClick={() => {
                        if (data.link) navigate(data.link);
                        toast.dismiss(t.id);
                    }}
                >
                    <h4 style={{ margin: 0, borderBottom: '1px solid #555', paddingBottom: '8px' }}>{data.title}</h4>
                    <p style={{ margin: '8px 0 0' }}>{data.message}</p>
                </div>
            ));
        };

        socket.on('notification', handleNotification);

        return () => {
            socket.off('notification', handleNotification);
        };
    }, [socket, navigate]);

    return null;
};