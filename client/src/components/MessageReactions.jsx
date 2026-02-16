import React, { useState } from 'react';
import './MessageReactions.css';

const COMMON_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🎉', '🔥', '👏'];

export default function MessageReactions({ messageId, reactions = {}, onAddReaction, onRemoveReaction, currentUsername }) {
  const [showPicker, setShowPicker] = useState(false);

  const handleEmojiClick = (emoji) => {
    const userReacted = reactions[emoji]?.includes(currentUsername);
    
    if (userReacted) {
      onRemoveReaction(messageId, emoji, currentUsername);
    } else {
      onAddReaction(messageId, emoji, currentUsername);
    }
    
    setShowPicker(false);
  };

  const totalReactions = Object.values(reactions).reduce((sum, users) => sum + users.length, 0);

  return (
    <div className="message-reactions">
      {/* Display existing reactions */}
      <div className="reaction-list">
        {Object.entries(reactions).map(([emoji, users]) => (
          users.length > 0 && (
            <button
              key={emoji}
              className={`reaction-badge ${users.includes(currentUsername) ? 'user-reacted' : ''}`}
              onClick={() => handleEmojiClick(emoji)}
              title={users.join(', ')}
            >
              <span className="reaction-emoji">{emoji}</span>
              <span className="reaction-count">{users.length}</span>
            </button>
          )
        ))}
      </div>

      {/* Add reaction button */}
      <div className="reaction-add">
        <button
          className="add-reaction-btn"
          onClick={() => setShowPicker(!showPicker)}
          title="Add reaction"
        >
          +
        </button>

        {showPicker && (
          <div className="emoji-picker">
            {COMMON_EMOJIS.map(emoji => (
              <button
                key={emoji}
                className="emoji-option"
                onClick={() => handleEmojiClick(emoji)}
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
