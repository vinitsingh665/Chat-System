import React from 'react';
import PropTypes from 'prop-types';
import './Message.css';

const Message = ({ msg, currentUser, isSequence }) => {
  if (!msg) return null;
  
  // Handle System Messages
  if (msg.type === 'system') {
    return (
      <div className="message-container system-message-container">
        <div className="system-message-text">{msg.text}</div>
      </div>
    );
  }

  const isOwnMessage = msg.username === currentUser;

  const renderContent = () => {
    if (msg.type === 'file') {
      if (msg.fileType && msg.fileType.startsWith('image/')) {
        return (
          <div className="message-image-container">
            <img src={msg.content} alt={msg.fileName} className="message-image" />
          </div>
        );
      } else {
        return (
          <div className="message-file-link">
             📄 <a href={msg.content} download={msg.fileName}>{msg.fileName}</a>
          </div>
        );
      }
    }
    return <p className="message-text">{msg.text}</p>;
  };

  return (
    <div className={`message-container ${isOwnMessage ? 'own-message' : 'other-message'} ${isSequence ? 'sequence-message' : ''}`}>
      <div className="message-bubble">
        {/* Only show sender name if it's NOT a sequence and NOT own message */}
        {!isSequence && !isOwnMessage && (
          <div className="message-sender">{msg.username}</div>
        )}
        {renderContent()}
        <div className="message-timestamp">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
      </div>
    </div>
  );
};

Message.propTypes = {
  msg: PropTypes.shape({
    username: PropTypes.string.isRequired,
    text: PropTypes.string,
    type: PropTypes.string,
    content: PropTypes.string,
    fileName: PropTypes.string,
    fileType: PropTypes.string,
    timestamp: PropTypes.string.isRequired,
  }).isRequired,
  currentUser: PropTypes.string.isRequired,
  isSequence: PropTypes.bool,
};

export default Message;
