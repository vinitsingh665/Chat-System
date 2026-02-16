const { validate, sanitizeHTML } = require('../middleware/validation');
const logger = require('../utils/logger');

/**
 * Message Controller - Handles message-related operations
 */

/**
 * Validate and sanitize a message
 */
function validateMessage(messageText) {
    const { error, value } = validate('message', messageText);
    if (error) {
        throw new Error(error.message);
    }
    return sanitizeHTML(value);
}

/**
 * Create message object
 */
function createMessage(roomName, username, text, type = 'user', additionalData = {}) {
    return {
        roomName,
        username,
        text,
        type,
        timestamp: new Date().toISOString(),
        ...additionalData
    };
}

/**
 * Check if recipient is in DND mode
 */
function isRecipientInDnd(io, recipientName, userSocketMap) {
    const recipientSocketId = userSocketMap.get(recipientName);
    if (!recipientSocketId) return false;

    const recipientSocket = io.sockets.sockets.get(recipientSocketId);
    return recipientSocket && recipientSocket.data.dnd;
}

/**
 * Send message to recipient
 */
function sendToRecipient(io, recipientName, userSocketMap, roomName, message) {
    const recipientSocketId = userSocketMap.get(recipientName);
    if (!recipientSocketId) return false;

    const recipientSocket = io.sockets.sockets.get(recipientSocketId);
    if (recipientSocket && !recipientSocket.rooms.has(roomName)) {
        recipientSocket.emit('chat-message', message);
        return true;
    }
    return false;
}

module.exports = {
    validateMessage,
    createMessage,
    isRecipientInDnd,
    sendToRecipient,
};
