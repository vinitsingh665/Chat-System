# TypeScript Migration Guide

This document outlines how to migrate the chat application to TypeScript for better type safety and developer experience.

## Benefits of TypeScript

- **Type Safety**: Catch errors at compile time
- **Better IDE Support**: Autocomplete and IntelliSense
- **Self-Documenting**: Types serve as inline documentation
- **Refactoring Confidence**: Rename and refactor with confidence
- **Improved Maintainability**: Easier for teams to understand code

## Migration Strategy

### Phase 1: Setup TypeScript

1. **Install TypeScript Dependencies**

```bash
# Server
cd server
npm install --save-dev typescript @types/node @types/express @types/bcrypt @types/cors ts-node

# Client
cd ../client
npm install --save-dev typescript @types/react @types/react-dom
```

2. **Create tsconfig.json**

**Server (server/tsconfig.json):**
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "node"
  },
  "include": ["**/*.ts"],
  "exclude": ["node_modules", "dist", "__tests__"]
}
```

**Client (client/tsconfig.json):**
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

### Phase 2: Create Type Definitions

**Create types/index.ts:**

```typescript
// User types
export interface User {
  username: string;
  dnd: boolean;
  status?: 'online' | 'offline' | 'away';
}

// Room types
export interface Room {
  name: string;
  isPrivate: boolean;
  expiry: number | null;
  type: 'chat' | 'voice' | 'video';
}

// Message types
export interface Message {
  roomName: string;
  username: string;
  text: string;
  type: 'user' | 'system' | 'file';
  timestamp: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
}

// Socket event types
export interface ServerToClientEvents {
  'room-list': (rooms: Room[]) => void;
  'joined-room': (roomName: string) => void;
  'chat-message': (message: Message) => void;
  'chat-history': (messages: Message[]) => void;
  'all-users': (users: User[]) => void;
  error: (error: string) => void;
  'room-invite': (data: { roomName: string; from: string }) => void;
}

export interface ClientToServerEvents {
  'create-room': (data: { roomName: string; password?: string; type?: string }) => void;
  'join-room': (data: { roomName: string; password?: string; username?: string }) => void;
  'leave-room': (data: { roomName: string }) => void;
  'chat-message': (data: Partial<Message>) => void;
  'register-user': (data: { username: string }) => void;
  'change-username': (data: { newUsername: string }) => void;
  'status-update': (data: { dnd: boolean }) => void;
  'start-dm': (data: { targetUsername: string }) => void;
}
```

### Phase 3: Migrate Files Incrementally

**Start with utility files:**

1. `config/index.ts`
2. `utils/logger.ts`
3. `middleware/validation.ts`
4. Models (`models/*.ts`)
5. Controllers (`controllers/*.ts`)
6. Main server file (`server.ts`)

**Example: Migrate validation.ts**

Before:
```javascript
const Joi = require('joi');

function validate(schemaName, data) {
  const schema = schemas[schemaName];
  return schema.validate(data);
}
```

After:
```typescript
import Joi from 'joi';

type SchemaName = 'username' | 'roomName' | 'message' | 'password';

function validate(schemaName: SchemaName, data: any): Joi.ValidationResult {
  const schema = schemas[schemaName];
  if (!schema) {
    throw new Error(`Unknown validation schema: ${schemaName}`);
  }
  return schema.validate(data);
}
```

### Phase 4: Update Build Scripts

**package.json:**
```json
{
  "scripts": {
    "build": "tsc",
    "start": "node dist/server.js",
    "dev": "ts-node server.ts",
    "watch": "tsc --watch"
  }
}
```

### Phase 5: Gradual Migration

You can use `.ts` and `.js` files side-by-side:

1. Rename one file at a time from `.js` to `.ts`
2. Fix type errors
3. Test thoroughly
4. Move to next file

## Type Safety Examples

### Socket.IO with Types

```typescript
import { Server } from 'socket.io';
import type { ServerToClientEvents, ClientToServerEvents } from './types';

const io = new Server<ClientToServerEvents, ServerToClientEvents>(server, {
  cors: { origin: '*' }
});

io.on('connection', (socket) => {
  // Now you get autocomplete and type checking!
  socket.on('join-room', (data) => {
    // data is typed automatically
    console.log(data.roomName); // ✓ TypeScript knows this exists
    console.log(data.invalid); // ✗ Error: Property doesn't exist
  });
  
  socket.emit('room-list', rooms); // ✓ Type checked
  socket.emit('invalid-event', 'data'); // ✗ Error: Event doesn't exist
});
```

### React Hooks with Types

```typescript
import { useState } from 'react';
import type { Message } from '../types';

export function useMessages(socket: Socket | null, currentRoom: string | null) {
  const [messages, setMessages] = useState<Message[]>([]);
  
  // TypeScript ensures type safety
  const addMessage = (message: Message) => {
    setMessages(prev => [...prev, message]);
  };
  
  return { messages, addMessage };
}
```

## Current Status

✅ Phase 1: Project is ready for TypeScript migration  
🔄 Phase 2: Type definitions can be created  
⏸️ Phases 3-5: Not yet started (optional enhancement)

## Recommendation

TypeScript migration is **optional** but highly recommended for:
- Large teams
- Long-term projects
- Production applications
- Better developer experience

The current JavaScript implementation is production-ready and does not require TypeScript to function properly.
