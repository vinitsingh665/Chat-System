import React, { useState } from 'react';
import PropTypes from 'prop-types';
import './CreateRoomModal.css';

const CreateRoomModal = ({ onClose, onCreate }) => {
  const [roomName, setRoomName] = useState('');
  const [password, setPassword] = useState('');


  const handleSubmit = (e) => {
    e.preventDefault();
    if (roomName.trim()) {
      onCreate(roomName.trim(), password.trim() || null, 'chat');
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h3>Create Private Server</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Server Name</label>
            <input
              type="text"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              placeholder="e.g., Secret Base"
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label>Password (Optional)</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Leave empty for public"
            />
          </div>
          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">Create</button>
          </div>
        </form>
      </div>
    </div>
  );
};

CreateRoomModal.propTypes = {
  onClose: PropTypes.func.isRequired,
  onCreate: PropTypes.func.isRequired,
};

export default CreateRoomModal;
