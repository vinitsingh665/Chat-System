const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
require('dotenv').config();

const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'chat-data.json');

// Middleware
app.use(cors({
  origin: "*"
}));

// Server Setup
const server = http.createServer(app);

// Socket.IO Setup
const io = new Server(server, {
  maxHttpBufferSize: 1e7, // 10 MB
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Room State
let rooms = {
  'Global Chat': { password: null, messages: [] }
};
const roomTimers = {}; // Store timeout IDs in memory to avoid JSON circular errors

// Load data on startup
function loadData() {
  if (fs.existsSync(DATA_FILE)) {
    try {
      const data = fs.readFileSync(DATA_FILE, 'utf8');
      rooms = JSON.parse(data);
      console.log('Loaded chat data from file.');
    } catch (err) {
      console.error('Error loading chat data:', err);
    }
  } else {
    console.log('No existing chat data found, starting fresh.');
  }
}

function saveData() {
  try {
    // Create a clean copy of data to save, excluding internal objects like timeouts
    const cleanRooms = {};
    for (const [name, room] of Object.entries(rooms)) {
      cleanRooms[name] = {
        password: room.password,
        messages: room.messages,
        expiry: room.expiry,
        isDirectMessage: room.isDirectMessage,
        participants: room.participants,
        type: room.type || 'chat'
      };
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(cleanRooms, null, 2));
  } catch (err) {
    console.error('Error saving chat data:', err);
  }
}

loadData();

// Initialize cleanup for existing empty rooms
Object.keys(rooms).forEach(roomName => {
  checkRoomEmpty(roomName);
});

// Run initial message cleanup
cleanupGlobalChatMessages();

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Send room list to new user
  socket.emit('room-list', getRoomList());

  socket.on('create-room', ({ roomName, password, type }) => {
    // Case-insensitive check
    const existingRoom = Object.keys(rooms).find(r => r.toLowerCase() === roomName.toLowerCase());

    if (existingRoom) {
      socket.emit('error', 'Room already exists (names are unique and case-insensitive)');
      return;
    }

    rooms[roomName] = { password, messages: [], type: type || 'chat' };
    saveData(); // Save on room creation
    io.emit('room-list', getRoomList());
    joinRoom(socket, roomName, password); // Auto-join creator
  });

  socket.on('join-room', ({ roomName, password, username }) => {
    if (username) {
      // Check for existing user with same name (simple case-insensitive check)
      // Ignore self (in case of re-join)
      const isTaken = Array.from(io.sockets.sockets.values()).some(s =>
        s.id !== socket.id &&
        s.data.username &&
        s.data.username.toLowerCase() === username.toLowerCase()
      );

      if (isTaken) {
        socket.emit('error', 'Existing user try other username');
        return;
      }

      socket.data.username = username;
    }
    joinRoom(socket, roomName, password);
  });

  socket.on('leave-room', ({ roomName }) => {
    console.log(`[Server] User ${socket.id} explicitly leaving room: ${roomName}`);
    socket.leave(roomName);
    if (socket.data.currentRoom === roomName) {
      socket.data.currentRoom = null;
    }
    checkRoomEmpty(roomName);
  });

  socket.on('change-username', ({ newUsername }) => {
    // Check uniqueness
    const isTaken = Array.from(io.sockets.sockets.values()).some(s =>
      s.id !== socket.id &&
      s.data.username &&
      s.data.username.toLowerCase() === newUsername.toLowerCase()
    );

    if (isTaken) {
      socket.emit('error', 'Username taken');
      return;
    }

    const oldName = socket.data.username;
    console.log(`[Server] User ${oldName} changed name to ${newUsername}`);
    socket.data.username = newUsername;
    // Broadcast updated user list
    broadcastGlobalUsers();
  });

  socket.on('register-user', ({ username }) => {
    if (username) {
      console.log(`[Server] Registering user: ${username}`);
      socket.data.username = username;
      broadcastGlobalUsers();
    }
  });

  // Handle DND Status Update
  socket.on('status-update', ({ dnd }) => {
    socket.data.dnd = dnd;
    // We could broadcast this if we wanted UI to show "DND" icon, but requirement is just blocking.
  });

  socket.on('chat-message', ({ roomName, ...msgData }) => {
    // Check for DND in Direct Messages
    if (rooms[roomName] && rooms[roomName].isDirectMessage) {
      // Find the other participant
      const participants = rooms[roomName].participants || []; // We saved participants in start-dm
      const recipientName = participants.find(p => p !== socket.data.username);

      if (recipientName) {
        // Find recipient socket
        // Note: In a real scaled app we'd need a better session store, but loop is fine here.
        let isRecipientDnd = false;
        for (const [id, s] of io.sockets.sockets) {
          if (s.data.username === recipientName) { // Check active sockets
            if (s.data.dnd) {
              isRecipientDnd = true;
            }
            break;
          }
        }

        if (isRecipientDnd) {
          // BLOCK THE MESSAGE
          socket.emit('chat-message', {
            roomName,
            username: 'System',
            text: `Cannot send message: User ${recipientName} is in Do Not Disturb mode.`,
            type: 'system', // or error style
            timestamp: new Date().toISOString()
          });
          return; // Stop execution
        }
      }
    }

    // Store message in memory
    const fullMsg = { ...msgData, roomName };
    if (rooms[roomName]) {
      rooms[roomName].messages.push(fullMsg);
      saveData(); // Save on new message
    }
    // Broadcast to specific room
    io.to(roomName).emit('chat-message', fullMsg);

    // For DMs, ensure recipient gets it even if not in room (for notifications)
    // Check flag OR name convention (for backward compatibility with bad saves)
    if ((rooms[roomName] && rooms[roomName].isDirectMessage) || roomName.startsWith('DM:')) {
      let participants = rooms[roomName]?.participants;

      // If participants missing (restored from bad save), derive from name
      if (!participants && roomName.startsWith('DM:')) {
        participants = roomName.replace('DM:', '').split(':');
      }

      const recipientName = (participants || []).find(p => p !== socket.data.username);

      if (recipientName) {
        // Find recipient socket
        for (const [id, s] of io.sockets.sockets) {
          if (s.data.username === recipientName) {
            // Check if they are already in the room (to avoid duplicate)
            if (!s.rooms.has(roomName)) {
              s.emit('chat-message', fullMsg);
            }
            break;
          }
        }
      }
    }
  });

  // ... rest of the socket handlers


  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    if (socket.data.isInVoice && socket.data.roomName) {
      io.to(socket.data.roomName).emit('voice-user-left', { id: socket.id });
    }

    const username = socket.data.username;
    if (username) {
      // Ephemeral DMs: Delete any DM involving this user
      Object.keys(rooms).forEach(roomName => {
        if (rooms[roomName].isDirectMessage && rooms[roomName].participants && rooms[roomName].participants.includes(username)) {

          // Notify other participants immediately about pending closure
          const otherUser = rooms[roomName].participants.find(p => p !== username);
          console.log(`[Server] User ${username} disconnected. Warning ${otherUser} about DM ${roomName} closure in 10s.`);

          if (otherUser) {
            const allSockets = Array.from(io.sockets.sockets.values());
            const otherSocket = allSockets.find(s =>
              s.data.username && s.data.username.toLowerCase() === otherUser.toLowerCase()
            );

            if (otherSocket) {
              otherSocket.emit('chat-closing-warning', {
                roomName,
                seconds: 10,
                reason: 'Chat partner disconnected'
              });
            }
          }

          // Schedule deletion in 10 seconds
          setTimeout(() => {
            // Re-check if room still exists (it might have been deleted or handled otherwise)
            if (rooms[roomName]) {
              console.log(`[Server] Executing delayed deletion for DM ${roomName}.`);

              // Notify partner to actually leave now
              if (otherUser) {
                const allSockets = Array.from(io.sockets.sockets.values());
                const otherSocket = allSockets.find(s =>
                  s.data.username && s.data.username.toLowerCase() === otherUser.toLowerCase()
                );

                if (otherSocket) {
                  console.log(`[Server] Forcing ${otherUser} to leave ${roomName} now.`);
                  otherSocket.emit('force-leave-room', {
                    roomName,
                    reason: 'Chat partner disconnected'
                  });
                }
              }
              delete rooms[roomName];
              saveData(); // Save state after deletion
            }
          }, 10000); // 10 seconds delay
        }
      });
      saveData();
    }

    // Update global user list
    broadcastGlobalUsers();

    // Update room specific things if needed (like clearing empty rooms)
    if (socket.data.currentRoom) {
      checkRoomEmpty(socket.data.currentRoom);
    }
  });




  // --- Direct Messaging ---
  socket.on('start-dm', ({ targetUsername }) => {
    console.log(`[Server] Received start-dm from ${socket.data.username} to ${targetUsername}`);
    const senderUsername = socket.data.username;
    if (!senderUsername || !targetUsername) {
      console.log('[Server] Missing usernames for DM');
      return;
    }

    // Find target socket
    let targetSocket = null;
    for (const [id, s] of io.sockets.sockets) {
      if (s.data.username === targetUsername) {
        targetSocket = s;
        break;
      }
    }

    if (targetSocket) {
      console.log(`[Server] Target user ${targetUsername} found (Socket ID: ${targetSocket.id})`);
      // Create unique DM room name
      const participants = [senderUsername, targetUsername].sort();
      const dmRoomName = `DM:${participants.join(':')}`;
      console.log(`[Server] DM Room Name: ${dmRoomName}`);

      // Initialize room if not exists
      if (!rooms[dmRoomName]) {
        console.log(`[Server] Creating new DM room: ${dmRoomName}`);
        rooms[dmRoomName] = {
          isDirectMessage: true,
          messages: [],
          participants
        };
        saveData();
      }

      // Join sender only
      console.log(`[Server] Joining sender ${senderUsername} to ${dmRoomName}`);
      joinRoom(socket, dmRoomName, null);

      // Do NOT force join the target. They will join when they click the user (triggering start-dm or join-room).
      // Messages will be delivered via the "isDirectMessage" fallback in chat-message handler.
    } else {
      console.log(`[Server] Target user ${targetUsername} NOT found`);
      socket.emit('error', 'User not found or offline');
    }
  });

  socket.on('invite-to-room', ({ roomName, targetUsername }) => {
    console.log(`[Server] Received invite from ${socket.data.username} to ${targetUsername} for ${roomName}`);

    // Find target socket
    let targetSocket = null;
    for (const [id, s] of io.sockets.sockets) {
      if (s.data.username === targetUsername) {
        targetSocket = s;
        break;
      }
    }

    if (targetSocket) {
      targetSocket.emit('room-invite', {
        roomName,
        from: socket.data.username
      });
      console.log(`[Server] Invitation sent to ${targetSocket.data.username}`);
    } else {
      console.log(`[Server] User ${targetUsername} not found for invite`);
      // Optional: emit error back to sender
    }
  });
});

