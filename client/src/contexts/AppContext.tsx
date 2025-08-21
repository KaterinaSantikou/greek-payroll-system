import { createContext, useContext, useState, ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";

interface ViewingMode {
  type: "normal" | "impersonation" | "employee_view";
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
    throw new Error("useAppContext must be used within an AppProvider");
  }
  return context;
}

interface AppProviderProps {
  children: ReactNode;
}

export function AppProvider({ children }: AppProviderProps) {
  const { user } = useAuth();
  const [viewingMode, setViewingMode] = useState<ViewingMode>({ type: "normal" });
  const [currentProperty, setCurrentProperty] = useState({
    propertyId: "prop-princess",
    name: "Princess Resort & Spa"
  });

  const exitViewingMode = () => {
    setViewingMode({ type: "normal" });
  };

  const value: AppContextValue = {
    viewingMode,
    setViewingMode,
    currentProperty,
    setCurrentProperty,
    exitViewingMode
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}
import React, { createContext, useContext, useState, ReactNode } from 'react';

interface AppContextType {
  viewingMode: 'normal' | 'demo' | 'preview';
  setViewingMode: (mode: 'normal' | 'demo' | 'preview') => void;
  currentProperty: string | null;
  setCurrentProperty: (property: string | null) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppContextProvider({ children }: { children: ReactNode }) {
  const [viewingMode, setViewingMode] = useState<'normal' | 'demo' | 'preview'>('normal');
  const [currentProperty, setCurrentProperty] = useState<string | null>(null);

  return (
    <AppContext.Provider value={{
      viewingMode,
      setViewingMode,
      currentProperty,
      setCurrentProperty
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppContextProvider');
  }
  return context;
}
