import { useState, useEffect, useCallback } from 'react';

/**
 * Custom hook for message reactions
 * @param {Object} socket - Socket.IO instance
 * @returns {Object} { reactions, addReaction, removeReaction }
 */
export function useReactions(socket) {
    const [reactions, setReactions] = useState({}); // messageId -> { emoji: [usernames] }

    useEffect(() => {
        if (!socket) return;

        const handleReactionUpdate = ({ messageId, reactions: updatedReactions }) => {
            setReactions(prev => ({
                ...prev,
                [messageId]: updatedReactions
            }));
        };

        socket.on('reaction-update', handleReactionUpdate);

        return () => {
            socket.off('reaction-update', handleReactionUpdate);
        };
    }, [socket]);

    const addReaction = useCallback((messageId, emoji, username) => {
        if (socket) {
            socket.emit('add-reaction', { messageId, emoji, username });
        }
    }, [socket]);

    const removeReaction = useCallback((messageId, emoji, username) => {
        if (socket) {
            socket.emit('remove-reaction', { messageId, emoji, username });
        }
    }, [socket]);

    return { reactions, addReaction, removeReaction };
}
