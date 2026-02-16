// Test setup file
// Runs before each test suite

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.PORT = 4000;
process.env.JWT_SECRET = 'test-secret-key';

// Suppress console output during tests
global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
};
