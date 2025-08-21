import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import type { User } from "@shared/schema";

export function useAuth() {
  const { data: user, isLoading, error, isError } = useQuery<User | null>({
    queryKey: ["/api/auth/user"],
    queryFn: getQueryFn<User | null>({ on401: "returnNull" }),
    retry: false,
    retryOnMount: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    throwOnError: false, // Don't throw on error, handle gracefully
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  return {
    user: user || null,
    isLoading,
    isAuthenticated: !!user,
    login: () => {
      // Redirect to login endpoint
      window.location.href = "/api/login";
    },
    logout: () => {
      // Redirect to logout endpoint
      window.location.href = "/api/logout";
    },
  };
}