module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>'],
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/?(*.)+(spec|test).ts'
  ],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'adapters/**/*.ts',
    'core/**/*.ts',
    'database/**/*.ts',
    'embeddings/**/*.ts',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/__tests__/**',
  ],
  setupFilesAfterEnv: ['<rootDir>/adapters/__tests__/setup.ts'],
  testTimeout: 30000, // 30 seconds for API calls
  verbose: true
};