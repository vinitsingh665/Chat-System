const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        minlength: 3,
        maxlength: 30,
    },
    email: {
        type: String,
        sparse: true, // Allow null, but must be unique if set
        lowercase: true,
        trim: true,
    },
    password: {
        type: String, // For future authentication
    },
    avatar: {
        type: String,
        default: null,
    },
    status: {
        type: String,
        enum: ['online', 'offline', 'away', 'dnd'],
        default: 'offline',
    },
    lastSeen: {
        type: Date,
        default: Date.now,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

// Indexes
userSchema.index({ username: 1 });
userSchema.index({ email: 1 });

const User = mongoose.model('User', userSchema);

module.exports = User;
