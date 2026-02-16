import React from 'react';
import './TypingIndicator.css';

export default function TypingIndicator({ typingUsers = [] }) {
  if (typingUsers.length === 0) return null;

  const getTypingText = () => {
    const count = typingUsers.length;
    
    if (count === 1) {
      return `${typingUsers[0]} is typing...`;
    } else if (count === 2) {
      return `${typingUsers[0]} and ${typingUsers[1]} are typing...`;
    } else {
      return `${typingUsers[0]} and ${count - 1} others are typing...`;
    }
  };

  return (
    <div className="typing-indicator">
      <div className="typing-dots">
        <span></span>
        <span></span>
        <span></span>
      </div>
      <span className="typing-text">{getTypingText()}</span>
    </div>
  );
}
