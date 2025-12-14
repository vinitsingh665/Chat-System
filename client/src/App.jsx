import React, { useState } from 'react';
import Chat from './components/Chat';
import UsernamePrompt from './components/UsernamePrompt';
import './index.css';

function App() {
  const [username, setUsername] = useState('');
  
  // Lifted Settings State
  const [settings, setSettings] = useState({
    theme: 'olive', // olive, light, dark
    fontSize: 'medium', // small, medium, large
    showOnlineStatus: true,
    dnd: false,
  });

  // Apply Settings Effect (Global)
  React.useEffect(() => {
    const root = document.documentElement;
    // Reset classes
    root.classList.remove('theme-light', 'theme-dark', 'font-small', 'font-medium', 'font-large');
    
    // Apply Theme
    if (settings.theme !== 'olive') {
      root.classList.add(`theme-${settings.theme}`);
    }
    
    // Apply Font Size
    root.classList.add(`font-${settings.fontSize}`);

  }, [settings]);

  const handleJoin = (name) => {
    setUsername(name);
  };

  const handleLogout = () => {
    setUsername('');
    // Optional: Disconnect socket here if managed globally, but Chat handles its own socket.
  };

  return (
    <div className="app-container">
      {!username ? (
        <UsernamePrompt onJoin={handleJoin} />
      ) : (
        <Chat 
          username={username} 
          onLogout={handleLogout} 
          settings={settings}
          onSettingsChange={setSettings}
          onUsernameChange={setUsername}
        />
      )}
    </div>
  );
}

export default App;
