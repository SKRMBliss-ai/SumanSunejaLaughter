import React, { createContext, useContext, useState, ReactNode } from 'react';

interface LiveWidgetContextType {
    isWidgetOpen: boolean;
    openWidget: () => void;
    closeWidget: () => void;
}

const LiveWidgetContext = createContext<LiveWidgetContextType | undefined>(undefined);

export const LiveWidgetProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [isWidgetOpen, setIsWidgetOpen] = useState(false);

    const openWidget = () => setIsWidgetOpen(true);
    const closeWidget = () => setIsWidgetOpen(false);

    return (
        <LiveWidgetContext.Provider value={{ isWidgetOpen, openWidget, closeWidget }}>
            {children}
        </LiveWidgetContext.Provider>
    );
};

export const useLiveWidget = () => {
    const context = useContext(LiveWidgetContext);
    if (context === undefined) {
        throw new Error('useLiveWidget must be used within a LiveWidgetProvider');
    }
    return context;
};
