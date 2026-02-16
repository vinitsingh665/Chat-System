const { validate, sanitizeHTML } = require('../../middleware/validation');

describe('Validation Middleware', () => {
    describe('validate username', () => {
        test('should accept valid username', () => {
            const { error, value } = validate('username', 'testuser123');
            expect(error).toBeUndefined();
            expect(value).toBe('testuser123');
        });

        test('should reject username too short', () => {
            const { error } = validate('username', 'ab');
            expect(error).toBeDefined();
            expect(error.message).toContain('at least 3 characters');
        });

        test('should reject username too long', () => {
            const { error } = validate('username', 'a'.repeat(31));
            expect(error).toBeDefined();
            expect(error.message).toContain('cannot exceed 30 characters');
        });

        test('should reject username with special characters', () => {
            const { error } = validate('username', 'test@user');
            expect(error).toBeDefined();
        });

        test('should trim whitespace', () => {
            const { value } = validate('username', '  testuser  ');
            expect(value).toBe('testuser');
        });
    });

    describe('validate room name', () => {
        test('should accept valid room name', () => {
            const { error, value } = validate('roomName', 'General Chat');
            expect(error).toBeUndefined();
            expect(value).toBe('General Chat');
        });

        test('should reject room name too short', () => {
            const { error } = validate('roomName', 'ab');
            expect(error).toBeDefined();
        });

        test('should allow spaces in room name', () => {
            const { error, value } = validate('roomName', 'Test Room 123');
            expect(error).toBeUndefined();
            expect(value).toBe('Test Room 123');
        });
    });

    describe('validate message', () => {
        test('should accept valid message', () => {
            const { error, value } = validate('message', 'Hello, world!');
            expect(error).toBeUndefined();
            expect(value).toBe('Hello, world!');
        });

        test('should reject empty message', () => {
            const { error } = validate('message', '');
            expect(error).toBeDefined();
        });

        test('should reject message too long', () => {
            const { error } = validate('message', 'a'.repeat(5001));
            expect(error).toBeDefined();
        });
    });

    describe('sanitizeHTML', () => {
        test('should escape HTML tags', () => {
            const result = sanitizeHTML('<script>alert("XSS")</script>');
            expect(result).toBe('&lt;script&gt;alert(&quot;XSS&quot;)&lt;&#x2F;script&gt;');
        });

        test('should escape special characters', () => {
            const result = sanitizeHTML('Test & "quotes" <tag>');
            expect(result).toBe('Test &amp; &quot;quotes&quot; &lt;tag&gt;');
        });

        test('should return non-string values unchanged', () => {
            expect(sanitizeHTML(null)).toBe(null);
            expect(sanitizeHTML(123)).toBe(123);
        });
    });
});
