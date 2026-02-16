const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        maxlength: 50,
    },
    password: {
        type: String, // Hashed password
        default: null,
    },
    type: {
        type: String,
        enum: ['chat', 'voice', 'video'],
        default: 'chat',
    },
    isDirectMessage: {
        type: Boolean,
        default: false,
    },
    participants: [{
        type: String,
    }],
    createdBy: {
        type: String,
        required: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    expiry: {
        type: Date,
        default: null,
    },
    lastActivity: {
        type: Date,
        default: Date.now,
    },
});

// Index for searching rooms
roomSchema.index({ name: 1 });
roomSchema.index({ isDirectMessage: 1 });
roomSchema.index({ participants: 1 });

const Room = mongoose.model('Room', roomSchema);

module.exports = Room;
