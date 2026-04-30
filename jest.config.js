/** @type {import('jest').Config} */

// Function to safely resolve jest-environment-jsdom
function getJsdomEnvironment() {
  try {
    return require.resolve('jest-environment-jsdom');
  } catch (error) {
    console.warn('jest-environment-jsdom not found, skipping frontend tests');
    return null;
  }
}

// Get the jsdom environment path
const jsdomEnvironment = getJsdomEnvironment();

// Create projects array with conditional frontend tests
const projects = [
  {
    displayName: 'backend',
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: ['<rootDir>/server'],
    testMatch: ['<rootDir>/server/**/__tests__/**/*.test.ts'],
    setupFilesAfterEnv: ['<rootDir>/server/__tests__/setup/jest.setup.ts'],
    globalSetup: '<rootDir>/server/__tests__/setup/jest.globalSetup.ts',
    globalTeardown: '<rootDir>/server/__tests__/setup/jest.globalTeardown.ts',
    transform: {
      '^.+\.ts$': ['ts-jest', {
        tsconfig: 'tsconfig.json'
      }],
    },
    moduleNameMapper: {
      '^@shared/(.*)$': '<rootDir>/shared/$1',
    },
  },
];

// Only add frontend tests if jsdom environment is available
if (jsdomEnvironment) {
  projects.push({
    displayName: 'frontend',
    testEnvironment: jsdomEnvironment,
      roots: ['<rootDir>/client'],
      testMatch: ['<rootDir>/client/**/__tests__/**/*.test.{ts,tsx}'],
      setupFilesAfterEnv: ['<rootDir>/client/src/__tests__/setup/jest.setup.ts'],
      transform: {
        '^.+\\.(ts|tsx)$': ['ts-jest', {
          tsconfig: 'tsconfig.frontend-test.json',
          useESM: false,
          isolatedModules: true
        }],
      },
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/client/src/$1',
        '^@shared/(.*)$': '<rootDir>/shared/$1',
      },
      moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
      resolver: undefined,
      moduleDirectories: ['node_modules', '<rootDir>/client/src', '<rootDir>/shared'],
    });
} else {
  console.log('Frontend tests disabled: jest-environment-jsdom not available');
}

module.exports = {
  preset: 'ts-jest',
  // Use projects to handle different environments for backend and frontend
  projects,
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: 'tsconfig.test.json'
    }],
  },
  // Global settings for all projects
  modulePaths: ['<rootDir>', '<rootDir>/node_modules'],
  moduleDirectories: ['node_modules', '<rootDir>'],
  resolver: '<rootDir>/jest.resolver.js',
  setupFiles: ['<rootDir>/jest.setup.js'],
  testTimeout: 30000,
  maxWorkers: 1, // Ensure tests run sequentially to avoid database conflicts
  forceExit: true,
  clearMocks: true,
  restoreMocks: true,
  collectCoverageFrom: [
    'server/**/*.ts',
    '!server/**/*.d.ts',
    '!server/__tests__/**',
    '!server/index.ts',
    '!server/vite.ts',
    '!server/dbInit.ts',
    '!server/backup.ts',
    '!server/samlAuth.ts',
    '!server/replitAuth.ts',
    '!server/universitySso.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  // coverageThreshold: {
  //   global: {
  //     branches: 10,
  //     functions: 10,
  //     lines: 10,
  //     statements: 10,
  //   },
  // },
  verbose: true,
  reporters: [
    'default',
    ['jest-junit', { 
      outputDirectory: './reports/junit/', 
      outputName: 'js-test-results.xml' 
    }]
  ],
};
