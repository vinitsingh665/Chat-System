import React from 'react';
import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import './SettingsModal.css';

const SettingsModal = ({ isOpen, onClose, settings, onSettingsChange, onLogout, username, onUsernameChange }) => {
  const [tempUsername, setTempUsername] = useState(username || '');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setTempUsername(username || '');
    setError('');
  }, [username, isOpen]);

  if (!isOpen) return null;

  const handleSaveUsername = async () => {
    if (tempUsername.trim() && tempUsername !== username) {
      setLoading(true);
      setError('');
      
      const isNgrok = window.location.hostname.includes('ngrok') || window.location.hostname.includes('loca.lt') || window.location.hostname !== 'localhost';
      const baseUrl = isNgrok ? '' : 'http://localhost:3000';

      try {
        const res = await fetch(`${baseUrl}/check-username?username=${encodeURIComponent(tempUsername.trim())}`);
        const data = await res.json();

        if (data.available) {
           onUsernameChange(tempUsername.trim());
           // Success feedback or close? Usually settings stays open.
        } else {
           setError('Username taken');
        }
      } catch (err) {
        console.error(err);
        setError('Validation failed');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleChange = (key, value) => {
    onSettingsChange({ ...settings, [key]: value });
  };

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <h2>Settings</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        <div className="settings-content">
          {/* Profile Section */}
          {/* Profile Section */}
          <div className="setting-item profile-setting">
             <label>Username</label>
             <div className="username-edit-container">
               <input 
                 type="text" 
                 value={tempUsername}
                 onChange={(e) => setTempUsername(e.target.value)}
                 className="classic-username-input"
                 placeholder="Enter username"
               />
               <button 
                 className="update-btn" 
                 onClick={handleSaveUsername}
                 disabled={!tempUsername.trim() || tempUsername === username || loading}
               >
                 {loading ? '...' : 'Update'}
               </button>
             </div>
             {error && <div className="settings-error" style={{color: '#ff4444', fontSize: '0.8rem', marginTop: '5px'}}>{error}</div>}
          </div>

          {/* Theme Setting */}
          <div className="setting-item">
            <label>Theme</label>
            <select 
              value={settings.theme} 
              onChange={(e) => handleChange('theme', e.target.value)}
            >
              <optgroup label="Light Themes">
                <option value="indigo">Indigo</option>
                <option value="emerald">Emerald</option>
                <option value="rose">Rose</option>
                <option value="amber">Amber</option>
                <option value="cyan">Cyan</option>
              </optgroup>
              <optgroup label="Dark Themes">
                <option value="dark">Dark</option>
                <option value="sunset">Sunset</option>
                <option value="midnight">Midnight</option>
              </optgroup>
            </select>
          </div>

          {/* Font Size Setting */}
          <div className="setting-item">
            <label>Font Size</label>
            <div className="radio-group">
              <button 
                className={`radio-btn ${settings.fontSize === 'small' ? 'active' : ''}`}
                onClick={() => handleChange('fontSize', 'small')}
              >
                Small
              </button>
              <button 
                className={`radio-btn ${settings.fontSize === 'medium' ? 'active' : ''}`}
                onClick={() => handleChange('fontSize', 'medium')}
              >
                Medium
              </button>
              <button 
                className={`radio-btn ${settings.fontSize === 'large' ? 'active' : ''}`}
                onClick={() => handleChange('fontSize', 'large')}
              >
                Large
              </button>
            </div>
          </div>

          {/* Online Status Toggle */}
          <div className="setting-item">
            <label>Show Online Status</label>
            <button 
              className={`toggle-btn ${settings.showOnlineStatus ? 'active' : ''}`}
              onClick={() => handleChange('showOnlineStatus', !settings.showOnlineStatus)}
            >
              <div className="toggle-circle"></div>
            </button>
          </div>

          {/* Do Not Disturb Toggle */}
          <div className="setting-item">
            <label>Do Not Disturb</label>
            <button 
              className={`toggle-btn ${settings.dnd ? 'active' : ''}`}
              onClick={() => handleChange('dnd', !settings.dnd)}
            >
              <div className="toggle-circle"></div>
            </button>
          </div>
        </div>

        <div className="settings-footer">
          <button className="logout-btn" onClick={onLogout}>
            Logout
          </button>
        </div>
      </div>
    </div>
  );
};

SettingsModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  settings: PropTypes.shape({
    theme: PropTypes.string,
    fontSize: PropTypes.string,
    showOnlineStatus: PropTypes.bool,
    dnd: PropTypes.bool
  }).isRequired,
  onSettingsChange: PropTypes.func.isRequired,
  onLogout: PropTypes.func.isRequired,
  username: PropTypes.string,
  onUsernameChange: PropTypes.func
};

export default SettingsModal;
