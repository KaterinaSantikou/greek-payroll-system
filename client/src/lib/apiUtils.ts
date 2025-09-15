/**
 * API URL utilities for cross-environment compatibility
 */

/**
 * Get the API base URL dynamically based on environment
 */
export function getApiBaseUrl(): string {
  // In development, API runs on same port as dev server
  // In production, API runs on same origin as frontend
  return import.meta.env.PROD ? window.location.origin : window.location.origin;
}

/**
 * Convert any URL to a relative API URL
 * Ensures all API calls work across localhost, staging, and production
 */
export function toRelativeApiUrl(url: string): string {
  // If already relative, ensure it starts with /
  if (url.startsWith('/')) {
    return url;
  }

  // If it's an absolute URL, extract the path
  if (url.includes('://')) {
    try {
      const urlObj = new URL(url);
      return urlObj.pathname + urlObj.search + urlObj.hash;
    } catch {
      // Invalid URL, treat as relative
      return `/${url}`;
    }
  }

  // Default: make it relative
  return `/${url}`;
}

/**
 * Create API endpoint URL that works in all environments
 */
export function createApiUrl(endpoint: string): string {
  return toRelativeApiUrl(endpoint);
}
