import { useState, useCallback } from 'react';

/**
 * Custom hook for message editing and deletion
 * @param {Object} socket - Socket.IO instance
 * @returns {Object} { editMessage, deleteMessage }
 */
export function useMessageActions(socket) {
    const [editingMessageId, setEditingMessageId] = useState(null);

    const editMessage = useCallback((messageId, newText) => {
        if (socket && newText.trim()) {
            socket.emit('edit-message', { messageId, newText });
            setEditingMessageId(null);
        }
    }, [socket]);

    const deleteMessage = useCallback((messageId) => {
        if (socket) {
            socket.emit('delete-message', { messageId });
        }
    }, [socket]);

    const startEditing = useCallback((messageId) => {
        setEditingMessageId(messageId);
    }, []);

    const cancelEditing = useCallback(() => {
        setEditingMessageId(null);
    }, []);

    return {
        editMessage,
        deleteMessage,
        startEditing,
        cancelEditing,
        editingMessageId,
    };
}
