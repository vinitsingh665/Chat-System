const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const bcrypt = require('bcrypt');
const debounce = require('lodash.debounce');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');

// Load environment configuration
const config = require('./config');
const logger = require('./utils/logger');
const { handleSocketError, handleExpressError } = require('./utils/errorHandler');
const { validate, sanitizeHTML } = require('./middleware/validation');
const { httpLimiter, socketRateLimiter } = require('./middleware/rateLimiter');

const app = express();
const PORT = config.server.port;
const DATA_FILE = path.join(__dirname, 'chat-data.json');

// Socket.IO Setup
const allowedOrigins = [
  ...config.cors.origin,
  /\.ngrok-free\.(app|dev)$/,
  /\.pages\.dev$/,
  /\.trycloudflare\.com$/
];

// Middleware
app.use(cors({
  origin: allowedOrigins,
  methods: ['GET', 'POST'],
}));
app.use(express.json());

// Server Setup
const server = http.createServer(app);

const io = new Server(server, {
  maxHttpBufferSize: config.socketIO.maxHttpBufferSize,
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST']
  }
});

// Room State
let rooms = {
  'Global Chat': { password: null, messages: [] }
};
const roomTimers = {};

// User mapping for O(1) lookups (Performance Improvement)
const userSocketMap = new Map(); // username -> socketId

// --- Data Persistence ---

/**
 * Load data from file on startup (async)
 */
async function loadData() {
  try {
    if (fsSync.existsSync(DATA_FILE)) {
      const data = await fs.readFile(DATA_FILE, 'utf8');
      rooms = JSON.parse(data);
      logger.info('Loaded chat data from file');
    } else {
      logger.info('No existing chat data found, starting fresh');
    }
  } catch (err) {
    logger.error('Error loading chat data:', err);
  }
}

/**
 * Save data to file (debounced to prevent excessive writes)
 */
const saveDataDebounced = debounce(async () => {
  try {
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
    await fs.writeFile(DATA_FILE, JSON.stringify(cleanRooms, null, 2));
    logger.debug('Chat data saved to file');
  } catch (err) {
    logger.error('Error saving chat data:', err);
  }
}, 3000); // Save every 3 seconds at most

// Initialize
loadData().then(() => {
  // Initialize cleanup for existing empty rooms
  Object.keys(rooms).forEach(roomName => {
    checkRoomEmpty(roomName);
  });

  // Start Global Chat cleanup interval (every 1 hour)
  setInterval(cleanupGlobalChatHistory, 60 * 60 * 1000);
  cleanupGlobalChatHistory(); // Run immediately on startup

  logger.info('Server initialized successfully');
});

// --- Socket.IO Event Handlers ---