function joinRoom(socket, roomName, password) {
  const room = rooms[roomName];
  if (!room) {
    socket.emit('error', 'Room not found');
    return;
  }

  if (room.password && room.password !== password) {
    socket.emit('error', 'Incorrect password');
    return;
  }

  // Leave previous rooms (keeping it simple: 1 room at a time)
  // Use Array.from or spread to create a copy, as leaving modifies the Set
  console.log(`[Server] User ${socket.id} switching rooms. Current:`, [...socket.rooms]);
  [...socket.rooms].forEach(r => {
    if (r !== socket.id) {
      console.log(`[Server] User ${socket.id} leaving room: ${r}`);
      socket.leave(r);
      checkRoomEmpty(r); // Check the room the user just left
    }
  });

  console.log(`[Server] User ${socket.id} joining room: ${roomName}`);
  socket.join(roomName);
  socket.data.currentRoom = roomName; // Track current room for disconnect
  socket.emit('joined-room', roomName);

  // System Message: User Joined (Skip for DMs)
  if (!room.isDirectMessage && !roomName.startsWith('DM:')) {
    const systemMsg = {
      roomName,
      username: 'System',
      text: `${socket.data.username || 'A user'} joined the chat`,
      type: 'system',
      timestamp: new Date().toISOString()
    };

    if (rooms[roomName]) {
      rooms[roomName].messages.push(systemMsg);
      saveData();
    }

    io.to(roomName).emit('chat-message', systemMsg);
  }

  // Send chat history (now includes the join message)
  socket.emit('chat-history', room.messages);
  // Broadcast active users globally
  broadcastGlobalUsers();

  // Check if room was marked for deletion and cancel it
  checkRoomEmpty(roomName);
}

