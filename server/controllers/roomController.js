const bcrypt = require('bcrypt');
const config = require('../config');
const logger = require('../utils/logger');
const Room = require('../models/Room');
const Message = require('../models/Message');

/**
 * Room Controller - Handles room-related operations
 */

/**
 * Get list of all public rooms
 */
async function getRoomList(rooms) {
    return Object.keys(rooms)
        .filter(name => !rooms[name].isDirectMessage && !name.startsWith('DM:'))
        .map(name => ({
            name,
            isPrivate: !!rooms[name].password,
            expiry: rooms[name].expiry || null,
            type: rooms[name].type || 'chat'
        }));
}

/**
 * Create a new room
 */
async function createRoom(roomName, password, type, creatorUsername) {
    // Hash password if provided
    const hashedPassword = password
        ? await bcrypt.hash(password, config.security.bcryptRounds)
        : null;

    return {
        password: hashedPassword,
        messages: [],
        type: type || 'chat',
        createdBy: creatorUsername,
        createdAt: new Date(),
    };
}

/**
 * Verify room password
 */
async function verifyRoomPassword(storedPassword, providedPassword) {
    if (!storedPassword) return true; // No password required
    if (!providedPassword) return false; // Password required but not provided

    return await bcrypt.compare(providedPassword, storedPassword);
}

/**
 * Check if room exists (case-insensitive)
 */
function findRoomCaseInsensitive(rooms, roomName) {
    return Object.keys(rooms).find(r => r.toLowerCase() === roomName.toLowerCase());
}

/**
 * Create system message
 */
function createSystemMessage(roomName, text) {
    return {
        roomName,
        username: 'System',
        text,
        type: 'system',
        timestamp: new Date().toISOString()
    };
}

module.exports = {
    getRoomList,
    createRoom,
    verifyRoomPassword,
    findRoomCaseInsensitive,
    createSystemMessage,
};
