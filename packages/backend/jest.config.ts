import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testMatch: ['**/*.test.ts', '**/*.spec.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.d.ts'],
  testEnvironment: 'node',
  rootDir: './src',
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      useESM: false,
      tsconfig: {
        experimentalDecorators: true,
        module: 'CommonJS',
        moduleResolution: 'Node',
      },
    }],
  },
  moduleNameMapper: {
    '^@oa-mvp/shared$': '<rootDir>/../../shared/dist/index.js',
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
};

export default config;
