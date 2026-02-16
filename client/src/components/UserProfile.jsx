import React, { useState } from 'react';
import './UserProfile.css';

export default function UserProfile({ username, avatar, status, onUpdateProfile }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedAvatar, setEditedAvatar] = useState(avatar || '');
  const [editedStatus, setEditedStatus] = useState(status || '');

  const handleSave = () => {
    onUpdateProfile({
      avatar: editedAvatar,
      status: editedStatus,
    });
    setIsEditing(false);
  };

  const getAvatarDisplay = () => {
    if (avatar && avatar.startsWith('http')) {
      return <img src={avatar} alt={username} className="profile-avatar-img" />;
    }
    return (
      <div className="profile-avatar-placeholder">
        {username.charAt(0).toUpperCase()}
      </div>
    );
  };

  return (
    <div className="user-profile">
      <div className="profile-header">
        <div className="profile-avatar">{getAvatarDisplay()}</div>
        
        <div className="profile-info">
          <h3 className="profile-username">{username}</h3>
          {!isEditing && status && (
            <p className="profile-status">{status}</p>
          )}
        </div>

        <button
          className="profile-edit-btn"
          onClick={() => setIsEditing(!isEditing)}
        >
          {isEditing ? 'Cancel' : 'Edit'}
        </button>
      </div>

      {isEditing && (
        <div className="profile-edit-form">
          <div className="form-group">
            <label>Avatar URL</label>
            <input
              type="text"
              value={editedAvatar}
              onChange={(e) => setEditedAvatar(e.target.value)}
              placeholder="https://example.com/avatar.jpg"
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label>Status</label>
            <input
              type="text"
              value={editedStatus}
              onChange={(e) => setEditedStatus(e.target.value)}
              placeholder="What's on your mind?"
              className="form-input"
              maxLength={100}
            />
          </div>

          <button className="profile-save-btn" onClick={handleSave}>
            Save Changes
          </button>
        </div>
      )}
    </div>
  );
}
