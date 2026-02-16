const rateLimit = require('express-rate-limit');
const config = require('../config');
const logger = require('../utils/logger');

/**
 * HTTP endpoint rate limiter
 */
const httpLimiter = rateLimit({
    windowMs: config.rateLimiting.windowMs,
    max: config.rateLimiting.maxRequests,
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        logger.warn('Rate limit exceeded', { ip: req.ip, url: req.url });
        res.status(429).json({
            error: 'Too many requests, please try again later.',
        });
    },
});

/**
 * Socket.IO message rate limiter
 * Tracks messages per user and enforces limits
 */
class SocketRateLimiter {
    constructor() {
        this.messageTimestamps = new Map(); // socketId -> array of timestamps
        this.roomCreationTimestamps = new Map(); // socketId -> array of timestamps
    }

    /**
     * Check if user can send a message
     * @param {string} socketId - Socket ID
     * @returns {boolean} True if allowed, false if rate limited
     */
    checkMessageRate(socketId) {
        const now = Date.now();
        const limit = config.rateLimiting.messageRateLimit;
        const windowMs = 1000; // 1 second window

        if (!this.messageTimestamps.has(socketId)) {
            this.messageTimestamps.set(socketId, []);
        }

        const timestamps = this.messageTimestamps.get(socketId);

        // Remove timestamps outside the window
        const validTimestamps = timestamps.filter(ts => now - ts < windowMs);

        if (validTimestamps.length >= limit) {
            logger.warn('Message rate limit exceeded', { socketId });
            return false;
        }

        // Add current timestamp
        validTimestamps.push(now);
        this.messageTimestamps.set(socketId, validTimestamps);

        return true;
    }

    /**
     * Check if user can create a room
     * @param {string} socketId - Socket ID
     * @returns {boolean} True if allowed, false if rate limited
     */
    checkRoomCreationRate(socketId) {
        const now = Date.now();
        const limit = config.rateLimiting.roomCreationLimit;
        const windowMs = 60000; // 1 minute window

        if (!this.roomCreationTimestamps.has(socketId)) {
            this.roomCreationTimestamps.set(socketId, []);
        }

        const timestamps = this.roomCreationTimestamps.get(socketId);

        // Remove timestamps outside the window
        const validTimestamps = timestamps.filter(ts => now - ts < windowMs);

        if (validTimestamps.length >= limit) {
            logger.warn('Room creation rate limit exceeded', { socketId });
            return false;
        }

        // Add current timestamp
        validTimestamps.push(now);
        this.roomCreationTimestamps.set(socketId, validTimestamps);

        return true;
    }

    /**
     * Clean up rate limiting data for disconnected socket
     * @param {string} socketId - Socket ID
     */
    cleanup(socketId) {
        this.messageTimestamps.delete(socketId);
        this.roomCreationTimestamps.delete(socketId);
    }

    /**
     * Periodic cleanup of old data (run every 5 minutes)
     */
    periodicCleanup() {
        const now = Date.now();

        // Clean message timestamps
        for (const [socketId, timestamps] of this.messageTimestamps.entries()) {
            const validTimestamps = timestamps.filter(ts => now - ts < 1000);
            if (validTimestamps.length === 0) {
                this.messageTimestamps.delete(socketId);
            } else {
                this.messageTimestamps.set(socketId, validTimestamps);
            }
        }

        // Clean room creation timestamps
        for (const [socketId, timestamps] of this.roomCreationTimestamps.entries()) {
            const validTimestamps = timestamps.filter(ts => now - ts < 60000);
            if (validTimestamps.length === 0) {
                this.roomCreationTimestamps.delete(socketId);
            } else {
                this.roomCreationTimestamps.set(socketId, validTimestamps);
            }
        }

        logger.debug('Rate limiter periodic cleanup completed');
    }
}

// Create singleton instance
const socketRateLimiter = new SocketRateLimiter();

// Run periodic cleanup every 5 minutes
setInterval(() => {
    socketRateLimiter.periodicCleanup();
}, 5 * 60 * 1000);

module.exports = {
    httpLimiter,
    socketRateLimiter,
};
