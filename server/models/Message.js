const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    roomName: {
        type: String,
        required: true,
        index: true,
    },
    username: {
        type: String,
        required: true,
    },
    text: {
        type: String,
        required: true,
        maxlength: 5000,
    },
    type: {
        type: String,
        enum: ['user', 'system', 'file'],
        default: 'user',
    },
    timestamp: {
        type: Date,
        default: Date.now,
        index: true,
    },
    fileUrl: String,
    fileName: String,
    fileSize: Number,
});

// Index for efficient pagination
messageSchema.index({ roomName: 1, timestamp: -1 });

const Message = mongoose.model('Message', messageSchema);

module.exports = Message;