io.on('connection', (socket) => {
  logger.info(`User connected: ${socket.id}`);

  // Send room list to new user
  socket.emit('room-list', getRoomList());

  socket.on('create-room', async ({ roomName, password, type }) => {
    try {
      // Rate limiting check
      if (!socketRateLimiter.checkRoomCreationRate(socket.id)) {
        socket.emit('error', 'Too many room creation attempts. Please wait.');
        return;
      }

      // Validate room name
      const { error: nameError, value: validRoomName } = validate('roomName', roomName);
      if (nameError) {
        socket.emit('error', nameError.message);
        return;
      }

      // Validate password if provided
      if (password) {
        const { error: passError } = validate('password', password);
        if (passError) {
          socket.emit('error', passError.message);
          return;
        }
      }

      // Case-insensitive check
      const existingRoom = Object.keys(rooms).find(r => r.toLowerCase() === validRoomName.toLowerCase());
      if (existingRoom) {
        socket.emit('error', 'Room already exists (names are unique and case-insensitive)');
        return;
      }

      // Hash password if provided
      const hashedPassword = password ? await bcrypt.hash(password, config.security.bcryptRounds) : null;

      rooms[validRoomName] = { password: hashedPassword, messages: [], type: type || 'chat' };
      saveDataDebounced();

      io.emit('room-list', getRoomList());
      joinRoom(socket, validRoomName, password); // Auto-join creator with plain password

      logger.info(`Room created: ${validRoomName} by ${socket.data.username || socket.id}`);
    } catch (err) {
      handleSocketError(socket, err, 'create-room');
    }
  });

  socket.on('join-room', async ({ roomName, password, username }) => {
    try {
      if (username) {
        // Validate username
        const { error: userError, value: validUsername } = validate('username', username);
        if (userError) {
          socket.emit('error', userError.message);
          return;
        }

        // Check for existing user (case-insensitive)
        const isTaken = Array.from(io.sockets.sockets.values()).some(s =>
          s.id !== socket.id &&
          s.data.username &&
          s.data.username.toLowerCase() === validUsername.toLowerCase()
        );

        if (isTaken) {
          socket.emit('error', 'Username already taken. Please choose another.');
          return;
        }

        socket.data.username = validUsername;
        userSocketMap.set(validUsername, socket.id);
      }

      await joinRoom(socket, roomName, password);
    } catch (err) {
      handleSocketError(socket, err, 'join-room');
    }
  });

  socket.on('leave-room', ({ roomName }) => {
    try {
      logger.debug(`User ${socket.id} leaving room: ${roomName}`);
      socket.leave(roomName);
      if (socket.data.currentRoom === roomName) {
        socket.data.currentRoom = null;
      }
      checkRoomEmpty(roomName);
    } catch (err) {
      handleSocketError(socket, err, 'leave-room');
    }
  });

  socket.on('change-username', ({ newUsername }) => {
    try {
      // Validate username
      const { error, value: validUsername } = validate('username', newUsername);
      if (error) {
        socket.emit('error', error.message);
        return;
      }

      // Check uniqueness (case-insensitive)
      const isTaken = Array.from(io.sockets.sockets.values()).some(s =>
        s.id !== socket.id &&
        s.data.username &&
        s.data.username.toLowerCase() === validUsername.toLowerCase()
      );

      if (isTaken) {
        socket.emit('error', 'Username already taken');
        return;
      }

      const oldName = socket.data.username;

      // Update user mapping
      if (oldName) {
        userSocketMap.delete(oldName);
      }
      userSocketMap.set(validUsername, socket.id);

      socket.data.username = validUsername;
      broadcastGlobalUsers();

      logger.info(`User ${oldName} changed name to ${validUsername}`);
    } catch (err) {
      handleSocketError(socket, err, 'change-username');
    }
  });

  socket.on('register-user', ({ username }) => {
    try {
      if (username) {
        const { error, value: validUsername } = validate('username', username);
        if (error) {
          socket.emit('error', error.message);
          return;
        }

        socket.data.username = validUsername;
        userSocketMap.set(validUsername, socket.id);
        broadcastGlobalUsers();

        logger.info(`User registered: ${validUsername}`);
      }
    } catch (err) {
      handleSocketError(socket, err, 'register-user');
    }
  });

  socket.on('status-update', ({ dnd }) => {
    socket.data.dnd = !!dnd;
    logger.debug(`User ${socket.data.username} DND status: ${dnd}`);
    broadcastGlobalUsers();
  });

  socket.on('chat-message', ({ roomName, ...msgData }) => {
    try {
      // Rate limiting check
      if (!socketRateLimiter.checkMessageRate(socket.id)) {
        socket.emit('error', 'Too many messages. Please slow down.');
        return;
      }

      // Validate message
      const { error, value: validMessage } = validate('message', msgData.text);
      if (error) {
        socket.emit('error', error.message);
        return;
      }

      // Sanitize message to prevent XSS
      const sanitizedText = sanitizeHTML(validMessage);

      // Check for DND in Direct Messages
      if (rooms[roomName] && rooms[roomName].isDirectMessage) {
        const participants = rooms[roomName].participants || [];
        const recipientName = participants.find(p => p !== socket.data.username);

        if (recipientName) {
          const recipientSocketId = userSocketMap.get(recipientName);
          if (recipientSocketId) {
            const recipientSocket = io.sockets.sockets.get(recipientSocketId);
            if (recipientSocket && recipientSocket.data.dnd) {
              socket.emit('chat-message', {
                roomName,
                username: 'System',
                text: `Cannot send message: User ${recipientName} is in Do Not Disturb mode.`,
                type: 'system',
                timestamp: new Date().toISOString()
              });
              return;
            }
          }
        }
      }

      // Store message
      const fullMsg = { ...msgData, text: sanitizedText, roomName };
      if (rooms[roomName]) {
        rooms[roomName].messages.push(fullMsg);
        saveDataDebounced();
      }

      // Broadcast to specific room
      io.to(roomName).emit('chat-message', fullMsg);

      // For DMs, ensure recipient gets it even if not in room
      if ((rooms[roomName] && rooms[roomName].isDirectMessage) || roomName.startsWith('DM:')) {
        let participants = rooms[roomName]?.participants;

        if (!participants && roomName.startsWith('DM:')) {
          participants = roomName.replace('DM:', '').split(':');
        }

        const recipientName = (participants || []).find(p => p !== socket.data.username);

        if (recipientName) {
          const recipientSocketId = userSocketMap.get(recipientName);
          if (recipientSocketId) {
            const recipientSocket = io.sockets.sockets.get(recipientSocketId);
            if (recipientSocket && !recipientSocket.rooms.has(roomName)) {
              recipientSocket.emit('chat-message', fullMsg);
            }
          }
        }
      }
    } catch (err) {
      handleSocketError(socket, err, 'chat-message');
    }
  });

  // Typing indicator
  socket.on('typing', ({ roomName, username }) => {
    if (roomName && username) {
      socket.to(roomName).emit('user-typing', { roomName, username });
    }
  });

  // Message reactions
  const messageReactions = new Map(); // In-memory storage - should be in database



  socket.on('add-reaction', ({ messageId, emoji, username }) => {
    if (!messageReactions.has(messageId)) {
      messageReactions.set(messageId, {});
    }

    const reactions = messageReactions.get(messageId);
    if (!reactions[emoji]) {
      reactions[emoji] = [];
    }

    if (!reactions[emoji].includes(username)) {
      reactions[emoji].push(username);
    }

    // Broadcast updated reactions
    io.emit('reaction-update', { messageId, reactions });
  });

  socket.on('remove-reaction', ({ messageId, emoji, username }) => {
    if (!messageReactions.has(messageId)) return;

    const reactions = messageReactions.get(messageId);
    if (reactions[emoji]) {
      reactions[emoji] = reactions[emoji].filter(u => u !== username);

      // Remove emoji if no users left
      if (reactions[emoji].length === 0) {
        delete reactions[emoji];
      }
    }

    // Broadcast updated reactions
    io.emit('reaction-update', { messageId, reactions });
  });

  socket.on('disconnect', () => {
    logger.info(`User disconnected: ${socket.id}`);

    // Clean up rate limiter
    socketRateLimiter.cleanup(socket.id);

    if (socket.data.isInVoice && socket.data.roomName) {
      io.to(socket.data.roomName).emit('voice-user-left', { id: socket.id });
    }

    const username = socket.data.username;
    if (username) {
      // Remove from user mapping
      userSocketMap.delete(username);

      // Ephemeral DMs: Delete any DM involving this user
      Object.keys(rooms).forEach(roomName => {
        if (rooms[roomName].isDirectMessage && rooms[roomName].participants && rooms[roomName].participants.includes(username)) {
          const otherUser = rooms[roomName].participants.find(p => p !== username);
          logger.info(`User ${username} disconnected. Scheduling DM ${roomName} deletion in 10s.`);

          if (otherUser) {
            const otherSocketId = userSocketMap.get(otherUser);
            if (otherSocketId) {
              const otherSocket = io.sockets.sockets.get(otherSocketId);
              if (otherSocket) {
                otherSocket.emit('chat-closing-warning', {
                  roomName,
                  seconds: 10,
                  reason: 'Chat partner disconnected'
                });
              }
            }
          }

          setTimeout(() => {
            if (rooms[roomName]) {
              logger.info(`Executing delayed deletion for DM ${roomName}`);

              if (otherUser) {
                const otherSocketId = userSocketMap.get(otherUser);
                if (otherSocketId) {
                  const otherSocket = io.sockets.sockets.get(otherSocketId);
                  if (otherSocket) {
                    otherSocket.emit('force-leave-room', {
                      roomName,
                      reason: 'Chat partner disconnected'
                    });
                  }
                }
              }
              delete rooms[roomName];
              saveDataDebounced();
            }
          }, 10000);
        }
      });
      saveDataDebounced();
    }

    broadcastGlobalUsers();

    if (socket.data.currentRoom) {
      checkRoomEmpty(socket.data.currentRoom);
    }
  });

  // --- Direct Messaging ---
  socket.on('start-dm', ({ targetUsername }) => {
    try {
      logger.debug(`DM request from ${socket.data.username} to ${targetUsername}`);
      const senderUsername = socket.data.username;

      if (!senderUsername || !targetUsername) {
        logger.warn('Missing usernames for DM');
        return;
      }

      // Find target socket using optimized mapping
      const targetSocketId = userSocketMap.get(targetUsername);
      const targetSocket = targetSocketId ? io.sockets.sockets.get(targetSocketId) : null;

      if (targetSocket) {
        logger.debug(`Target user ${targetUsername} found`);

        const participants = [senderUsername, targetUsername].sort();
        const dmRoomName = `DM:${participants.join(':')}`;
        logger.debug(`DM Room Name: ${dmRoomName}`);

        if (!rooms[dmRoomName]) {
          logger.debug(`Creating new DM room: ${dmRoomName}`);
          rooms[dmRoomName] = {
            isDirectMessage: true,
            messages: [],
            participants
          };
          saveDataDebounced();
        }

        joinRoom(socket, dmRoomName, null);
      } else {
        logger.warn(`Target user ${targetUsername} not found`);
        socket.emit('error', 'User not found or offline');
      }
    } catch (err) {
      handleSocketError(socket, err, 'start-dm');
    }
  });

  socket.on('invite-to-room', ({ roomName, targetUsername }) => {
    try {
      logger.debug(`Invite from ${socket.data.username} to ${targetUsername} for ${roomName}`);

      const targetSocketId = userSocketMap.get(targetUsername);
      const targetSocket = targetSocketId ? io.sockets.sockets.get(targetSocketId) : null;

      if (targetSocket) {
        targetSocket.emit('room-invite', {
          roomName,
          from: socket.data.username
        });
        logger.debug(`Invitation sent to ${targetUsername}`);
      } else {
        logger.warn(`User ${targetUsername} not found for invite`);
      }
    } catch (err) {
      handleSocketError(socket, err, 'invite-to-room');
    }
  });
});

