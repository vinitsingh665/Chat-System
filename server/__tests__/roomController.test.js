const roomController = require('../../controllers/roomController');

describe('Room Controller', () => {
    describe('getRoomList', () => {
        test('should filter out DMs from room list', () => {
            const rooms = {
                'Global Chat': { messages: [] },
                'Test Room': { password: 'hashed123', messages: [] },
                'DM:alice:bob': { isDirectMessage: true, messages: [] },
            };

            const result = roomController.getRoomList(rooms);

            expect(result).toHaveLength(2);
            expect(result.find(r => r.name === 'Global Chat')).toBeDefined();
            expect(result.find(r => r.name === 'Test Room')).toBeDefined();
            expect(result.find(r => r.name.startsWith('DM:'))).toBeUndefined();
        });

        test('should indicate private rooms', () => {
            const rooms = {
                'Public Room': { messages: [] },
                'Private Room': { password: 'hashed', messages: [] },
            };

            const result = roomController.getRoomList(rooms);

            const publicRoom = result.find(r => r.name === 'Public Room');
            const privateRoom = result.find(r => r.name === 'Private Room');

            expect(publicRoom.isPrivate).toBe(false);
            expect(privateRoom.isPrivate).toBe(true);
        });
    });

    describe('createRoom', () => {
        test('should create room with hashed password', async () => {
            const room = await roomController.createRoom('Test', 'secret123', 'chat', 'testuser');

            expect(room).toHaveProperty('password');
            expect(room.password).not.toBe('secret123');
            expect(room.password).toMatch(/^\$2[ab]\$/); // bcrypt hash pattern
            expect(room.type).toBe('chat');
            expect(room.createdBy).toBe('testuser');
        });

        test('should create room without password', async () => {
            const room = await roomController.createRoom('Test', null, 'chat', 'testuser');

            expect(room.password).toBeNull();
        });
    });

    describe('verifyRoomPassword', () => {
        test('should verify correct password', async () => {
            const room = await roomController.createRoom('Test', 'secret123', 'chat', 'testuser');
            const result = await roomController.verifyRoomPassword(room.password, 'secret123');

            expect(result).toBe(true);
        });

        test('should reject incorrect password', async () => {
            const room = await roomController.createRoom('Test', 'secret123', 'chat', 'testuser');
            const result = await roomController.verifyRoomPassword(room.password, 'wrong');

            expect(result).toBe(false);
        });

        test('should allow access to room without password', async () => {
            const result = await roomController.verifyRoomPassword(null, null);
            expect(result).toBe(true);
        });
    });

    describe('findRoomCaseInsensitive', () => {
        test('should find room with different case', () => {
            const rooms = {
                'TestRoom': {},
                'AnotherRoom': {},
            };

            const result = roomController.findRoomCaseInsensitive(rooms, 'testroom');
            expect(result).toBe('TestRoom');
        });

        test('should return undefined for non-existent room', () => {
            const rooms = {
                'TestRoom': {},
            };

            const result = roomController.findRoomCaseInsensitive(rooms, 'nonexistent');
            expect(result).toBeUndefined();
        });
    });

    describe('createSystemMessage', () => {
        test('should create system message', () => {
            const msg = roomController.createSystemMessage('TestRoom', 'User joined');

            expect(msg.roomName).toBe('TestRoom');
            expect(msg.username).toBe('System');
            expect(msg.text).toBe('User joined');
            expect(msg.type).toBe('system');
            expect(msg).toHaveProperty('timestamp');
        });
    });
});
