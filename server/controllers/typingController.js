/**
 * Typing indicator handler
 * Tracks users currently typing in rooms
 */

const typingUsers = new Map(); // roomName -> Set of usernames

/**
 * Handle typing event
 */
function handleTyping(io, socket, { roomName, username }) {
    if (!roomName || !username) return;

    // Initialize set for room if needed
    if (!typingUsers.has(roomName)) {
        typingUsers.set(roomName, new Set());
    }

    // Add user to typing set
    typingUsers.get(roomName).add(username);

    // Broadcast to others in the room
    socket.to(roomName).emit('user-typing', { roomName, username });

    // Auto-remove after 3 seconds
    setTimeout(() => {
        const roomTyping = typingUsers.get(roomName);
        if (roomTyping) {
            roomTyping.delete(username);
            if (roomTyping.size === 0) {
                typingUsers.delete(roomName);
            }
        }
    }, 3000);
}

/**
 * Clean up typing status when user disconnects
 */
function cleanupTyping(username) {
    typingUsers.forEach((users, roomName) => {
        users.delete(username);
        if (users.size === 0) {
            typingUsers.delete(roomName);
        }
    });
}

module.exports = {
    handleTyping,
    cleanupTyping,
};
