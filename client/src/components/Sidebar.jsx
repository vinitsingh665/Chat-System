import React from 'react';
import './Sidebar.css';

const Sidebar = ({ username, onSettingsClick, activeTab, onTabChange, notifications = [], onAcceptInvite, onDeclineInvite }) => {
  const [showNotifications, setShowNotifications] = React.useState(false);
  const notificationRef = React.useRef(null);

  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };

    if (showNotifications) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showNotifications]);

  console.log('Sidebar rendering', { username, notifications });

  return (
    <div className="main-sidebar">
      {/* Profile Icon moved inside nav-icons for mobile layout order */}
      
      <div className="nav-icons">
        <div 
          className={`nav-item ${activeTab === 'home' ? 'active' : ''}`}
          onClick={() => onTabChange('home')}
          title="Home"
        >
          <span className="icon">🏠</span>
        </div>
        <div 
          className={`nav-item ${activeTab === 'messages' ? 'active' : ''}`}
          onClick={() => onTabChange('messages')}
          title="Direct Messages"
        >
          <span className="icon">💬</span>
        </div>
        
        {/* Notifications */}
        <div 
          className="nav-item relative" 
          ref={notificationRef}
          onClick={() => setShowNotifications(!showNotifications)}
        >
          <span className="icon">🔔</span>
          {notifications.length > 0 && (
             <span className="notification-badge">{notifications.length}</span>
          )}
          
          {/* Notification Dropdown */}
          {showNotifications && (
             <div className="notification-dropdown">
                <h4>Notifications</h4>
                {notifications.length === 0 ? (
                    <p className="no-notes">No new notifications</p>
                ) : (
                    <ul className="note-list">
                        {notifications.map((note, idx) => (
                            <li key={idx} className="note-item">
                                {note.expired ? (
                                    <p className="expired-text">Room <strong>{note.roomName}</strong> is expired</p>
                                ) : (
                                    <p><strong>{note.from}</strong> invited you to <strong>{note.roomName}</strong></p>
                                )}
                                <div className="note-actions">
                                    {!note.expired && (
                                        <button className="btn-accept" onClick={(e) => {
                                            e.stopPropagation();
                                            onAcceptInvite(note);
                                        }}>Join</button>
                                    )}
                                    <button className="btn-decline" onClick={(e) => {
                                        e.stopPropagation();
                                        onDeclineInvite(note);
                                    }}>Dismiss</button>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
             </div>
          )}
        </div>
        
        {/* Profile now acts as Settings trigger */}
        <div className="nav-item profile-item" onClick={onSettingsClick} title="Profile & Settings">
           <div className="profile-initials">
             {username ? username.substring(0, 2).toUpperCase() : 'U'}
           </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
