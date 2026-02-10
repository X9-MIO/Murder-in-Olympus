# Murder in Olympus - Frontend MVP

Complete frontend for the Murder in Olympus social deduction game.

## 🚀 Quick Start

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Open browser to http://localhost:5173
```

## 📁 Project Structure

```
werewolf-frontend/
├── src/
│   ├── components/
│   │   └── ui/
│   │       ├── Button.jsx        # Reusable button component
│   │       ├── Card.jsx          # Reusable card component
│   │       └── Input.jsx         # Reusable input component
│   ├── context/
│   │   ├── SocketContext.jsx    # Socket.IO connection management
│   │   └── GameContext.jsx      # Game state management
│   ├── pages/
│   │   ├── Home/
│   │   │   └── Home.jsx          # Main menu
│   │   ├── CreateRoom/
│   │   │   └── CreateRoom.jsx    # Room creation (Aryan's responsibility)
│   │   ├── JoinGame/
│   │   │   └── JoinGame.jsx      # Join existing room
│   │   ├── Lobby/
│   │   │   └── Lobby.jsx         # Pre-game lobby (Aryan's responsibility)
│   │   ├── Game/
│   │   │   └── Game.jsx          # Main game interface
│   │   ├── GameInfo/
│   │   │   └── GameInfo.jsx      # How to play
│   │   └── Settings/
│   │       └── Settings.jsx      # Settings page
│   ├── App.jsx                   # Main app with routing
│   ├── main.jsx                  # Entry point
│   └── index.css                 # Global styles + Tailwind
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
└── postcss.config.js
```

## 🎮 Features Implemented

### ✅ Complete MVP Features
- [x] Home page with navigation
- [x] Create Room page (player count, role settings)
- [x] Join Game page (room code input)
- [x] Lobby page (player list, start button)
- [x] Game page (player list, chat, voting, night actions)
- [x] Game Info page (rules and how to play)
- [x] Settings page (basic settings)
- [x] Socket.IO client setup
- [x] Context-based state management
- [x] React Router navigation
- [x] Responsive design

## 🔌 Backend Integration Points

All backend integration points are marked with **`// BACKEND:`** comments in the code.

### Socket Events to Implement (Backend Team)

#### **SocketContext.jsx**
```javascript
const BACKEND_URL = 'http://localhost:3001'; // Update this to your backend URL
```

#### **CreateRoom.jsx**
```javascript
// BACKEND: Emit create-room event
socket.emit('create-room', {
  hostName: string,
  maxPlayers: number,
  gameSettings: {
    numWerewolves: number,
    enableDoctor: boolean,
    enableLittleGirl: boolean
  }
});

// BACKEND: Listen for room-created response
socket.on('room-created', (data) => {
  data.roomCode // string (6 characters)
});

// BACKEND: Listen for errors
socket.on('create-room-error', (data) => {
  data.message // error message
});
```

#### **JoinGame.jsx**
```javascript
// BACKEND: Emit join-room event
socket.emit('join-room', {
  playerName: string,
  roomCode: string
});

// BACKEND: Listen for success
socket.on('join-success', (data) => {
  // Player joined successfully
});

// BACKEND: Listen for errors
socket.on('join-error', (data) => {
  data.message // "Room not found" or "Room is full"
});
```

#### **Lobby.jsx**
```javascript
// BACKEND: Listen for player updates
socket.on('player-joined', (data) => {
  data.players // array of player objects
  data.maxPlayers // number
});

socket.on('player-left', (data) => {
  data.players // updated player array
});

// BACKEND: Emit start game
socket.emit('start-game', {
  roomCode: string
});

// BACKEND: Listen for game start
socket.on('game-started', () => {
  // Navigate to game page
});

// BACKEND: Emit leave room
socket.emit('leave-room', {
  roomCode: string
});
```

