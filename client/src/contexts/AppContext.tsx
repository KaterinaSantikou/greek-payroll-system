import { createContext, useContext, useState, ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';

interface ViewingMode {
  type: 'normal' | 'impersonation' | 'employee_view';
  originalRole?: string;
  targetEmployee?: {
    id: string;
    name: string;
  };
}

interface AppContextValue {
  viewingMode: ViewingMode;
  setViewingMode: (mode: ViewingMode) => void;
  currentProperty: {
    propertyId: string;
    name: string;
  };
  setCurrentProperty: (property: { propertyId: string; name: string }) => void;
  exitViewingMode: () => void;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}

interface AppProviderProps {
  children: ReactNode;
}

export function AppProvider({ children }: AppProviderProps) {
  const { user } = useAuth();
  const [viewingMode, setViewingMode] = useState<ViewingMode>({
    type: 'normal',
  });
  const [currentProperty, setCurrentProperty] = useState({
    propertyId: 'prop-princess',
    name: 'Princess Resort & Spa',
  });

  const exitViewingMode = () => {
    setViewingMode({ type: 'normal' });
  };

  const value: AppContextValue = {
    viewingMode,
    setViewingMode,
    currentProperty,
    setCurrentProperty,
    exitViewingMode,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
