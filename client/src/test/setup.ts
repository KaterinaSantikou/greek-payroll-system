import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock window.location for tests
Object.defineProperty(window, 'location', {
  value: {
    href: 'http://localhost:3000',
    assign: vi.fn(),
    reload: vi.fn(),
    replace: vi.fn(),
  },
  writable: true,
});

// Mock fetch for tests
global.fetch = vi.fn();