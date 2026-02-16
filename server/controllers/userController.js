const { validate } = require('../middleware/validation');
const logger = require('../utils/logger');

/**
 * User Controller - Handles user-related operations
 */

/**
 * Validate username
 */
function validateUsername(username) {
    const { error, value } = validate('username', username);
    if (error) {
        throw new Error(error.message);
    }
    return value;
}

/**
 * Check if username is taken (case-insensitive)
 */
function isUsernameTaken(io, username, excludeSocketId = null) {
    return Array.from(io.sockets.sockets.values()).some(s =>
        s.id !== excludeSocketId &&
        s.data.username &&
        s.data.username.toLowerCase() === username.toLowerCase()
    );
}

/**
 * Get all connected users
 */
async function getConnectedUsers(io) {
    const sockets = await io.fetchSockets();
    const users = sockets
        .filter(s => s.data.username)
        .map(s => ({
            username: s.data.username,
            dnd: !!s.data.dnd
        }));

    // Dedup
    const uniqueUsersMap = new Map();
    users.forEach(u => uniqueUsersMap.set(u.username, u));
    return Array.from(uniqueUsersMap.values());
}

/**
 * Register user in socket and mapping
 */
function registerUser(socket, username, userSocketMap) {
    socket.data.username = username;
    userSocketMap.set(username, socket.id);
    logger.info(`User registered: ${username}`);
}

/**
 * Unregister user from mapping
 */
function unregisterUser(username, userSocketMap) {
    userSocketMap.delete(username);
    logger.debug(`User unregistered: ${username}`);
}

/**
 * Find socket by username
 */
function findSocketByUsername(io, username, userSocketMap) {
    const socketId = userSocketMap.get(username);
    return socketId ? io.sockets.sockets.get(socketId) : null;
}

module.exports = {
    validateUsername,
    isUsernameTaken,
    getConnectedUsers,
    registerUser,
    unregisterUser,
    findSocketByUsername,
};