#### **Game.jsx**
```javascript
// BACKEND: Listen for role assignment
socket.on('role-assigned', (data) => {
  data.role // 'werewolf', 'doctor', 'villager', 'little-girl'
});

// BACKEND: Listen for game state updates
socket.on('game-state-update', (data) => {
  data.gameState // { phase, round, alivePlayers, deadPlayers }
  data.players // updated player array with isAlive status
});

// BACKEND: Emit chat message
socket.emit('send-message', {
  roomCode: string,
  message: string
});

// BACKEND: Listen for chat messages
socket.on('chat-message', (data) => {
  data.sender // player name
  data.message // message text
});

// BACKEND: Emit vote (day phase)
socket.emit('vote', {
  roomCode: string,
  targetId: string // player ID to vote for
});

// BACKEND: Emit night action
socket.emit('night-action', {
  roomCode: string,
  targetId: string,
  action: 'kill' | 'revive'
});

// BACKEND: Listen for phase changes
socket.on('phase-change', (data) => {
  data.phase // 'night' or 'day'
  data.round // current round number
});

// BACKEND: Listen for game end
socket.on('game-ended', (data) => {
  data.winner // 'werewolves' or 'villagers'
});
```

## 🎨 Customization

### Adding Your Logo

Replace the placeholder in `src/pages/Home/Home.jsx`:

```jsx
{/* TODO: Replace this with your custom logo image */}
{/* <img src="/logo.png" alt="Murder in Olympus" className="mx-auto w-32 h-32" /> */}
🏛️
```

Add your logo image to the `public/` folder and update the `src` path.

### Color Scheme

Update colors in `tailwind.config.js`:

```javascript
colors: {
  'olympus-dark': '#0d0208',     // Background
  'olympus-purple': '#3d1e4f',    // Secondary
  'olympus-blood': '#dc2626',     // Primary/Danger
  'olympus-gold': '#d4af37',      // Accent
}
```

## 🧪 Testing Without Backend

The frontend will run without a backend, but you'll see console errors for Socket.IO connection.

To test UI only:
1. Comment out socket event listeners
2. Use mock data in state

## 📦 Build for Production

```bash
npm run build
```

Output will be in `dist/` folder.

## 🔗 Connecting to Backend

1. Backend team sets up Socket.IO server on port 3001
2. Update `BACKEND_URL` in `src/context/SocketContext.jsx`
3. Backend implements all socket events listed above
4. Test connection - you should see "Connected to server" in console

## 🐛 Common Issues

### Socket.IO not connecting
- Check backend is running
- Verify BACKEND_URL is correct
- Check CORS settings on backend

### Players not updating
- Verify backend is emitting `player-joined` events
- Check socket listeners are properly set up

### Routing not working
- Make sure you're using `npm run dev` not opening HTML directly
- Check React Router is properly configured

## 👥 Team Responsibilities

**Frontend (Aryan, Qiyuan):**
- ✅ All UI pages completed
- ✅ Socket.IO client setup
- ✅ State management
- ⏳ Add custom logo
- ⏳ Test with backend once ready

**Backend (Ryan, Siwei, Asher):**
- ⏳ Socket.IO server setup
- ⏳ Room management
- ⏳ Game logic
- ⏳ Database integration

**Game Logic (Moinul, James):**
- ⏳ Phase system
- ⏳ Role assignments
- ⏳ Voting mechanics
- ⏳ Win conditions

## 📝 Next Steps

1. **Add Your Logo** - Replace placeholder with custom graphic
2. **Test Locally** - Make sure all pages work
3. **Wait for Backend** - Backend team implements socket events
4. **Integration Testing** - Test frontend + backend together
5. **Add Animations** (Optional) - Enhance UI once core works
6. **Deploy** - Host on Vercel/Netlify

## 🆘 Need Help?

- Check console for errors
- Verify all socket events match backend
- Ask backend team about event structure
- Test with mock data first

---

**Ready to go!** Just run `npm install` and `npm run dev` to start developing! 🚀
