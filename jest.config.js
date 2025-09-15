/** @type {import('jest').Config} */
export default {
  preset: 'ts-jest/presets/default-esm',
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/client/src/$1',
    '^@shared/(.*)$': '<rootDir>/shared/$1',
    '^@server/(.*)$': '<rootDir>/server/$1'
  },
  testMatch: [
    '<rootDir>/tests/**/*.test.{js,ts,tsx}',
    '<rootDir>/server/**/*.test.{js,ts}',
    '<rootDir>/client/**/*.test.{js,ts,tsx}',
    '<rootDir>/shared/**/*.test.{js,ts}'
  ],
  collectCoverage: true,
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: ['text', 'lcov', 'json', 'html'],
  collectCoverageFrom: [
    'client/src/**/*.{js,ts,tsx}',
    'server/**/*.{js,ts}',
    'shared/**/*.{js,ts}',
    '!**/*.d.ts',
    '!**/*.config.*',
    '!**/node_modules/**',
    '!**/dist/**',
    '!**/coverage/**',
    '!**/test/**',
    '!**/tests/**',
    '!**/*.test.*'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  globals: {
    'ts-jest': {
      useESM: true
    }
  },
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      useESM: true
    }]
  }
};