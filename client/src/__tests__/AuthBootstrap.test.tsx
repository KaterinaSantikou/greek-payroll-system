import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Router } from 'wouter';
import { MemoryLocation } from 'wouter/memory-location';

// Mock the auth bootstrap functionality
const AuthBootstrap = ({ children }: { children: React.ReactNode }) => {
  const [location] = useLocation();
  const router = useRouter();
  const [authState, setAuthState] = useState({
    authenticated: false,
    user: null,
    loading: true,
  });

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const response = await fetch('/api/auth/user', {
          credentials: 'include',
        });
        const data = await response.json();

        setAuthState({
          authenticated: data.authenticated,
          user: data.user,
          loading: false,
        });

        // Navigate to dashboard if authenticated and on login page
        if (data.authenticated && location === '/login') {
          router('/dashboard');
        }
      } catch (error) {
        console.error('Auth bootstrap failed:', error);
        setAuthState({ authenticated: false, user: null, loading: false });
      }
    };

    bootstrap();
  }, [location, router]);

  return children;
};

// Import required hooks after the component definition
import { useLocation, useRouter } from 'wouter';
import { useEffect, useState } from 'react';

describe('AuthBootstrap', () => {
  let queryClient: QueryClient;
  let mockLocation: MemoryLocation;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    mockLocation = new MemoryLocation();

    // Clear all mocks
    vi.clearAllMocks();

    // Mock fetch globally
    global.fetch = vi.fn();
  });

  const TestWrapper = ({
    children,
    initialPath = '/',
  }: {
    children: React.ReactNode;
    initialPath?: string;
  }) => {
    mockLocation.setPath(initialPath);

    return (
      <QueryClientProvider client={queryClient}>
        <Router hook={mockLocation.hook}>
          <AuthBootstrap>{children}</AuthBootstrap>
        </Router>
      </QueryClientProvider>
    );
  };

  it('should fetch auth status with credentials included', async () => {
    const mockResponse = {
      authenticated: false,
      user: null,
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    render(
      <TestWrapper>
        <div data-testid="test-content">Test Content</div>
      </TestWrapper>
    );

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/auth/user', {
        credentials: 'include',
      });
    });
  });

  it('should navigate to dashboard when authenticated and on login page', async () => {
    const mockResponse = {
      authenticated: true,
      user: { id: '1', name: 'Test User', email: 'test@example.com' },
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    render(
      <TestWrapper initialPath="/login">
        <div data-testid="test-content">Test Content</div>
      </TestWrapper>
    );

    await waitFor(() => {
      expect(mockLocation.path).toBe('/dashboard');
    });
  });

  it('should not navigate when authenticated but not on login page', async () => {
    const mockResponse = {
      authenticated: true,
      user: { id: '1', name: 'Test User', email: 'test@example.com' },
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    render(
      <TestWrapper initialPath="/home">
        <div data-testid="test-content">Test Content</div>
      </TestWrapper>
    );

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });

    // Should stay on /home
    expect(mockLocation.path).toBe('/home');
  });

  it('should not navigate when not authenticated', async () => {
    const mockResponse = {
      authenticated: false,
      user: null,
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    render(
      <TestWrapper initialPath="/login">
        <div data-testid="test-content">Test Content</div>
      </TestWrapper>
    );

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });

    // Should stay on /login
    expect(mockLocation.path).toBe('/login');
  });

  it('should handle fetch errors gracefully', async () => {
    (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <TestWrapper>
        <div data-testid="test-content">Test Content</div>
      </TestWrapper>
    );

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        'Auth bootstrap failed:',
        expect.any(Error)
      );
    });

    consoleSpy.mockRestore();
  });
});
