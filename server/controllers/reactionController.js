/**
 * Reaction controller - Handles message reactions
 */

// In-memory reaction storage (should be in database in production)
const messageReactions = new Map(); // messageId -> { emoji: Set(usernames) }

/**
 * Add reaction to a message
 */
function addReaction(io, { messageId, emoji, username }) {
    if (!messageReactions.has(messageId)) {
        messageReactions.set(messageId, {});
    }

    const reactions = messageReactions.get(messageId);

    if (!reactions[emoji]) {
        reactions[emoji] = new Set();
    }

    reactions[emoji].add(username);

    // Convert Sets to arrays for transmission
    const reactionsObj = {};
    Object.keys(reactions).forEach(em => {
        reactionsObj[em] = Array.from(reactions[em]);
    });

    // Broadcast updated reactions
    io.emit('reaction-update', { messageId, reactions: reactionsObj });
}

/**
 * Remove reaction from a message
 */
function removeReaction(io, { messageId, emoji, username }) {
    if (!messageReactions.has(messageId)) return;

    const reactions = messageReactions.get(messageId);

    if (reactions[emoji]) {
        reactions[emoji].delete(username);

        // Remove emoji if no users left
        if (reactions[emoji].size === 0) {
            delete reactions[emoji];
        }

        // Convert Sets to arrays
        const reactionsObj = {};
        Object.keys(reactions).forEach(em => {
            reactionsObj[em] = Array.from(reactions[em]);
        });

        // Broadcast updated reactions
        io.emit('reaction-update', { messageId, reactions: reactionsObj });
    }
}

/**
 * Get reactions for a message
 */
function getReactions(messageId) {
    if (!messageReactions.has(messageId)) return {};

    const reactions = messageReactions.get(messageId);
    const reactionsObj = {};

    Object.keys(reactions).forEach(emoji => {
        reactionsObj[emoji] = Array.from(reactions[emoji]);
    });

    return reactionsObj;
}

module.exports = {
    addReaction,
    removeReaction,
    getReactions,
};
