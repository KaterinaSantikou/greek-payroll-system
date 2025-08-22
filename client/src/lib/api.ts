// API utility for making requests to the backend
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const api = (path: string, init?: RequestInit): Promise<Response> => {
  return fetch(`${API_BASE_URL}${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
    ...init,
  });
};

// Helper function for JSON responses
export const apiJson = async <T = any>(path: string, init?: RequestInit): Promise<T> => {
  const response = await api(path, init);
  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }
  return response.json();
};

// Common API methods
export const apiGet = <T = any>(path: string): Promise<T> => 
  apiJson<T>(path, { method: 'GET' });

export const apiPost = <T = any>(path: string, data?: any): Promise<T> => 
  apiJson<T>(path, { 
    method: 'POST', 
    body: data ? JSON.stringify(data) : undefined 
  });

export const apiPut = <T = any>(path: string, data?: any): Promise<T> => 
  apiJson<T>(path, { 
    method: 'PUT', 
    body: data ? JSON.stringify(data) : undefined 
  });

export const apiDelete = <T = any>(path: string): Promise<T> => 
  apiJson<T>(path, { method: 'DELETE' });