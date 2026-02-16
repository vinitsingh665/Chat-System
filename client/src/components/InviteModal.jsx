import React, { useState } from 'react';
import PropTypes from 'prop-types';
import './InviteModal.css';

const InviteModal = ({ users, onClose, onInvite, currentRoom }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [invitedUsers, setInvitedUsers] = useState([]);

  // Filter users: exclude self is handled by parent passing filtered list or we do it here?
  // Use simple filtering here.
  const filteredUsers = users.filter(user => 
    user.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleInviteClick = (user) => {
    onInvite(user);
    setInvitedUsers([...invitedUsers, user]);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content invite-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
            <h3>Invite Friends to {currentRoom}</h3>
            <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        <input
          type="text"
          placeholder="Search friends..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="invite-search"
          autoFocus
        />

        <ul className="invite-list">
            {filteredUsers.length > 0 ? (
                filteredUsers.map(user => {
                    const isInvited = invitedUsers.includes(user);
                    return (
                        <li key={user} className="invite-item">
                            <div className="invite-user-info">
                                <div className="invite-avatar">
                                    <img src={`https://ui-avatars.com/api/?name=${user}&background=random&rounded=true`} alt={user} />
                                </div>
                                <span className="invite-username">{user}</span>
                            </div>
                            <button 
                                className={`btn-invite ${isInvited ? 'sent' : ''}`} 
                                onClick={() => !isInvited && handleInviteClick(user)}
                                disabled={isInvited}
                            >
                                {isInvited ? 'Sent' : 'Invite'}
                            </button>
                        </li>
                    );
                })
            ) : (
                <li className="no-results">No users found</li>
            )}
        </ul>
      </div>
    </div>
  );
};

InviteModal.propTypes = {
  users: PropTypes.arrayOf(PropTypes.string).isRequired,
  onClose: PropTypes.func.isRequired,
  onInvite: PropTypes.func.isRequired,
  currentRoom: PropTypes.string,
};

export default InviteModal;
