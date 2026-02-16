import { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';

/**
 * Custom hook for managing Socket.IO connection
 * @param {string} username - Current username
 * @returns {Object} { socket, connectionStatus }
 */
export function useSocket(username) {
    const [socket, setSocket] = useState(null);
    const [connectionStatus, setConnectionStatus] = useState('Connecting...');
    const socketRef = useRef(null);

    useEffect(() => {
        // Determine socket URL based on environment
        const isNgrok = window.location.hostname.includes('ngrok') ||
            window.location.hostname.includes('loca.lt') ||
            window.location.hostname !== 'localhost';
        const socketUrl = isNgrok ? '/' : 'http://localhost:3000';

        console.log(`Connecting to Socket.IO at: ${socketUrl}`);

        // Create socket connection
        const newSocket = io(socketUrl);
        socketRef.current = newSocket;
        setSocket(newSocket);

        // Connection event handlers
        newSocket.on('connect', () => {
            setConnectionStatus('Online');
            console.log('Connected to server');

            // Register user immediately on connect
            if (username) {
                newSocket.emit('register-user', { username });
            }
        });

        newSocket.on('disconnect', () => {
            setConnectionStatus('Disconnected');
            console.log('Disconnected from server');
        });

        newSocket.on('reconnect', () => {
            setConnectionStatus('Online');
            console.log('Reconnected to server');

            // Re-register user on reconnect
            if (username) {
                newSocket.emit('register-user', { username });
            }
        });

        // Cleanup on unmount
        return () => {
            newSocket.close();
        };
    }, [username]);

    return { socket, connectionStatus };
}
