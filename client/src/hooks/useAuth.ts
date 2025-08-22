import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";

export function useAuth() {
  const { data: user, isLoading, error } = useQuery<User>({
    queryKey: ["/api/auth/user"],
    retry: false,
    retryOnMount: false,
    // Only query if we might be authenticated
    enabled: typeof window !== 'undefined' && document.cookie.includes('connect.sid')
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user && !error,
  };
}
