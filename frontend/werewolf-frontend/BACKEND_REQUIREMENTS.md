# Backend Requirements for Frontend Integration

This document outlines all the Socket.IO events and data structures the backend team needs to implement for the frontend to work.

## Socket.IO Server Setup

```javascript
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:5173", // Frontend URL
    methods: ["GET", "POST"]
  }
});

server.listen(3001, () => {
  console.log('Server running on port 3001');
});
```

## Required Socket Events

### 1. Room Creation

**Frontend Emits:**
```javascript
socket.emit('create-room', {
  hostName: string,          // "Aryan"
  maxPlayers: number,        // 8
  gameSettings: {
    numWerewolves: number,   // 2
    enableDoctor: boolean,   // true
    enableLittleGirl: boolean // false
  }
});
```

**Backend Should Respond:**
```javascript
// Success
socket.emit('room-created', {
  roomCode: string  // "ABC123" (6 character unique code)
});

// Error
socket.emit('create-room-error', {
  message: string  // "Room creation failed"
});
```

**Backend Logic:**
- Generate unique 6-character room code
- Create room in database/memory
- Store host socket ID
- Store game settings

---

### 2. Join Room

**Frontend Emits:**
```javascript
socket.emit('join-room', {
  playerName: string,  // "John"
  roomCode: string     // "ABC123"
});
```

**Backend Should Respond:**
```javascript
// Success - to joining player
socket.emit('join-success', {});

// Success - broadcast to all in room
io.to(roomCode).emit('player-joined', {
  players: [
    {
      id: string,         // socket.id
      name: string,       // "Aryan"
      isHost: boolean,    // true
      isAlive: boolean    // true
    },
    // ... more players
  ],
  maxPlayers: number  // 8
});

// Error
socket.emit('join-error', {
  message: string  // "Room not found" or "Room is full"
});
```

**Backend Logic:**
- Check if room exists
- Check if room is full
- Add player to room
- Broadcast update to all players in room

---

### 3. Start Game

**Frontend Emits:**
```javascript
socket.emit('start-game', {
  roomCode: string
});
```

**Backend Should Respond:**
```javascript
// To all players in room
io.to(roomCode).emit('game-started', {});

// Assign roles to each player individually
socket.emit('role-assigned', {
  role: string  // 'werewolf', 'doctor', 'villager', 'little-girl'
});
```

**Backend Logic:**
- Verify sender is host
- Verify minimum players (4)
- Randomly assign roles based on settings
- Start game loop (night/day phases)
- Emit role to each player privately

---

### 4. Leave Room

**Frontend Emits:**
```javascript
socket.emit('leave-room', {
  roomCode: string
});
```

**Backend Should Respond:**
```javascript
// Broadcast to remaining players
io.to(roomCode).emit('player-left', {
  players: [/* updated player list */]
});
```

**Backend Logic:**
- Remove player from room
- If host leaves, assign new host or close room
- Update all remaining players

---

### 5. Chat Messages

**Frontend Emits:**
```javascript
socket.emit('send-message', {
  roomCode: string,
  message: string
});
```

**Backend Should Respond:**
```javascript
// Broadcast to all players in room
io.to(roomCode).emit('chat-message', {
  sender: string,    // Player name
  message: string    // Message text
});
```

**Backend Logic (MVP):**
- Broadcast message to all players
- (Future: Filter messages by phase/role)

---

### 6. Day Phase - Voting

**Frontend Emits:**
```javascript
socket.emit('vote', {
  roomCode: string,
  targetId: string  // Player ID to vote for
});
```

**Backend Should Respond:**
```javascript
// After all votes collected
io.to(roomCode).emit('game-state-update', {
  gameState: {
    phase: string,          // 'day' or 'night'
    round: number,          // 1, 2, 3...
    alivePlayers: string[], // Array of alive player IDs
    deadPlayers: string[]   // Array of dead player IDs
  },
  players: [
    {
      id: string,
      name: string,
      isAlive: boolean,  // Updated
      role: string       // Only show if dead
    }
  ]
});

// Move to night phase
io.to(roomCode).emit('phase-change', {
  phase: 'night',
  round: number
});
```

