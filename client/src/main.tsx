import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { AuthProvider } from './context/AuthContext.tsx';
import { SocketProvider } from './context/SocketContext.tsx';
import { NotificationProvider } from './context/NotificationContext';
import { UIProvider } from './context/UIContext.tsx';


ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <SocketProvider>
        <NotificationProvider>
          <UIProvider>
            <App />
          </UIProvider>
        </NotificationProvider>
      </SocketProvider>
    </AuthProvider>
  </React.StrictMode>,
);