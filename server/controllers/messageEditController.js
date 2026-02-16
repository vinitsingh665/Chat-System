/**
 * Message editing and deletion controller
 */

/**
 * Edit a message
 */
function editMessage(io, rooms, { messageId, newText, username }) {
    // Find the message in all rooms
    for (const roomName in rooms) {
        const room = rooms[roomName];
        const messageIndex = room.messages.findIndex(m => m.timestamp === messageId);

        if (messageIndex !== -1) {
            const message = room.messages[messageIndex];

            // Only allow editing own messages
            if (message.username === username) {
                message.text = newText;
                message.edited = true;
                message.editedAt = new Date().toISOString();

                // Broadcast update
                io.to(roomName).emit('message-edited', {
                    messageId,
                    newText,
                    editedAt: message.editedAt
                });

                return true;
            }
        }
    }

    return false;
}

/**
 * Delete a message
 */
function deleteMessage(io, rooms, { messageId, username }) {
    // Find and delete the message
    for (const roomName in rooms) {
        const room = rooms[roomName];
        const messageIndex = room.messages.findIndex(m => m.timestamp === messageId);

        if (messageIndex !== -1) {
            const message = room.messages[messageIndex];

            // Only allow deleting own messages
            if (message.username === username) {
                room.messages.splice(messageIndex, 1);

                // Broadcast deletion
                io.to(roomName).emit('message-deleted', { messageId });

                return true;
            }
        }
    }

    return false;
}

module.exports = {
    editMessage,
    deleteMessage,
};
