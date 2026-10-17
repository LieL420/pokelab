module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\\.spec\\.ts$',
  transform: { '^.+\\.(t|j)s$': ['ts-jest', { tsconfig: { module: 'CommonJS' } }] },
  collectCoverageFrom: ['src/**/*.(t|j)s'],
  testEnvironment: 'node',
}
