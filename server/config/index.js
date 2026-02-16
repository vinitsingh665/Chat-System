require('dotenv').config();

module.exports = {
    server: {
        port: process.env.PORT || 3000,
        nodeEnv: process.env.NODE_ENV || 'development',
    },

    security: {
        jwtSecret: process.env.JWT_SECRET || 'dev-secret-key',
        bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS, 10) || 10,
    },

    rateLimiting: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 900000,
        maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100,
        messageRateLimit: parseInt(process.env.MESSAGE_RATE_LIMIT_PER_SECOND, 10) || 10,
        roomCreationLimit: parseInt(process.env.ROOM_CREATION_LIMIT_PER_MINUTE, 10) || 5,
    },

    data: {
        maxMessageLength: parseInt(process.env.MAX_MESSAGE_LENGTH, 10) || 5000,
        maxFileSize: parseInt(process.env.MAX_FILE_SIZE, 10) || 2097152,
        roomCleanupTimeoutPublic: parseInt(process.env.ROOM_CLEANUP_TIMEOUT_PUBLIC, 10) || 60000,
        roomCleanupTimeoutPrivate: parseInt(process.env.ROOM_CLEANUP_TIMEOUT_PRIVATE, 10) || 3600000,
    },

    cors: {
        origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:5173', 'http://127.0.0.1:5173'],
    },

    socketIO: {
        maxHttpBufferSize: parseInt(process.env.MAX_HTTP_BUFFER_SIZE, 10) || 1e7, // 10MB
    },
};
