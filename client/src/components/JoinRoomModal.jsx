import React, { useState } from 'react';
import PropTypes from 'prop-types';
import './CreateRoomModal.css'; // Re-using the same styles for consistency

const JoinRoomModal = ({ roomName, onClose, onJoin }) => {
  const [password, setPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onJoin(password);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3>Join {roomName}</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Enter Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Server Password"
              autoFocus
            />
          </div>
          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">Join</button>
          </div>
        </form>
      </div>
    </div>
  );
};

JoinRoomModal.propTypes = {
  roomName: PropTypes.string.isRequired,
  onClose: PropTypes.func.isRequired,
  onJoin: PropTypes.func.isRequired,
};

export default JoinRoomModal;
