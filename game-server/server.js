const crypto = require("crypto").webcrypto;
const io = require("socket.io")(3000, {
  cors: {
    origin: "http://localhost:5173",
  },
});

/* ========================================================================== */
/* STATE & DATA                                 */
/* ========================================================================== */

const rooms = {};
const socketToUser = {};

console.log("Socket.IO server running on port 3000");

/* ========================================================================== */
/* UTILITY FUNCTIONS                             */
/* ========================================================================== */

function generateRoomCode(length = 6) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);

  let code = "";
  for (let i = 0; i < length; i++) {
    code += chars[array[i] % chars.length];
  }

  return code;
}

function createUniqueRoom(existingRooms) {
  var code;
  do {
    code = generateRoomCode(6);
  } while (code in existingRooms);
  return code;
}

/* ========================================================================== */
/* GAME LOOP LOGIC                                */
/* ========================================================================== */

function startDayPhase(roomCode) {
    rooms[roomCode].gamePhase = 'day';
    rooms[roomCode].nightActions = {}; // Reset night actions
    
    io.to(roomCode).emit('day-phase-started', {
        message: "The sun rises over Olympus... The gods watch as mortals struggle for survival."
    });
    
    // Day phase lasts 10 seconds, then night begins
    setTimeout(() => {
        startNightPhase(roomCode);
    }, 10000);
}

function startNightPhase(roomCode) {
    rooms[roomCode].gamePhase = 'night';
    rooms[roomCode].nightActions = {};
    rooms[roomCode].actionQueue = [];
    
    // Get all connected players and their roles
    const playerIds = Array.from(io.sockets.adapter.rooms.get(roomCode) || []);
    const playersWithRoles = playerIds.map(playerId => ({
        id: playerId,
        name: socketToUser[playerId].displayName,
        role: rooms[roomCode].playerRoles ? rooms[roomCode].playerRoles[playerId] : 'Villager'
    }));
    
    // Find the werewolf
    const werewolf = playersWithRoles.find(p => p.role === 'Wolf');
    if (werewolf) {
        rooms[roomCode].actionQueue.push({
            type: 'werewolf-kill',
            player: werewolf,
            targets: playersWithRoles.filter(p => p.role !== 'Wolf' && !rooms[roomCode].eliminatedPlayers.has(p.name)).map(p => p.name)
        });
    }
    
    // Add other roles here later (Detective, Doctor, etc.)
    
    // Start processing night actions
    processNextNightAction(roomCode);
}

function processNextNightAction(roomCode) {
    if (rooms[roomCode].actionQueue.length === 0) {
        // All night actions complete, reveal results
        setTimeout(() => {
            revealNightActions(roomCode);
        }, 2000);
        return;
    }
    
    const action = rooms[roomCode].actionQueue.shift();
    
    if (action.type === 'werewolf-kill') {
        // Tell werewolf to choose a victim
        io.to(action.player.id).emit('night-action-required', {
            type: 'werewolf-kill',
            targets: action.targets,
            message: 'Choose a player to eliminate tonight...'
        });
    }
    
    // Set timeout for this action (30 seconds)
    rooms[roomCode].actionTimeout = setTimeout(() => {
        // Action timed out, skip to next
        processNextNightAction(roomCode);
    }, 30000);
}

function revealNightActions(roomCode) {
    rooms[roomCode].gamePhase = 'action-reveal';
    
    // Get all night actions
    const actions = Object.values(rooms[roomCode].nightActions);
    
    // Process werewolf kill
    const werewolfKill = actions.find(action => action.type === 'werewolf-kill');
    if (werewolfKill) {
        // Remove the killed player
        rooms[roomCode].players = rooms[roomCode].players.filter(p => p !== werewolfKill.target);
        rooms[roomCode].eliminatedPlayers.add(werewolfKill.target);
    }
    
    io.to(roomCode).emit('night-actions-revealed', {
        actions: actions,
        eliminatedPlayer: werewolfKill ? werewolfKill.target : null,
        message: "The night has passed... Here is what transpired:"
    });
    
    // After reveal, start new discussion phase
    setTimeout(() => {
        startNewDiscussionPhase(roomCode);
    }, 10000);
}

function startNewDiscussionPhase(roomCode) {
    rooms[roomCode].gamePhase = 'discussion';
    rooms[roomCode].skippedPlayers = new Set();
    
    setTimeout(() => {
        io.to(roomCode).emit('discussion-phase-started', {
            players: rooms[roomCode].players,
            duration: 60
        });
        
        rooms[roomCode].discussionTimer = setTimeout(() => {
            startVotingPhase(roomCode);
        }, 60000);
    }, 2000);
}

