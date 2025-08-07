import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';

interface UIContextType {
    isSidebarOpen: boolean;
    toggleSidebar: () => void;
    setSidebarOpen: (isOpen: boolean) => void;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export const UIProvider = ({ children }: { children: ReactNode }) => {
    const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(() => {
        try {
            const item = window.localStorage.getItem('sidebarOpen');
            return item ? JSON.parse(item) : true;
        } catch (error) {
            console.error(error);
            return true;
        }
    });

    useEffect(() => {
        try {
            window.localStorage.setItem('sidebarOpen', JSON.stringify(isSidebarOpen));
        } catch (error) {
            console.error("Failed to save sidebar state:", error);
        }
    }, [isSidebarOpen]);
    
    const toggleSidebar = useCallback(() => {
        setIsSidebarOpen(prev => !prev);
    }, []);

    const setSidebarOpen = useCallback((isOpen: boolean) => {
        setIsSidebarOpen(isOpen);
    }, []);

    return (
        <UIContext.Provider value={{ isSidebarOpen, toggleSidebar, setSidebarOpen }}>
            {children}
        </UIContext.Provider>
    );
};

export const useUI = () => {
    const context = useContext(UIContext);
    if (!context) throw new Error('useUI must be used within a UIProvider');
    return context;
};