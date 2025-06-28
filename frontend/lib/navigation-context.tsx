import React, { createContext, useContext, useState, ReactNode } from 'react';

export type NavigationSection = 'scheduling' | 'customers' | 'analytics' | 'invoicing' | 'workorders' | 'settings';

interface NavigationContextType {
    activeSection: NavigationSection;
    setActiveSection: (section: NavigationSection) => void;
    isSidebarOpen: boolean;
    setSidebarOpen: (open: boolean) => void;
    toggleSidebar: () => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export function NavigationProvider({ children }: { children: ReactNode }) {
    const [activeSection, setActiveSection] = useState<NavigationSection>('scheduling');
    const [isSidebarOpen, setSidebarOpen] = useState(false);

    const toggleSidebar = () => {
        setSidebarOpen(!isSidebarOpen);
    };

    return (
        <NavigationContext.Provider value={{
            activeSection,
            setActiveSection,
            isSidebarOpen,
            setSidebarOpen,
            toggleSidebar
        }}>
            {children}
        </NavigationContext.Provider>
    );
}

export function useNavigation() {
    const context = useContext(NavigationContext);
    if (context === undefined) {
        throw new Error('useNavigation must be used within a NavigationProvider');
    }
    return context;
}