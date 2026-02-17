import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Download, Eye, Play, X } from 'lucide-react';
import './Message.css';

const formatFileSize = (bytes) => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const Message = ({ msg, currentUser, isSequence, onMediaView }) => {
  const [mediaLoaded, setMediaLoaded] = useState(false);
  
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

  const handleSaveFile = (content, fileName) => {
    const link = document.createElement('a');
    link.href = content;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderContent = () => {
    if (msg.type === 'file') {
      const fileSizeLabel = formatFileSize(msg.fileSize);
      // Check if there's a user-provided caption (text that differs from fileName)
      const hasCaption = msg.text && msg.text !== msg.fileName && msg.text !== 'Voice Message';

      // IMAGES
      if (msg.fileType && msg.fileType.startsWith('image/')) {
        if (isOwnMessage) {
          // Own images: display inline (sender already has data)
          return (
            <>
              <div className="message-image-container">
                <img src={msg.content} alt={msg.fileName} className="message-image" />
              </div>
              {hasCaption && <p className="message-caption">{msg.text}</p>}
            </>
          );
        }
        // Received images: show thumbnail card with View/Save buttons
        return (
          <>
            <div className="media-card">
              <div className="media-card-preview" onClick={() => onMediaView && onMediaView({ src: msg.content, fileName: msg.fileName, fileType: msg.fileType })}>
                {!mediaLoaded && <div className="media-card-placeholder">🖼️</div>}
                <img 
                  src={msg.content} 
                  alt={msg.fileName} 
                  className={`media-card-thumb ${mediaLoaded ? 'loaded' : ''}`}
                  onLoad={() => setMediaLoaded(true)}
                />
                <div className="media-card-overlay">
                  <Eye size={24} />
                </div>
              </div>
              <div className="media-card-footer">
                <span className="media-card-name">{msg.fileName}</span>
                {fileSizeLabel && <span className="media-card-size">{fileSizeLabel}</span>}
                <div className="media-card-actions">
                  <button className="media-action-btn" title="View" onClick={() => onMediaView && onMediaView({ src: msg.content, fileName: msg.fileName, fileType: msg.fileType })}>
                    <Eye size={14} /> View
                  </button>
                  <button className="media-action-btn" title="Save" onClick={() => handleSaveFile(msg.content, msg.fileName)}>
                    <Download size={14} /> Save
                  </button>
                </div>
              </div>
            </div>
            {hasCaption && <p className="message-caption">{msg.text}</p>}
          </>
        );
      }

      // AUDIO/VIDEO
      if (msg.fileType && (msg.fileType.startsWith('audio/') || msg.fileType.startsWith('video/'))) {
        if (isOwnMessage) {
          return (
            <div className="message-audio-container">
              <audio controls src={msg.content} className="message-audio" />
            </div>
          );
        }
        // Received audio: show play card with Save button
        return (
          <div className="media-card audio-card">
            <div className="media-card-audio-info">
              <span className="media-card-audio-icon">🎵</span>
              <div className="media-card-audio-details">
                <span className="media-card-name">{msg.fileName}</span>
                {fileSizeLabel && <span className="media-card-size">{fileSizeLabel}</span>}
              </div>
            </div>
            <audio controls src={msg.content} className="message-audio" />
            <div className="media-card-actions">
              <button className="media-action-btn" title="Save" onClick={() => handleSaveFile(msg.content, msg.fileName)}>
                <Download size={14} /> Save
              </button>
            </div>
          </div>
        );
      }

      // OTHER FILES  
      return (
        <div className="media-card file-card">
          <div className="media-card-file-info">
            <span className="media-card-file-icon">📄</span>
            <div className="media-card-file-details">
              <span className="media-card-name">{msg.fileName}</span>
              {fileSizeLabel && <span className="media-card-size">{fileSizeLabel}</span>}
            </div>
          </div>
          <div className="media-card-actions">
            <button className="media-action-btn" title="Download" onClick={() => handleSaveFile(msg.content, msg.fileName)}>
              <Download size={14} /> Download
            </button>
          </div>
        </div>
      );
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
    fileSize: PropTypes.number,
    timestamp: PropTypes.string.isRequired,
  }).isRequired,
  currentUser: PropTypes.string.isRequired,
  isSequence: PropTypes.bool,
  onMediaView: PropTypes.func,
};

export default Message;
