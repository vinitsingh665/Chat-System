import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Custom hook for typing indicators
 * @param {Object} socket - Socket.IO instance
 * @param {string} currentRoom - Current room name
 * @param {string} username - Current username
 * @returns {Object} { typingUsers, notifyTyping }
 */
export function useTypingIndicator(socket, currentRoom, username) {
    const [typingUsers, setTypingUsers] = useState([]);
    const typingTimeoutRef = useRef({});

    useEffect(() => {
        if (!socket) return;

        const handleUserTyping = ({ username: typingUsername, roomName }) => {
            if (roomName !== currentRoom || typingUsername === username) return;

            // Add user to typing list
            setTypingUsers(prev => {
                if (prev.includes(typingUsername)) return prev;
                return [...prev, typingUsername];
            });

            // Clear existing timeout for this user
            if (typingTimeoutRef.current[typingUsername]) {
                clearTimeout(typingTimeoutRef.current[typingUsername]);
            }

            // Remove user from typing list after 3 seconds
            typingTimeoutRef.current[typingUsername] = setTimeout(() => {
                setTypingUsers(prev => prev.filter(u => u !== typingUsername));
                delete typingTimeoutRef.current[typingUsername];
            }, 3000);
        };

        socket.on('user-typing', handleUserTyping);

        return () => {
            socket.off('user-typing', handleUserTyping);
            // Clear all timeouts
            Object.values(typingTimeoutRef.current).forEach(clearTimeout);
        };
    }, [socket, currentRoom, username]);

    const notifyTyping = useCallback(() => {
        if (socket && currentRoom) {
            socket.emit('typing', { roomName: currentRoom, username });
        }
    }, [socket, currentRoom, username]);

    return { typingUsers, notifyTyping };
}
