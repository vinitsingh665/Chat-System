module.exports = {
    testEnvironment: 'node',
    coverageDirectory: 'coverage',
    collectCoverageFrom: [
        '**/*.js',
        '!node_modules/**',
        '!coverage/**',
        '!logs/**',
        '!jest.config.js',
    ],
    testMatch: [
        '**/__tests__/**/*.test.js',
        '**/__tests__/**/*.integration.test.js',
    ],
    coverageThreshold: {
        global: {
            branches: 60,
            functions: 60,
            lines: 60,
            statements: 60,
        },
    },
    setupFilesAfterEnv: ['<rootDir>/__tests__/setup.js'],
    testTimeout: 10000,
};
