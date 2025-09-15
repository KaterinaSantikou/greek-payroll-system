/**
 * A/B Testing Provider - Context for managing tests across the application
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { ABTestManager, type ABTest } from '@/lib/abTesting';

interface ABTestContextValue {
  tests: ABTest[];
  isLoading: boolean;
  getUserId: () => string;
  refreshTests: () => void;
}

const ABTestContext = createContext<ABTestContextValue | undefined>(undefined);

interface ABTestProviderProps {
  children: React.ReactNode;
  userId?: string;
}

export function ABTestProvider({ children, userId }: ABTestProviderProps) {
  const [tests, setTests] = useState<ABTest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const getUserId = () => {
    if (userId) return userId;

    // Try to get from localStorage for persistent user identity
    let storedUserId = localStorage.getItem('ab-test-user-id');
    if (!storedUserId) {
      storedUserId = `user_${Math.random().toString(36).substring(2, 15)}`;
      localStorage.setItem('ab-test-user-id', storedUserId);
    }
    return storedUserId;
  };

  const refreshTests = () => {
    const allTests = ABTestManager.getAllTests();
    setTests(allTests);
  };

  useEffect(() => {
    refreshTests();
    setIsLoading(false);
  }, []);

  return (
    <ABTestContext.Provider
      value={{ tests, isLoading, getUserId, refreshTests }}
    >
      {children}
    </ABTestContext.Provider>
  );
}

export function useABTestContext() {
  const context = useContext(ABTestContext);
  if (context === undefined) {
    throw new Error('useABTestContext must be used within an ABTestProvider');
  }
  return context;
}
