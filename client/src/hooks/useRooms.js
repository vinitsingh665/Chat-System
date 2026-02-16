import { useState, useEffect } from 'react';

/**
 * Custom hook for managing rooms
 * @param {Object} socket - Socket.IO instance
 * @returns {Object} { rooms, currentRoom, setCurrentRoom }
 */
export function useRooms(socket) {
    const [rooms, setRooms] = useState([]);
    const [currentRoom, setCurrentRoom] = useState(null);

    useEffect(() => {
        if (!socket) return;

        // Listen for room list updates
        const handleRoomList = (roomList) => {
            setRooms(roomList || []);
        };

        // Listen for successful room join
        const handleJoinedRoom = (roomName) => {
            setCurrentRoom(roomName);
        };

        socket.on('room-list', handleRoomList);
        socket.on('joined-room', handleJoinedRoom);

        return () => {
            socket.off('room-list', handleRoomList);
            socket.off('joined-room', handleJoinedRoom);
        };
    }, [socket]);

    const joinRoom = (roomName, password) => {
        if (socket) {
            socket.emit('join-room', { roomName, password });
        }
    };

    const leaveRoom = (roomName) => {
        if (socket) {
            socket.emit('leave-room', { roomName });
            setCurrentRoom(null);
        }
    };

    const createRoom = (roomName, password, type = 'chat') => {
        if (socket) {
            socket.emit('create-room', { roomName, password, type });
        }
    };

    return {
        rooms,
        currentRoom,
        setCurrentRoom,
        joinRoom,
        leaveRoom,
        createRoom,
    };
}
