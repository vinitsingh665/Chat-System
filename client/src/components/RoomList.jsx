import React, { useState } from 'react';
import PropTypes from 'prop-types';
import './RoomList.css';

const RoomList = ({ rooms, users = [], currentUser, currentRoom, onJoinRoom, onCreateRoomClick, onUserClick, showOnlineStatus, activeTab = 'home', unreadCounts = {}, pinnedUsers = [], onTogglePin }) => {
  console.log('RoomList Rendered. UnreadCounts:', unreadCounts);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentTime, setCurrentTime] = useState(Date.now());

  // Update timer every second for countdowns
  React.useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Filter Rooms
  const filteredRooms = rooms.filter(room => 
    room.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Filter Users (Exclude self) and Sort (Pinned first)
  const filteredUsers = users
    .filter(user => user.username !== currentUser && user.username && user.username.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => {
      const isPinnedA = pinnedUsers.includes(a.username);
      const isPinnedB = pinnedUsers.includes(b.username);
      if (isPinnedA && !isPinnedB) return -1;
      if (!isPinnedA && isPinnedB) return 1;
      return a.username.localeCompare(b.username);
    });

  return (
    <div className="middle-panel">
      {/* Search Bar */}
      <div className="search-container">
        <div className="search-bar">
          <span className="search-icon">🔍</span>
          <input 
            type="text" 
            placeholder="Search" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="lists-container">
        {/* GROUPS SECTION (Hidden in Messages Tab) */}
        {activeTab === 'home' && (
          <div className="list-section">
            <div className="section-header">
              <h3>Groups</h3>
            </div>
          <ul className="item-list">
             {/* Create New Group Item */}
            <li className="list-item create-item" onClick={onCreateRoomClick}>
              <div className="item-avatar create-avatar">+</div>
              <div className="item-info">
                <span className="item-name">Create New Group</span>
              </div>
            </li>

            {filteredRooms.map((room) => (
              <li 
                key={room.name} 
                className={`list-item ${currentRoom === room.name ? 'active' : ''}`}
                onClick={() => onJoinRoom(room)}
              >
                <div className="item-avatar">
                  <img src={`https://ui-avatars.com/api/?name=${room.name}&background=random&size=40`} alt={room.name} />
                </div>
                <div className="item-info">
                  <span className="item-name">
                    {room.name}
                  </span>
                  {room.expiry && room.expiry - currentTime <= 10000 && room.expiry - currentTime > 0 ? (
                     <span className="item-subtext" style={{ color: 'red', fontWeight: 'bold' }}>
                       Deleting in {Math.ceil((room.expiry - currentTime) / 1000)}s...
                     </span>
                  ) : (
                     <span className="item-subtext">Last active recently</span> 
                  )}
                </div>
                {room.isPrivate && <span className="lock-indicator">🔒</span>}
              </li>
            ))}
          </ul>

        </div>
        )}

        {/* PEOPLE SECTION */}
        <div className="list-section">
          <div className="section-header">
            <h3>People</h3>
          </div>
          <ul className="item-list">
            {filteredUsers.length > 0 ? (
              filteredUsers.map((user, idx) => {
                const usernameStr = user.username;
                const isDMActive = currentRoom && currentRoom.startsWith('DM:') && currentRoom.includes(usernameStr);
                const isPinned = pinnedUsers.includes(usernameStr);
                
                return (
                <li 
                  key={idx} 
                  className={`list-item ${isDMActive ? 'active' : ''} ${isPinned ? 'pinned' : ''}`}
                  onClick={() => onUserClick && onUserClick(usernameStr)}
                  style={{ cursor: 'pointer', position: 'relative' }}
                >
                  <div className="item-avatar">
                     <img src={`https://ui-avatars.com/api/?name=${usernameStr}&background=random&size=40&rounded=true`} alt={usernameStr} />
                  </div>
                  <div className="item-info">
                    <span className="item-name">
                      {usernameStr}
                      {isPinned && <span className="pinned-icon-small">📌</span>}
                    </span>
                    {unreadCounts[usernameStr] > 0 ? (
                        <span className="unread-badge">
                          {unreadCounts[usernameStr]} new message{unreadCounts[usernameStr] > 1 ? 's' : ''}
                        </span>
                    ) : (
                        showOnlineStatus && <span className="item-subtext">{user.dnd ? 'Do Not Disturb' : 'Online'}</span>
                    )}
                  </div>
                  
                  {/* Pin Action Button */}
                  <div 
                    className="pin-action"
                    onClick={(e) => {
                      e.stopPropagation(); 
                      onTogglePin(usernameStr);
                    }}
                    title={isPinned ? "Unpin user" : "Pin to top"}
                  >
                    {isPinned ? '🚫' : '📌'}
                  </div>

                  {showOnlineStatus && <span className={`online-indicator ${user.dnd ? 'dnd' : ''}`}></span>}
                </li>
                );
              })
            ) : (
               <li className="list-item no-hover">
                 <span className="item-subtext" style={{marginLeft: '10px'}}>No active users</span>
               </li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );

};

RoomList.propTypes = {
  rooms: PropTypes.arrayOf(PropTypes.shape({
    name: PropTypes.string.isRequired,
    isPrivate: PropTypes.bool.isRequired,
    type: PropTypes.string,
  })).isRequired,
  users: PropTypes.arrayOf(PropTypes.shape({
    username: PropTypes.string,
    dnd: PropTypes.bool
  })),
  currentUser: PropTypes.string.isRequired,
  currentRoom: PropTypes.string, // Can be null now
  onJoinRoom: PropTypes.func.isRequired,
  onCreateRoomClick: PropTypes.func.isRequired,
  onUserClick: PropTypes.func,
  showOnlineStatus: PropTypes.bool,
  activeTab: PropTypes.string,
  unreadCounts: PropTypes.object,
  pinnedUsers: PropTypes.array,
  onTogglePin: PropTypes.func,
};

export default RoomList;
