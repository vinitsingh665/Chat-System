# Real-time Chat Application

A full-stack real-time chat application using React, Node.js, Socket.IO, and ngrok for public access.

## Features
- **Real-time Messaging**: Instant delivery using WebSockets.
- **Global Access**: Accessible over the internet via ngrok.
- **Modern UI**: Clean, responsive interface with a dark/light mode adaptable design.
- **User Tracking**: Shows presence status and tracks connected users (console).

## Prerequisites
- Node.js (v14 or higher)
- ngrok (installed and authenticated)

## Installation

1. **Install Backend Dependencies**
   ```bash
   cd server
   npm install
   ```

2. **Install Frontend Dependencies**
   ```bash
   cd client
   npm install
   ```

## Running the Application

### 1. Start the Backend Server
This handles WebSocket connections and manages chat messages.
```bash
# From the root directory
node server/server.js
```
*Server runs on port 3000.*

### 2. Start the Frontend
This launches the React interface.
```bash
# From the root directory (or inside client/)
cd client
npm run dev
```
*Frontend runs on http://localhost:5173*.

### 3. Expose via ngrok (For Public Access)
To let friends join your chat from anywhere:

1. Open a new terminal.
2. Run ngrok to tunnel the backend (and effectively the app if served correctly, but for this setup we are exposing the backend port for sockets, and the frontend port for the UI if you want them to access the UI).

**Scenario: You want friends to access the UI:**
You need to tunnel the **Frontend** port.
```bash
ngrok http 5173
```
*Share the generated https URL (e.g., `https://xxxx.ngrok-free.app`) with your friends.*

**Important for Socket Connection:**
The application is configured to look for the socket server relative to the current URL if it detects it's running on ngrok.
However, since the Frontend (5173) and Backend (3000) are on different ports, simply tunneling 5173 might strictly require the backend to be accessible at the same origin or specific config.

**Recommended Setup for Full Public Access:**
For a simple dev setup where others can access just the UI and it connects to your LOCAL backend, you might need to tunnel BOTH or use a more advanced setup.
**BUT** for this demo, the easiest way is to ensure your `server.js` allows CORS (which it does) and you tunnel the Frontend.
*Note: If WebSocket connection fails, ensure your backend is also accessible or tunnel port 3000 and update the code to point to that specific tunnel.*

**Standard Usage (Local):**
Just open `http://localhost:5173` in multiple tabs.

## Project Structure
- `server/`: Node.js + Express + Socket.IO server.
- `client/`: React + Vite frontend.
- `client/src/components/`: Chat UI components.

## Technologies
- React + Vite
- Socket.IO
- Node.js + Express
- CSS Variables
