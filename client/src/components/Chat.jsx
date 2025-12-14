import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import io from 'socket.io-client';
import Message from './Message';
import RoomList from './RoomList';
import CreateRoomModal from './CreateRoomModal';
import Sidebar from './Sidebar';
import JoinRoomModal from './JoinRoomModal';
import SettingsModal from './SettingsModal';
import InviteModal from './InviteModal';
import './Chat.css';

const Chat = ({ username, onLogout, settings, onSettingsChange, onUsernameChange }) => {
  const [messages, setMessages] = useState([]);
  
  // Track join attempts to suppress alerts for invties
  const attemptingJoinRef = useRef(null);
  
  // Invite System State
  
  // Invite System State
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteRoomName, setInviteRoomName] = useState(null);
  const [notifications, setNotifications] = useState([]);

  const [inputValue, setInputValue] = useState('');
  const [connectionStatus, setConnectionStatus] = useState('Connecting...');
  
  // Room State
  const [rooms, setRooms] = useState([]);
  const [currentRoom, setCurrentRoom] = useState(null); // Default to null (Empty State)
  const [allUsers, setAllUsers] = useState([]); // RENAMED: Global user list
  const [roomUsers, setRoomUsers] = useState([]); 
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  // Join Modal State
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [targetRoom, setTargetRoom] = useState(null);
  const [showMobileMenu, setShowMobileMenu] = useState(false);


  // Unread Messages State
  const [unreadCounts, setUnreadCounts] = useState({});
  const [closingTimer, setClosingTimer] = useState(null); // Countdown for auto-close

  // Mobile View State
  const [showMobileChat, setShowMobileChat] = useState(false);

  // Sidebar Tab State
  const [activeTab, setActiveTab] = useState('home'); // 'home' or 'messages'

  // Settings State moved to App.jsx
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const messagesAreaRef = useRef(null);
  const fileInputRef = useRef(null);
  const currentRoomRef = useRef(currentRoom);
  const isInitialLoad = useRef(true);

  // Settings Effect moved to App.jsx

  useEffect(() => {
    currentRoomRef.current = currentRoom;
  }, [currentRoom]);

  // Sync DND status whenever settings change
  useEffect(() => {
     if (socketRef.current && connectionStatus === 'Online') {
        socketRef.current.emit('status-update', { dnd: settings.dnd });
     }
  }, [settings.dnd, connectionStatus]);

  // Pinned Users State
  const [pinnedUsers, setPinnedUsers] = useState(() => {
    const saved = localStorage.getItem('chat_pinned_users');
    return saved ? JSON.parse(saved) : [];
  });

  const togglePin = (userToPin) => {
    setPinnedUsers(prev => {
      const isPinned = prev.includes(userToPin);
      const newPinned = isPinned 
        ? prev.filter(u => u !== userToPin) 
        : [...prev, userToPin];
      localStorage.setItem('chat_pinned_users', JSON.stringify(newPinned));
      return newPinned;
    });
  };

  // Countdown timer effect
  useEffect(() => {
    if (closingTimer !== null && closingTimer > 0) {
       const timerId = setTimeout(() => {
          setClosingTimer(prev => prev - 1);
       }, 1000);
       return () => clearTimeout(timerId);
    }
  }, [closingTimer]);

  useEffect(() => {
    const socketUrl = import.meta.env.VITE_BACKEND_URL || (import.meta.env.DEV ? "http://localhost:3000" : "https://YOUR-BACKEND-URL");

    console.log(`Connecting to Socket.IO at: ${socketUrl}`);

    socketRef.current = io(socketUrl, {
      transports: ["websocket"]
    });

    socketRef.current.on('connect', () => {
      setConnectionStatus('Online');
      console.log('Connected to server');
      // No longer auto-joining Global Chat
      // Register presence immediately
      socketRef.current.emit('register-user', { username });
    });

    socketRef.current.on('room-invite', (invite) => {
        console.log('Received invite:', invite);
        setNotifications(prev => {
            if (prev.some(n => n.roomName === invite.roomName && n.from === invite.from)) return prev;
            return [...prev, invite];
        });
    });

    socketRef.current.on('disconnect', () => {
      setConnectionStatus('Disconnected');
    });

    socketRef.current.on('room-list', (roomList) => {
      setRooms(roomList);
    });

    socketRef.current.on('all-users', (users) => {
      setAllUsers(users);
      setRoomUsers(users); // Keep local redundant for now, but will switch usages below
    });

    socketRef.current.on('joined-room', (roomName) => {
      isInitialLoad.current = true; 
      currentRoomRef.current = roomName; 
      setCurrentRoom(roomName);
      setMessages([]); 
      // Clear unread count for this room/user if it exists
      if (roomName.startsWith('DM:')) {
         const otherUser = roomName.replace('DM:', '').split(':').filter(u => u !== username)[0];
         setUnreadCounts(prev => {
             const newCounts = { ...prev };
             delete newCounts[otherUser];
             return newCounts;
         });
      }
      // Close modal if successful join (could add error handling listener too)
      setShowJoinModal(false);
      setTargetRoom(null);
      // Remove invite notification if we successfully joined via one
      setNotifications(prev => prev.filter(n => n.roomName !== roomName));
      attemptingJoinRef.current = null; // Clear attempt
    });

    socketRef.current.on('chat-history', (history) => {
      if (Array.isArray(history)) {
         const filteredHistory = history.filter(msg => msg.roomName === currentRoomRef.current);
         setMessages(filteredHistory);
      }
    });

    socketRef.current.on('error', (err) => {
      // Handle "Room not found" specifically for invites
      if (err === 'Room not found' && attemptingJoinRef.current) {
         const failedRoom = attemptingJoinRef.current;
         setNotifications(prev => prev.map(n => 
            n.roomName === failedRoom ? { ...n, expired: true } : n
         ));
         attemptingJoinRef.current = null;
         return; // Suppress alert
      }

      alert(`Error: ${err}`);
      if (err === 'Existing user try other username') {
         onLogout(); // Reset app state to show username prompt again
      }
    });

    socketRef.current.on('force-leave-room', ({ roomName, reason }) => {
      if (roomName === currentRoomRef.current) {
         // Partner disconnected, automatic close
         console.log(`Forced leave from ${roomName}: ${reason}`);
         // Explicitly leave to sync server state
         socketRef.current.emit('leave-room', { roomName });
         // Go to empty state
         setCurrentRoom(null);
         currentRoomRef.current = null;
         setClosingTimer(null); // Clear any timer
         setShowMobileChat(false); // Mobile: Return to list view
      }
    });

    socketRef.current.on('chat-closing-warning', ({ roomName, seconds }) => {
       if (roomName === currentRoomRef.current) {
          setClosingTimer(seconds);
       }
    });

    socketRef.current.on('chat-message', (msg) => {
      if (msg.roomName === currentRoomRef.current) {
        setMessages((prev) => [...prev, msg]);
      } else {
        // Message received for a room we are not in
        if (msg.roomName.startsWith('DM:')) {
           // It's a DM, find the sender (it's the other person in the room name or msg.username)
           // If I am the receiver (which I must be to get this msg in a DM room I'm in), 
           // the sender is msg.username.
           if (msg.username !== username) {
              console.log('Incrementing unread count for:', msg.username);
              setUnreadCounts(prev => {
                 const newCounts = {
                    ...prev,
                    [msg.username]: (prev[msg.username] || 0) + 1
                 };
                 console.log('New unread counts:', newCounts);
                 return newCounts;
              });
           }
        }
      }
    });

    return () => {
      socketRef.current.disconnect();
    };
  }, []);

  // Use useLayoutEffect to scroll before paint to avoid flicker
  React.useLayoutEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    // Priority: use container scrollTop for instant jump if initial load
    if (messagesAreaRef.current) {
      if (isInitialLoad.current) {
        // Force instant jump
        messagesAreaRef.current.scrollTop = messagesAreaRef.current.scrollHeight;
        
        // Only mark initial scroll as done if we actually have messages
        if (messages.length > 0) {
          isInitialLoad.current = false;
        }
      } else if (messagesEndRef.current) {
        // Smooth scroll for new messages
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (inputValue.trim() && socketRef.current) {
       const msgData = {
        roomName: currentRoom,
        username,
        text: inputValue.trim(),
        type: 'text',
        timestamp: new Date().toISOString(),
      };
      socketRef.current.emit('chat-message', msgData);
      setInputValue('');
    }
  };
  
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file && socketRef.current) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const msgData = {
          roomName: currentRoom,
          username,
          type: 'file',
          fileType: file.type,
          fileName: file.name,
          content: evt.target.result, 
          timestamp: new Date().toISOString()
        };
        socketRef.current.emit('chat-message', msgData);
      };
      reader.readAsDataURL(file);
    }
    e.target.value = null;
  };
  
  const triggerFileInput = () => {
    fileInputRef.current.click();
  };

  const handleCreateRoom = (roomName, password, type) => {
    socketRef.current.emit('create-room', { roomName, password, type });
  };

  const handleJoinClick = (room) => {
    if (room.name === currentRoom) {
       setShowMobileChat(true); // Re-open mobile view if already in room
       return;
    }
    
    if (room.isPrivate) {
      setTargetRoom(room);
      setShowJoinModal(true);
    } else {
      socketRef.current.emit('join-room', { roomName: room.name, password: null, username });
    }
    // Switch to Mobile Chat View
    setShowMobileChat(true);
  };

  const handleConfirmJoin = (password) => {
    if (targetRoom) {
      socketRef.current.emit('join-room', { roomName: targetRoom.name, password, username });
      setShowMobileChat(true);
    }
  };

  const handleUserClick = (targetUser) => {
    if (targetUser === username) return;
    
    // Optimistically clear unread count
    setUnreadCounts(prev => {
        const newCounts = { ...prev };
        delete newCounts[targetUser];
        return newCounts;
    });

    // Emit start-dm event
    socketRef.current.emit('start-dm', { targetUsername: targetUser });
    setShowMobileChat(true);
  };

  const handleMobileBack = () => {
    setShowMobileChat(false);
    // Explicitly leave the current room (clears server state)
    if (currentRoom) {
       socketRef.current.emit('leave-room', { roomName: currentRoom });
       setCurrentRoom(null);
       currentRoomRef.current = null;
    }
  };

  const handleUsernameEdit = (newUsername) => {
    if (newUsername && newUsername !== username) {
       onUsernameChange(newUsername);
       socketRef.current.emit('change-username', { newUsername });
    }
  };

  const handleInviteUser = (targetUser) => {
      if (socketRef.current && inviteRoomName) {
          console.log(`Inviting ${targetUser} to ${inviteRoomName}`);
          socketRef.current.emit('invite-to-room', { 
              roomName: inviteRoomName, 
              targetUsername: targetUser 
          });
          // Alert removed, modal stays open for better UX
      }
  };

  return (
    <div className={`main-layout ${showMobileChat ? 'mobile-chat-active' : ''}`}>
      {/* 3-Column Layout */}
      
      {/* Col 1: Sidebar with Settings Trigger */}
      {/* Col 1: Sidebar with Settings Trigger */}
      <Sidebar 
        username={username}
        onSettingsClick={() => setShowSettingsModal(true)} 
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          setShowMobileChat(false); // Reset to list view on tab change
        }}
        notifications={notifications}
        onAcceptInvite={(note) => {
             // Leave current, join new
             if (currentRoom) socketRef.current.emit('leave-room', { roomName: currentRoom });
             attemptingJoinRef.current = note.roomName; // Track attempt
             socketRef.current.emit('join-room', { roomName: note.roomName });
             // Don't remove yet, wait for success or failure
             // We'll remove on success (joined-room) or mark expired on error
        }}
        onDeclineInvite={(note) => {
             setNotifications(prev => prev.filter(n => n !== note));
        }}
      />

      {/* Col 2: Info Panel (Rooms/Groups & People) */}
      <RoomList 
        rooms={rooms}
        users={allUsers} 
        currentUser={username}
        currentRoom={currentRoom}
        onJoinRoom={handleJoinClick}
        onCreateRoomClick={() => setShowCreateModal(true)}
        onUserClick={handleUserClick}
        showOnlineStatus={settings.showOnlineStatus}
        activeTab={activeTab}
        unreadCounts={unreadCounts}
        pinnedUsers={pinnedUsers}
        onTogglePin={togglePin}
      />

      {/* Col 3: Chat Area */}
      <div className="chat-container">
        {!currentRoom ? (
           <div className="empty-state">
              <div className="empty-state-content" style={{
                 display: 'flex',
                 flexDirection: 'column',
                 alignItems: 'center',
                 justifyContent: 'center',
                 height: '100%',
                 color: '#666',
                 textAlign: 'center'
              }}>
                 <h2>Welcome, {username}!</h2>
                 <p>Join a server or select a friend to start chatting.</p>
              </div>
           </div>
        ) : (
           <>
            <div className="chat-header">
               {/* Back Button for Mobile */}
               <button className="mobile-back-btn" onClick={handleMobileBack}>
                 ←
               </button>
               <div className="chat-header-user">
                 <div className="avatar-placeholder">
                   <img src={`https://ui-avatars.com/api/?name=${currentRoom.startsWith('DM:') ? currentRoom.replace('DM:', '').split(':').filter(u => u !== username)[0] : currentRoom}&background=random`} alt="Room" />
                 </div>
                 <div className="chat-header-info">
                   <h3>{currentRoom.startsWith('DM:') ? currentRoom.replace('DM:', '').split(':').filter(u => u !== username)[0] : currentRoom}</h3>
                   <span className="status-text">
                      {(() => {
                         // Logic to determine status text
                         if (currentRoom.startsWith('DM:')) {
                            const parts = currentRoom.replace('DM:', '').split(':');
                            // Find the part that is NOT the current username (case-insensitive check best effort)
                            const partnerName = parts.find(u => u.toLowerCase() !== username.toLowerCase()) || parts[0]; 
                            
                            // Check if partner is in allUsers (Global list)
                            const partner = allUsers.find(u => 
                                u.username.toLowerCase() === partnerName.toLowerCase()
                            );
                            if (partner) {
                                return partner.dnd ? 'Do Not Disturb' : 'Online';
                            }
                            return 'Offline';
                         }
                         return 'Active Now';
                      })()}
                   </span>
                 </div>
               </div>
               
                 <div className="header-actions">
                   {/* Desktop Actions (Hidden on Mobile) */}
                   <div className="header-actions-desktop">
                     {currentRoom && currentRoom !== 'Global Chat' && !currentRoom.startsWith('DM:') && (
                          <button 
                            className="icon-btn invite-btn" 
                            onClick={() => {
                               setInviteRoomName(currentRoom);
                               setShowInviteModal(true);
                            }}
                            title="Invite Friends"
                          >
                            👤+
                          </button>
                      )}

                   </div>

                   {/* Mobile Menu Trigger - Only for Groups (Invite) */}
                   {currentRoom && currentRoom !== 'Global Chat' && !currentRoom.startsWith('DM:') && (
                       <div className="mobile-menu-container">
                          <button 
                              className="icon-btn menu-btn" 
                              onClick={() => setShowMobileMenu(!showMobileMenu)}
                          >
                              ⋮
                          </button>
                          
                          {showMobileMenu && (
                              <>
                                  <div className="mobile-menu-overlay" onClick={() => setShowMobileMenu(false)} />
                                  <div className="mobile-menu-dropdown">
                                          <button onClick={() => {
                                              setInviteRoomName(currentRoom);
                                              setShowInviteModal(true);
                                              setShowMobileMenu(false);
                                          }}>
                                              👤+
                                          </button>
                                  </div>
                              </>
                          )}
                       </div>
                   )}
                 </div>

            </div>

             {closingTimer !== null && (
                <div className="warning-banner" style={{
                   background: '#ff4444',
                   color: 'white',
                   padding: '10px',
                   textAlign: 'center',
                   fontWeight: 'bold',
                   animation: 'pulse 1s infinite'
                }}>
                   Partner disconnected. Chat closing in {closingTimer}s...
                </div>
             )}

             <div 
               className="messages-area" 
               ref={messagesAreaRef}
             >
               {messages.map((msg, index) => {
                 // Check if previous message exists and was sent by the same user
                 const isSequence = index > 0 && messages[index - 1].username === msg.username;
                 return (
                   <Message 
                     key={index} 
                     msg={msg} 
                     currentUser={username} 
                     isSequence={isSequence}
                   />
                 );
               })}
               <div ref={messagesEndRef} />
             </div>

             <div className="input-wrapper">
               <form className="chat-input-bar" onSubmit={handleSendMessage}>
                 <button type="button" className="attach-btn" onClick={triggerFileInput}>
                    📎
                 </button>
                 <input 
                   type="file" 
                   ref={fileInputRef} 
                   onChange={handleFileSelect} 
                   style={{ display: 'none' }} 
                 />
                 
                 <input
                   type="text"
                   value={inputValue}
                   onChange={(e) => setInputValue(e.target.value)}
                   placeholder="Type your message here..."
                   disabled={connectionStatus !== 'Online'}
                 />
                 
                 <div className="input-actions">
                    <span className="icon-btn">😊</span>
                    <span className="icon-btn">📷</span>
                    {inputValue.trim() ? (
                       <button type="submit" className="send-btn">➤</button>
                    ) : (
                       <button type="button" className="mic-btn">🎤</button>
                    )}
                 </div>
               </form>
             </div>
           </>
        )}
      </div>

      {showCreateModal && (
        <CreateRoomModal 
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateRoom}
        />
      )}
      
      {showInviteModal && (
        <InviteModal 
           users={allUsers.filter(u => u.username !== username).map(u => u.username)} 
           currentRoom={inviteRoomName}
           onClose={() => setShowInviteModal(false)}
           onInvite={handleInviteUser}
        />
      )}

      {/* Join Room Modal */}
      {showJoinModal && targetRoom && (
        <JoinRoomModal
          roomName={targetRoom.name}
          onClose={() => {
            setShowJoinModal(false);
            setTargetRoom(null);
          }}
          onJoin={handleConfirmJoin}
        />
      )}

      {/* Settings Modal */}
      <SettingsModal 
        isOpen={showSettingsModal} 
        onClose={() => setShowSettingsModal(false)}
        settings={settings}
        onSettingsChange={onSettingsChange}
        onLogout={onLogout}
        username={username}
        onUsernameChange={handleUsernameEdit}
      />
    </div>
  );
};

Chat.propTypes = {
  username: PropTypes.string.isRequired,
  onLogout: PropTypes.func.isRequired,
  settings: PropTypes.object.isRequired,
  onSettingsChange: PropTypes.func.isRequired,
  onUsernameChange: PropTypes.func,
};

export default Chat;
