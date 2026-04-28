/** @type {import('jest').Config} */
export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^@oa-mvp/shared$': '<rootDir>/../shared/src/index.ts',
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      useESM: true,
      experimentalDecorators: true,
      emitDecoratorMetadata: true,
      diagnostics: {
        ignoreCodes: [151002],
      },
    }],
  },
  testMatch: ['**/*.spec.ts'],
};