**Backend Logic:**
- Track votes from each player
- When all alive players voted, count votes
- Eliminate player with most votes
- Update game state
- Check win condition
- Move to night phase

---

### 7. Night Phase - Actions

**Frontend Emits:**
```javascript
socket.emit('night-action', {
  roomCode: string,
  targetId: string,           // Player ID
  action: 'kill' | 'revive'   // 'kill' for werewolf, 'revive' for doctor
});
```

**Backend Should Respond:**
```javascript
// After all night actions completed
io.to(roomCode).emit('game-state-update', {
  gameState: {
    phase: string,
    round: number,
    alivePlayers: string[],
    deadPlayers: string[]
  },
  players: [/* updated player list */]
});

// Move to day phase
io.to(roomCode).emit('phase-change', {
  phase: 'day',
  round: number
});
```

**Backend Logic:**
- Track werewolf kill choice
- Track doctor revive choice (if enabled)
- Resolve actions:
  - If doctor chose same target as werewolves, player survives
  - Otherwise, player dies
- Update game state
- Check win condition
- Move to day phase

---

### 8. Game End

**Backend Emits:**
```javascript
io.to(roomCode).emit('game-ended', {
  winner: 'werewolves' | 'villagers',
  finalState: {
    players: [/* final player states */],
    rounds: number
  }
});
```

**Trigger Conditions:**
- **Villagers win:** All werewolves dead
- **Werewolves win:** Werewolves >= Villagers

---

### 9. Disconnect Handling

**Backend Should Handle:**
```javascript
socket.on('disconnect', () => {
  // Remove player from their room
  // Update remaining players
  io.to(roomCode).emit('player-left', {
    players: [/* updated list */]
  });
});
```

---

## Data Structures

### Player Object
```javascript
{
  id: string,           // socket.id
  name: string,         // Player name
  socketId: string,     // socket.id (redundant but clear)
  role: string,         // 'werewolf', 'doctor', 'villager', 'little-girl'
  isAlive: boolean,     // true/false
  isHost: boolean,      // true for room creator
  hasVoted: boolean,    // Track voting status
  hasActed: boolean     // Track night action status
}
```

### Room Object
```javascript
{
  roomCode: string,          // "ABC123"
  host: string,              // Host socket ID
  players: Player[],         // Array of players
  maxPlayers: number,        // 8
  gameSettings: {
    numWerewolves: number,   // 2
    enableDoctor: boolean,   // true
    enableLittleGirl: boolean // false
  },
  gameState: {
    phase: string,           // 'lobby', 'night', 'day', 'ended'
    round: number,           // Current round
    alivePlayers: string[],  // Array of alive player IDs
    deadPlayers: string[]    // Array of dead player IDs
  },
  started: boolean,          // Has game started?
  createdAt: Date
}
```

## Testing Checklist

- [ ] Create room generates unique code
- [ ] Multiple players can join
- [ ] Host can start game
- [ ] Roles assigned correctly (2 werewolves if setting is 2)
- [ ] Night phase: werewolves can kill
- [ ] Night phase: doctor can revive (if enabled)
- [ ] Day phase: all players can vote
- [ ] Vote eliminates correct player
- [ ] Game ends when win condition met
- [ ] Chat messages broadcast correctly
- [ ] Disconnects handled gracefully

## Error Handling

The backend should handle these error cases:

1. **Room not found** - Invalid room code
2. **Room full** - Max players reached
3. **Not host** - Non-host trying to start game
4. **Game already started** - Can't join started game
5. **Invalid target** - Voting/killing invalid player
6. **Already voted** - Player trying to vote twice
7. **Already acted** - Night action already performed

## Minimum Viable Product (MVP)

For the MVP, implement:
- ✅ Room creation and joining
- ✅ Basic role assignment (werewolf, villager, doctor)
- ✅ Night phase (werewolf kill, doctor revive)
- ✅ Day phase (voting)
- ✅ Win conditions
- ✅ Basic chat (no filtering)

Can be added later:
- Little girl role
- Advanced chat filtering
- Reconnection support
- Game history/stats
- Multiple game modes

---

**Questions?** Ask the frontend team or check the frontend code for exact usage!
