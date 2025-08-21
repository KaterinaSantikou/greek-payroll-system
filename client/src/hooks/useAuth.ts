import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";

export function useAuth() {
  const { data: user, isLoading, error } = useQuery<User | null>({
    queryKey: ["/api/auth/user"],
    queryFn: async () => {
      try {
        const response = await fetch("/api/auth/user", {
          credentials: "include", // Include cookies for session
        });
        
        if (response.status === 401) {
          // Not authenticated - this is expected, return null
          return null;
        }
        
        if (!response.ok) {
          throw new Error(`Auth check failed: ${response.status}`);
        }
        
        return response.json();
      } catch (error) {
        // Network or other errors - treat as unauthenticated
        console.debug("Auth check failed:", error);
        return null;
      }
    },
    retry: false,
    retryOnMount: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    user: user || null,
    isLoading,
    isAuthenticated: !!user,
    login: () => {
      // Redirect to login endpoint
      window.location.href = "/api/auth/login";
    },
    logout: () => {
      // Redirect to logout endpoint
      window.location.href = "/api/auth/logout";
    },
  };
}