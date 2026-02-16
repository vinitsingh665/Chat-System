import { useState, useEffect, useRef } from 'react';

/**
 * Custom hook for managing messages
 * @param {Object} socket - Socket.IO instance
 * @param {string} currentRoom - Current room name
 * @returns {Object} { messages, addMessage, clearMessages, setMessages }
 */
export function useMessages(socket, currentRoom) {
    const [messages, setMessages] = useState([]);
    const currentRoomRef = useRef(currentRoom);

    useEffect(() => {
        currentRoomRef.current = currentRoom;
    }, [currentRoom]);

    useEffect(() => {
        if (!socket) return;

        // Listen for new messages
        const handleMessage = (message) => {
            // Only add if message is for current room
            if (message.roomName === currentRoomRef.current) {
                setMessages(prev => [...prev, message]);
            }
        };

        // Listen for chat history
        const handleHistory = (history) => {
            setMessages(history || []);
        };

        socket.on('chat-message', handleMessage);
        socket.on('chat-history', handleHistory);

        return () => {
            socket.off('chat-message', handleMessage);
            socket.off('chat-history', handleHistory);
        };
    }, [socket]);

    const addMessage = (message) => {
        setMessages(prev => [...prev, message]);
    };

    const clearMessages = () => {
        setMessages([]);
    };

    return {
        messages,
        addMessage,
        clearMessages,
        setMessages,
    };
}
