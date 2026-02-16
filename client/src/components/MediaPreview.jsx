import React from 'react';
import './MediaPreview.css';

export default function MediaPreview({ url, type, onClose }) {
  const isImage = type === 'image' || /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
  const isVideo = type === 'video' || /\.(mp4|webm|ogg)$/i.test(url);

  return (
    <div className="media-preview-overlay" onClick={onClose}>
      <div className="media-preview-container" onClick={(e) => e.stopPropagation()}>
        <button className="media-preview-close" onClick={onClose}>×</button>
        
        <div className="media-preview-content">
          {isImage && (
            <img src={url} alt="Preview" className="media-preview-img" />
          )}
          
          {isVideo && (
            <video src={url} controls className="media-preview-video" />
          )}
          
          {!isImage && !isVideo && (
            <div className="media-preview-file">
              <p>File preview not available</p>
              <a href={url} target="_blank" rel="noopener noreferrer" className="download-link">
                Download file
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