function startVotingPhase(roomCode) {
    rooms[roomCode].gamePhase = 'voting';
    rooms[roomCode].votes = {};
    
    // Get list of non-eliminated players for voting
    const votingPlayers = rooms[roomCode].players.filter(p => !rooms[roomCode].eliminatedPlayers.has(p));
    
    io.to(roomCode).emit('voting-phase-started', {
        players: votingPlayers,
        duration: 30 // seconds to vote
    });
    
    // Auto-end voting after 30 seconds
    rooms[roomCode].votingTimer = setTimeout(() => {
        rooms[roomCode].votingTimer = null;
        endVotingPhase(roomCode);
    }, 30000);
}

function endVotingPhase(roomCode) {
    const votes = rooms[roomCode].votes;
    const voteCount = {};
    
    // Count votes
    Object.values(votes).forEach(targetName => {
        voteCount[targetName] = (voteCount[targetName] || 0) + 1;
    });
    
    // Find player with most votes
    const eliminated = Object.keys(voteCount).reduce((a, b) => 
        voteCount[a] > voteCount[b] ? a : b
    );
    
    // Remove eliminated player
    rooms[roomCode].players = rooms[roomCode].players.filter(p => p !== eliminated);
    rooms[roomCode].eliminatedPlayers.add(eliminated);
    
    io.to(roomCode).emit('player-eliminated', {
        name: eliminated,
        voteCount: voteCount[eliminated]
    });
    
    // Start day phase after elimination
    setTimeout(() => {
        startDayPhase(roomCode);
    }, 5000);
}

/* ========================================================================== */
/* SOCKET EVENTS                                   */
/* ========================================================================== */

