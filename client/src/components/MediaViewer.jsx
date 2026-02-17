import React from 'react';
import { X, Download } from 'lucide-react';
import './MediaViewer.css';

const MediaViewer = ({ data, onClose }) => {
  if (!data) return null;

  const handleSave = () => {
    const link = document.createElement('a');
    link.href = data.src;
    link.download = data.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="media-viewer-overlay" onClick={onClose}>
      <div className="media-viewer-content" onClick={(e) => e.stopPropagation()}>
        <div className="media-viewer-header">
          <span className="media-viewer-title">{data.fileName}</span>
          <div className="media-viewer-actions">
            <button className="media-viewer-btn" onClick={handleSave} title="Save">
              <Download size={18} />
            </button>
            <button className="media-viewer-btn" onClick={onClose} title="Close">
              <X size={18} />
            </button>
          </div>
        </div>
        <div className="media-viewer-body">
          {data.fileType?.startsWith('image/') && (
            <img src={data.src} alt={data.fileName} className="media-viewer-image" />
          )}
          {data.fileType?.startsWith('audio/') && (
            <audio controls src={data.src} className="media-viewer-audio" autoPlay />
          )}
          {data.fileType?.startsWith('video/') && (
            <video controls src={data.src} className="media-viewer-video" autoPlay />
          )}
        </div>
      </div>
    </div>
  );
};

export default MediaViewer;
