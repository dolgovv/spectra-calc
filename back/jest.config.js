/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  // Fonts are resolved from process.cwd() (see render/fonts.ts), so tests run from back/ like the app.
  rootDir: __dirname,
  roots: ['<rootDir>/src', '<rootDir>/test'],
  testRegex: '\\.(spec|e2e-spec)\\.ts$',
  transform: { '^.+\\.ts$': 'ts-jest' },
  setupFiles: ['<rootDir>/test/helpers/silence-logger.ts'],
  // Rendering and the real archives are slow under ts-jest, especially on a CI runner.
  testTimeout: 30000,
};
