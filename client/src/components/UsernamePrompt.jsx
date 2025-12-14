import React, { useState } from 'react';
import PropTypes from 'prop-types';
import './UsernamePrompt.css';

const UsernamePrompt = ({ onJoin }) => {
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (username.trim()) {
      setLoading(true);
      setError('');
      
      const baseUrl = import.meta.env.VITE_BACKEND_URL || (import.meta.env.DEV ? "http://localhost:3000" : "https://YOUR-BACKEND-URL");
      
      try {
        const res = await fetch(`${baseUrl}/check-username?username=${encodeURIComponent(username.trim())}`);
        const data = await res.json();
        
        if (data.available) {
           onJoin(username.trim());
        } else {
           setError('Username is already taken. Please choose another.');
           setLoading(false);
        }
      } catch (err) {
        // Fallback or network error
        console.error("Validation error", err);
        // If check fails (e.g. server down), maybe let them try joining and let socket handle it, OR show error.
        // Let's show generic error or assume it's offline.
        setError(`Connection failed to: ${baseUrl}\nError: ${err.message}\nCheck your network or server status.`);
        setLoading(false);
      }
    }
  };

  return (
    <div className="username-prompt-overlay">
      <div className="username-prompt-box">
        <h2>Join Chat</h2>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Enter your username"
            value={username}
            onChange={(e) => {
                setUsername(e.target.value);
                setError('');
            }}
            autoFocus
            disabled={loading}
          />
          {error && <div className="error-message">{error}</div>}
          <button type="submit" disabled={loading}>
            {loading ? 'Checking...' : 'Join'}
          </button>
        </form>
      </div>
    </div>
  );
};

UsernamePrompt.propTypes = {
  onJoin: PropTypes.func.isRequired,
};

export default UsernamePrompt;