async function broadcastGlobalUsers() {
  const sockets = await io.fetchSockets();
  // Filter out users who haven't set a username yet and map to objects
  const users = sockets
    .filter(s => s.data.username)
    .map(s => ({
      username: s.data.username,
      dnd: !!s.data.dnd
    }));

  // Dedup - in case of multiple tabs, latest writes wins or similar.
  const uniqueUsersMap = new Map();
  users.forEach(u => uniqueUsersMap.set(u.username, u));
  const uniqueUsers = Array.from(uniqueUsersMap.values());

  io.emit('all-users', uniqueUsers);
}

function getRoomList() {
  return Object.keys(rooms)
    .filter(name => !rooms[name].isDirectMessage && !name.startsWith('DM:')) // Filter out DMs (checking name too for safety)
    .map(name => ({
      name,
      isPrivate: !!rooms[name].password,
      expiry: rooms[name].expiry || null, // Send expiry time to client
      type: rooms[name].type || 'chat'
    }));
}

// Room Cleanup Logic
// Room Cleanup Logic
const PUBLIC_ROOM_TIMEOUT = 60 * 1000; // 1 minute
const PRIVATE_ROOM_TIMEOUT = 60 * 60 * 1000; // 1 hour
const MESSAGE_RETENTION_LIMIT = 24 * 60 * 60 * 1000; // 24 hours

