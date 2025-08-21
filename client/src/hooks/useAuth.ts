import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";

export function useAuth() {
  const { data: user, isLoading, error } = useQuery<User>({
    queryKey: ["/api/auth/user"],
    retry: false,
    retryOnMount: false,
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user && !error,
  };
}
import { useState, useEffect } from 'react';

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Mock authentication for development
    const mockUser: User = {
      id: '1',
      firstName: 'Demo',
      lastName: 'User',
      email: 'demo@payrollsync.gr',
      role: 'admin'
    };
    
    setTimeout(() => {
      setUser(mockUser);
      setLoading(false);
    }, 500);
  }, []);

  const login = async (email: string, password: string) => {
    // Mock login implementation
    return Promise.resolve();
  };

  const logout = () => {
    setUser(null);
  };

  return {
    user,
    loading,
    login,
    logout,
    isAuthenticated: !!user
  };
}
