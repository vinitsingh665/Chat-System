const mongoose = require('mongoose');
const logger = require('../utils/logger');
const config = require('../config');

// MongoDB connection URI - defaults to local MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/chatapp';

const connectDB = async () => {
    try {
        const options = {
            // Connection pool settings
            maxPoolSize: 10,
            minPoolSize: 2,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        };

        await mongoose.connect(MONGODB_URI, options);

        logger.info('MongoDB connected successfully');
        logger.info(`Database: ${mongoose.connection.name}`);

        // Handle connection events
        mongoose.connection.on('error', (err) => {
            logger.error('MongoDB connection error:', err);
        });

        mongoose.connection.on('disconnected', () => {
            logger.warn('MongoDB disconnected');
        });

        mongoose.connection.on('reconnected', () => {
            logger.info('MongoDB reconnected');
        });

    } catch (err) {
        logger.error('MongoDB connection failed:', err);
        logger.warn('Falling back to file-based storage');
        // Don't crash the server, allow fallback to file storage
    }
};

const disconnectDB = async () => {
    try {
        await mongoose.connection.close();
        logger.info('MongoDB connection closed');
    } catch (err) {
        logger.error('Error closing MongoDB connection:', err);
    }
};

module.exports = {
    connectDB,
    disconnectDB,
    isConnected: () => mongoose.connection.readyState === 1,
};