function cleanupGlobalChatMessages() {
  const globalChat = rooms['Global Chat'];
  if (!globalChat || !globalChat.messages) return;

  const now = Date.now();
  const initialCount = globalChat.messages.length;

  globalChat.messages = globalChat.messages.filter(msg => {
    // If msg.timestamp is undefined, keep it (safe fallback). 
    // Otherwise, check if it's older than 24h.
    if (!msg.timestamp) return true;
    const msgTime = new Date(msg.timestamp).getTime();
    return (now - msgTime) < MESSAGE_RETENTION_LIMIT;
  });

  const finalCount = globalChat.messages.length;
  if (finalCount < initialCount) {
    console.log(`[Server] Cleaned up ${initialCount - finalCount} old messages from Global Chat.`);
    saveData();
  }
}

// Run cleanup every hour
setInterval(cleanupGlobalChatMessages, 60 * 60 * 1000);

async function checkRoomEmpty(roomName) {
  if (roomName === 'Global Chat') return;
  if (!rooms[roomName]) return;

  // DMs should persist indefinitely (or until manual cleanup)
  if (rooms[roomName].isDirectMessage || roomName.startsWith('DM:')) return;

  const sockets = await io.in(roomName).fetchSockets();
  if (sockets.length === 0) {
    if (!rooms[roomName].expiry) {
      // Determine timeout based on room type
      const timeoutDuration = rooms[roomName].password ? PRIVATE_ROOM_TIMEOUT : PUBLIC_ROOM_TIMEOUT;

      rooms[roomName].expiry = Date.now() + timeoutDuration;
      console.log(`[Server] Room "${roomName}" is empty. Deleting in ${timeoutDuration / 1000}s...`);

      // Cancel any existing timer to avoid duplicates
      if (roomTimers[roomName]) clearTimeout(roomTimers[roomName]);

      roomTimers[roomName] = setTimeout(() => {
        if (rooms[roomName]) { // Check if it still exists
          console.log(`[Server] Deleting room "${roomName}" due to inactivity.`);
          delete rooms[roomName];
          delete roomTimers[roomName]; // Clean up timer reference
          saveData();
          io.emit('room-list', getRoomList());
        }
      }, timeoutDuration);

      saveData();
      io.emit('room-list', getRoomList());
    } else if (!roomTimers[roomName]) {
      // Expiry exists but no timer (e.g. server restart)
      const remainingTime = rooms[roomName].expiry - Date.now();
      if (remainingTime > 0) {
        console.log(`[Server] Restoring timer for "${roomName}". Deleting in ${remainingTime / 1000}s...`);
        roomTimers[roomName] = setTimeout(() => {
          if (rooms[roomName]) {
            console.log(`[Server] Deleting room "${roomName}" due to inactivity.`);
            delete rooms[roomName];
            delete roomTimers[roomName];
            saveData();
            io.emit('room-list', getRoomList());
          }
        }, remainingTime);
      } else {
        // Expired while offline
        console.log(`[Server] Room "${roomName}" expired while offline. Deleting now.`);
        delete rooms[roomName];
        saveData();
        io.emit('room-list', getRoomList());
      }
    }
  } else {
    // Room is not empty, clear any pending deletion
    if (rooms[roomName].expiry) {
      console.log(`[Server] Room "${roomName}" is active again. Deletion cancelled.`);

      if (roomTimers[roomName]) {
        clearTimeout(roomTimers[roomName]);
        delete roomTimers[roomName];
      }

      delete rooms[roomName].expiry;
      // Note: we don't delete timeoutId from rooms anymore because it's not there

      saveData();
      io.emit('room-list', getRoomList());
    }
  }
}

// Check Username Availability
app.get('/check-username', (req, res) => {
  const { username } = req.query;
  if (!username) {
    return res.status(400).json({ error: 'Username required' });
  }

  const isTaken = Array.from(io.sockets.sockets.values()).some(s =>
    s.data.username &&
    s.data.username.toLowerCase() === username.toLowerCase()
  );

  res.json({ available: !isTaken });
});

// Basic Route for testing
app.get('/', (req, res) => {
  res.send('Chat Server is running');
});

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