io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  /* ---------------------- Disconnect Handling ---------------------- */
  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
    const user = socketToUser[socket.id];

    if (user) {
      const roomCode = user.roomCode;
      const displayName = user.displayName;

      if (rooms[roomCode]) {
        // Did the CREATOR just disconnect?
        if (rooms[roomCode].creatorId === socket.id) {
          
          // Tell everyone else in the room to leave!
          io.to(roomCode).emit('host-disconnected');
          
          // Nuke the room from the server memory
          delete rooms[roomCode];
          console.log("Room " + roomCode + " deleted because the host left.");
          
        } else {
          // A normal player disconnected. Just remove them from the list.
          rooms[roomCode].players = rooms[roomCode].players.filter(name => name !== displayName);
          io.to(roomCode).emit('update-players', rooms[roomCode].players);

          if (rooms[roomCode].players.length === 0) {
            delete rooms[roomCode];
            console.log("Room " + roomCode + " deleted because it is empty.");
          }
        }
      }

      delete socketToUser[socket.id];
    }
  });

  /* ---------------------- Room Management ---------------------- */
  socket.on('create-room', (roomName, numberOfPlayer,creatorname) => {
    // 1. Generate the code
    const code = createUniqueRoom(rooms);
    
    // 2. Save the room data
    rooms[code] = {
      roomName,
      numberOfPlayers: numberOfPlayer,
      players: [creatorname],
      creatorId: socket.id
    };
    
    // 3. ACTUALLY join the room!
    socket.join(code);
    console.log("Creator joined room: " + code);

    socketToUser[socket.id] = { roomCode: code, displayName: creatorname };
    
    // 4. Send the new code back to the creator so they know what it is
    socket.emit('room-created', code); 
    io.to(code).emit('update-players', rooms[code].players);
  });

  socket.on('join-room', (roomCode, displayName) => {
    if(rooms[roomCode].players.length >= rooms[roomCode].numberOfPlayers) {
      socket.emit('room-full', roomCode);
      return;
    }
    
    socket.join(roomCode);
    console.log(displayName + " joined room: " + roomCode)
    
    if (rooms[roomCode]) {
      rooms[roomCode].players.push(displayName);

      // Remember this socket's info!
      socketToUser[socket.id] = { roomCode: roomCode, displayName: displayName };
      
      // Tell everyone in the room (including the joiner) to update their list
      io.to(roomCode).emit('update-players', rooms[roomCode].players);
    }
  });

  socket.on('check-if-room-exists', (roomCode) => {
    // 1. Check if the room exists
    if (roomCode in rooms) {
      
      // 2. Check if the room is full
      if (rooms[roomCode].players.length >= rooms[roomCode].numberOfPlayers) {
        socket.emit('RoomCheck', 'full'); // Tell frontend it's full
      } else {
        socket.emit('RoomCheck', 'exists'); // Tell frontend it's safe to join
      }

    } else {
      socket.emit('RoomCheck', 'not-found'); // Tell frontend it doesn't exist
    }
  });

  /* ---------------------- Chat & Communication ---------------------- */
  socket.on('send-message', (roomCode, message) => {
    const user = socketToUser[socket.id];
    // Check if player is eliminated
    if (user && rooms[roomCode] && (!rooms[roomCode].eliminatedPlayers || !rooms[roomCode].eliminatedPlayers.has(user.displayName))) {
      socket.to(roomCode).emit("receive-message", message);
    }
  });

  /* ---------------------- Game Actions ---------------------- */
  // Host wants to start the game
  socket.on('start-game', (roomCode) => {
      if (rooms[roomCode] && rooms[roomCode].creatorId === socket.id) {
          console.log("Host is starting game in room: " + roomCode);
          
          // 1. Ask Socket.IO for the hidden IDs of everyone currently inside this room
          const playerIds = Array.from(io.sockets.adapter.rooms.get(roomCode) || []);
          
          // 2. Shuffle the players randomly
          const shuffledPlayers = playerIds.sort(() => Math.random() - 0.5);
          
          // Store player roles for night actions
          rooms[roomCode].playerRoles = {};
          shuffledPlayers.forEach((playerId, index) => {
              let assignedRole = "Villager"; // Default role
              
              if (index === 0) {
                  assignedRole = "Wolf"; // The first random person gets to be the killer
              }
              
              rooms[roomCode].playerRoles[playerId] = assignedRole;
              // You can add more roles here later! (e.g., if index === 1, role = "Detective")

              // 4. Send this role PRIVATELY to this specific player only!
              io.to(playerId).emit('receive-role', assignedRole);
          });
          
          // 5. Finally, tell the whole room to play the intro animation
          io.to(roomCode).emit('game-starting');

          rooms[roomCode].votes = {}; // Track votes: {playerId: targetPlayerName}
          rooms[roomCode].gamePhase = 'day';
          rooms[roomCode].discussionTimer = null;
          rooms[roomCode].votingTimer = null;
          rooms[roomCode].skippedPlayers = new Set(); // Track who has skipped
          rooms[roomCode].eliminatedPlayers = new Set(); // Track eliminated players by name

          // After the reveal animation we immediately begin the day/night cycle
          setTimeout(() => {
              startDayPhase(roomCode);
          }, 5000);
      }
  });

  socket.on('cast-vote', (roomCode, targetPlayerName) => {
    if (rooms[roomCode] && rooms[roomCode].gamePhase === 'voting') {
        rooms[roomCode].votes[socket.id] = targetPlayerName;
        // if every player in room has voted, end voting early
        const playerIds = Array.from(io.sockets.adapter.rooms.get(roomCode) || []);
        if (Object.keys(rooms[roomCode].votes).length >= playerIds.length) {
            // clear timer if running
            if (rooms[roomCode].votingTimer) {
                clearTimeout(rooms[roomCode].votingTimer);
                rooms[roomCode].votingTimer = null;
            }
            endVotingPhase(roomCode);
        }
    }
  });

  socket.on('skip-discussion', (roomCode) => {
    if (rooms[roomCode] && rooms[roomCode].gamePhase === 'discussion') {
        const user = socketToUser[socket.id];
        
        // Don't allow eliminated players to skip
        if (user && rooms[roomCode].eliminatedPlayers && rooms[roomCode].eliminatedPlayers.has(user.displayName)) {
            return;
        }
        
        rooms[roomCode].skippedPlayers.add(socket.id);
        
        // Get list of non-eliminated active players
        const playerIds = Array.from(io.sockets.adapter.rooms.get(roomCode) || []);
        const activePlayerIds = playerIds.filter(id => {
            const player = socketToUser[id];
            return player && (!rooms[roomCode].eliminatedPlayers || !rooms[roomCode].eliminatedPlayers.has(player.displayName));
        });
        
        // Check if all active (non-eliminated) players have skipped
        if (rooms[roomCode].skippedPlayers.size === activePlayerIds.length) {
            // All active players have skipped, end discussion early
            if (rooms[roomCode].discussionTimer) {
                clearTimeout(rooms[roomCode].discussionTimer);
            }
            io.to(roomCode).emit('discussion-skipped');
            startVotingPhase(roomCode); // Start voting immediately
        } else {
            // Notify others that someone skipped
            const remaining = activePlayerIds.length - rooms[roomCode].skippedPlayers.size;
            io.to(roomCode).emit('player-skipped', { remaining: remaining });
        }
    }
  });

  socket.on('submit-night-action', (roomCode, actionData) => {
    if (rooms[roomCode] && rooms[roomCode].gamePhase === 'night') {
        // Store the action
        rooms[roomCode].nightActions[socket.id] = {
            player: socketToUser[socket.id].displayName,
            role: rooms[roomCode].playerRoles[socket.id],
            ...actionData
        };
        
        // Clear the action timeout
        if (rooms[roomCode].actionTimeout) {
            clearTimeout(rooms[roomCode].actionTimeout);
            rooms[roomCode].actionTimeout = null;
        }
        
        // Process next action
        processNextNightAction(roomCode);
    }
  });
});