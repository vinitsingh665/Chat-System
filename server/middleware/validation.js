const Joi = require('joi');
const config = require('../config');

// Validation schemas
const schemas = {
    username: Joi.string()
        .trim()
        .min(3)
        .max(30)
        .pattern(/^[a-zA-Z0-9_-]+$/)
        .required()
        .messages({
            'string.min': 'Username must be at least 3 characters',
            'string.max': 'Username cannot exceed 30 characters',
            'string.pattern.base': 'Username can only contain letters, numbers, underscores, and hyphens',
            'any.required': 'Username is required',
        }),

    roomName: Joi.string()
        .trim()
        .min(3)
        .max(50)
        .pattern(/^[a-zA-Z0-9 _-]+$/)
        .required()
        .messages({
            'string.min': 'Room name must be at least 3 characters',
            'string.max': 'Room name cannot exceed 50 characters',
            'string.pattern.base': 'Room name can only contain letters, numbers, spaces, underscores, and hyphens',
            'any.required': 'Room name is required',
        }),

    password: Joi.string()
        .min(4)
        .max(100)
        .allow(null, '')
        .messages({
            'string.min': 'Password must be at least 4 characters',
            'string.max': 'Password cannot exceed 100 characters',
        }),

    message: Joi.string()
        .trim()
        .min(1)
        .max(config.data.maxMessageLength)
        .required()
        .messages({
            'string.min': 'Message cannot be empty',
            'string.max': `Message cannot exceed ${config.data.maxMessageLength} characters`,
            'any.required': 'Message is required',
        }),
};

/**
 * Validate data against a schema
 * @param {string} schemaName - Name of the schema to use
 * @param {any} data - Data to validate
 * @returns {Object} { error, value }
 */
function validate(schemaName, data) {
    const schema = schemas[schemaName];
    if (!schema) {
        throw new Error(`Unknown validation schema: ${schemaName}`);
    }
    return schema.validate(data);
}

/**
 * Sanitize HTML to prevent XSS
 * @param {string} text - Text to sanitize
 * @returns {string} Sanitized text
 */
function sanitizeHTML(text) {
    if (typeof text !== 'string') return text;

    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
}

module.exports = {
    validate,
    sanitizeHTML,
    schemas,
};
