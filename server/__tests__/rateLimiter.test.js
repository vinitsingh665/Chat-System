const { socketRateLimiter } = require('../../middleware/rateLimiter');

describe('Rate Limiter', () => {
    let limiter;

    beforeEach(() => {
        limiter = socketRateLimiter;
    });

    afterEach(() => {
        // Clean up
        limiter.messageTimestamps.clear();
        limiter.roomCreationTimestamps.clear();
    });

    describe('Message Rate Limiting', () => {
        test('should allow messages under the limit', () => {
            const socketId = 'test-socket-1';

            for (let i = 0; i < 10; i++) {
                const result = limiter.checkMessageRate(socketId);
                expect(result).toBe(true);
            }
        });

        test('should block messages over the limit', () => {
            const socketId = 'test-socket-2';

            // Send 10 messages (at the limit)
            for (let i = 0; i < 10; i++) {
                limiter.checkMessageRate(socketId);
            }

            // 11th message should be blocked
            const result = limiter.checkMessageRate(socketId);
            expect(result).toBe(false);
        });

        test('should reset after time window', async () => {
            const socketId = 'test-socket-3';

            // Fill the limit
            for (let i = 0; i < 10; i++) {
                limiter.checkMessageRate(socketId);
            }

            // Wait for time window to pass
            await new Promise(resolve => setTimeout(resolve, 1100));

            // Should allow messages again
            const result = limiter.checkMessageRate(socketId);
            expect(result).toBe(true);
        });
    });

    describe('Room Creation Rate Limiting', () => {
        test('should allow room creation under the limit', () => {
            const socketId = 'test-socket-4';

            for (let i = 0; i < 5; i++) {
                const result = limiter.checkRoomCreationRate(socketId);
                expect(result).toBe(true);
            }
        });

        test('should block room creation over the limit', () => {
            const socketId = 'test-socket-5';

            // Create 5 rooms (at the limit)
            for (let i = 0; i < 5; i++) {
                limiter.checkRoomCreationRate(socketId);
            }

            // 6th room should be blocked
            const result = limiter.checkRoomCreationRate(socketId);
            expect(result).toBe(false);
        });
    });

    describe('Cleanup', () => {
        test('should cleanup socket data', () => {
            const socketId = 'test-socket-6';

            limiter.checkMessageRate(socketId);
            limiter.checkRoomCreationRate(socketId);

            expect(limiter.messageTimestamps.has(socketId)).toBe(true);
            expect(limiter.roomCreationTimestamps.has(socketId)).toBe(true);

            limiter.cleanup(socketId);

            expect(limiter.messageTimestamps.has(socketId)).toBe(false);
            expect(limiter.roomCreationTimestamps.has(socketId)).toBe(false);
        });
    });
});