// --- Helper Functions ---

async function joinRoom(socket, roomName, password) {
  const room = rooms[roomName];
  if (!room) {
    socket.emit('error', 'Room not found');
    return;
  }

  // Verify password if room is protected
  if (room.password) {
    if (!password) {
      socket.emit('error', 'Password required');
      return;
    }

    const isValid = await bcrypt.compare(password, room.password);
    if (!isValid) {
      socket.emit('error', 'Incorrect password');
      return;
    }
  }

  // Leave previous rooms
  logger.debug(`User ${socket.id} switching rooms. Current: ${[...socket.rooms]}`);
  [...socket.rooms].forEach(r => {
    if (r !== socket.id) {
      logger.debug(`User ${socket.id} leaving room: ${r}`);
      socket.leave(r);
      checkRoomEmpty(r);
    }
  });

  logger.debug(`User ${socket.id} joining room: ${roomName}`);
  socket.join(roomName);
  socket.data.currentRoom = roomName;
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
      saveDataDebounced();
    }

    io.to(roomName).emit('chat-message', systemMsg);
  }

  // Send chat history
  socket.emit('chat-history', room.messages);
  broadcastGlobalUsers();
  checkRoomEmpty(roomName);
}

async function broadcastGlobalUsers() {
  const sockets = await io.fetchSockets();
  const users = sockets
    .filter(s => s.data.username)
    .map(s => ({
      username: s.data.username,
      dnd: !!s.data.dnd
    }));

  // Dedup
  const uniqueUsersMap = new Map();
  users.forEach(u => uniqueUsersMap.set(u.username, u));
  const uniqueUsers = Array.from(uniqueUsersMap.values());

  io.emit('all-users', uniqueUsers);
}

