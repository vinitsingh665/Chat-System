const logger = require('./logger');
const config = require('../config');

/**
 * Centralized error handler for socket events
 * @param {Object} socket - Socket.IO socket instance
 * @param {Error} error - Error object
 * @param {string} context - Context where error occurred
 */
function handleSocketError(socket, error, context) {
    logger.error(`[${context}] Socket error:`, {
        socketId: socket.id,
        username: socket.data?.username,
        error: error.message,
        stack: config.server.nodeEnv === 'development' ? error.stack : undefined,
    });

    // Send user-friendly error message
    const userMessage = config.server.nodeEnv === 'production'
        ? 'An error occurred. Please try again.'
        : error.message;

    socket.emit('error', {
        message: userMessage,
        code: error.code || 'UNKNOWN_ERROR',
        context,
    });
}

/**
 * Express error handler middleware
 */
function handleExpressError(err, req, res, next) {
    logger.error('Express error:', {
        error: err.message,
        stack: err.stack,
        url: req.url,
        method: req.method,
    });

    res.status(err.status || 500).json({
        error: config.server.nodeEnv === 'production'
            ? 'Internal server error'
            : err.message,
    });
}

module.exports = {
    handleSocketError,
    handleExpressError,
};
