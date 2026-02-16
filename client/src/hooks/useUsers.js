import { useState, useEffect } from 'react';

/**
 * Custom hook for managing user list
 * @param {Object} socket - Socket.IO instance
 * @returns {Object} { users, pinnedUsers, togglePin }
 */
export function useUsers(socket) {
    const [users, setUsers] = useState([]);
    const [pinnedUsers, setPinnedUsers] = useState(() => {
        const saved = localStorage.getItem('chat_pinned_users');
        return saved ? JSON.parse(saved) : [];
    });

    useEffect(() => {
        if (!socket) return;

        // Listen for user list updates
        const handleAllUsers = (userList) => {
            setUsers(userList || []);
        };

        socket.on('all-users', handleAllUsers);

        return () => {
            socket.off('all-users', handleAllUsers);
        };
    }, [socket]);

    const togglePin = (username) => {
        setPinnedUsers(prev => {
            const isPinned = prev.includes(username);
            const newPinned = isPinned
                ? prev.filter(u => u !== username)
                : [...prev, username];

            localStorage.setItem('chat_pinned_users', JSON.stringify(newPinned));
            return newPinned;
        });
    };

    return {
        users,
        pinnedUsers,
        togglePin,
    };
}