function getRoomList() {
  return Object.keys(rooms)
    .filter(name => !rooms[name].isDirectMessage && !name.startsWith('DM:'))
    .map(name => ({
      name,
      isPrivate: !!rooms[name].password,
      expiry: rooms[name].expiry || null,
      type: rooms[name].type || 'chat'
    }));
}

// Global Chat Cleanup (24 hours retention)
function cleanupGlobalChatHistory() {
  if (rooms['Global Chat'] && rooms['Global Chat'].messages) {
    const now = Date.now();
    const retentionPeriod = 24 * 60 * 60 * 1000; // 24 hours
    const originalCount = rooms['Global Chat'].messages.length;

    rooms['Global Chat'].messages = rooms['Global Chat'].messages.filter(msg => {
      const msgTime = new Date(msg.timestamp).getTime();
      return (now - msgTime) < retentionPeriod;
    });

    if (rooms['Global Chat'].messages.length < originalCount) {
      logger.info(`Cleaned up ${originalCount - rooms['Global Chat'].messages.length} expired messages from Global Chat`);
      saveDataDebounced();
    }
  }
}

// Room Cleanup Logic
async function checkRoomEmpty(roomName) {
  if (roomName === 'Global Chat') return;
  if (!rooms[roomName]) return;
  if (rooms[roomName].isDirectMessage || roomName.startsWith('DM:')) return;

  const sockets = await io.in(roomName).fetchSockets();
  if (sockets.length === 0) {
    if (!rooms[roomName].expiry) {
      const timeoutDuration = rooms[roomName].password
        ? config.data.roomCleanupTimeoutPrivate
        : config.data.roomCleanupTimeoutPublic;

      rooms[roomName].expiry = Date.now() + timeoutDuration;
      logger.info(`Room "${roomName}" is empty. Deleting in ${timeoutDuration / 1000}s...`);

      if (roomTimers[roomName]) clearTimeout(roomTimers[roomName]);

      roomTimers[roomName] = setTimeout(() => {
        if (rooms[roomName]) {
          logger.info(`Deleting room "${roomName}" due to inactivity`);
          delete rooms[roomName];
          delete roomTimers[roomName];
          saveDataDebounced();
          io.emit('room-list', getRoomList());
        }
      }, timeoutDuration);

      saveDataDebounced();
      io.emit('room-list', getRoomList());
    } else if (!roomTimers[roomName]) {
      const remainingTime = rooms[roomName].expiry - Date.now();
      if (remainingTime > 0) {
        logger.info(`Restoring timer for "${roomName}". Deleting in ${remainingTime / 1000}s...`);
        roomTimers[roomName] = setTimeout(() => {
          if (rooms[roomName]) {
            logger.info(`Deleting room "${roomName}" due to inactivity`);
            delete rooms[roomName];
            delete roomTimers[roomName];
            saveDataDebounced();
            io.emit('room-list', getRoomList());
          }
        }, remainingTime);
      } else {
        logger.info(`Room "${roomName}" expired while offline. Deleting now.`);
        delete rooms[roomName];
        saveDataDebounced();
        io.emit('room-list', getRoomList());
      }
    }
  } else {
    if (rooms[roomName].expiry) {
      logger.info(`Room "${roomName}" is active again. Deletion cancelled.`);

      if (roomTimers[roomName]) {
        clearTimeout(roomTimers[roomName]);
        delete roomTimers[roomName];
      }

      delete rooms[roomName].expiry;
      saveDataDebounced();
      io.emit('room-list', getRoomList());
    }
  }
}

// --- HTTP Endpoints ---

// Check Username Availability (with rate limiting)
app.get('/check-username', httpLimiter, (req, res) => {
  const { username } = req.query;

  if (!username) {
    return res.status(400).json({ error: 'Username required' });
  }

  const { error } = validate('username', username);
  if (error) {
    return res.status(400).json({ error: error.message, available: false });
  }

  const isTaken = Array.from(io.sockets.sockets.values()).some(s =>
    s.data.username &&
    s.data.username.toLowerCase() === username.toLowerCase()
  );

  res.json({ available: !isTaken });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Basic Route
app.get('/', (req, res) => {
  res.send('Chat Server is running');
});

// Error handling middleware
app.use(handleExpressError);

// Start Server
server.listen(PORT, () => {
  logger.info(`Server is running on port ${PORT}`);
  logger.info(`Environment: ${config.server.nodeEnv}`);
});

// Graceful Shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received. Shutting down gracefully...');

  // Save data one last time
  await saveDataDebounced.flush();

  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});
