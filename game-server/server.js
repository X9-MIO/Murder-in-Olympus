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

    io.to(roomCode).emit('night-phase-started', {
        message: "This is the night phase. A werewolf will come and kill someone."
    });
    
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
            message: 'Choose a player to eliminate tonight...',
            duration: 20 // 20 seconds to choose
        });
    }
    

    rooms[roomCode].actionTimeout = setTimeout(() => {
        // Action timed out, skip to next
        processNextNightAction(roomCode);
    }, 20000);
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
    
    // 1. Tell everyone who died (Show the Day Page)
    io.to(roomCode).emit('night-actions-revealed', {
        actions: actions,
        eliminatedPlayer: werewolfKill ? werewolfKill.target : null,
        message: "The night has passed... Here is what transpired:"
    });
    
    // 2. NOW check if that death ended the game
    const winner = checkGameOver(roomCode);
    
    if (winner) {
        // If the game is over, wait 8 seconds for people to read the morning death message, 
        // then trigger the Game Over screen
        setTimeout(() => {
            io.to(roomCode).emit('game-over', {
                winner: winner,
                message: winner === 'Villagers' ? 'The Werewolf has been eliminated! The village is safe.' : 'The Werewolf has overpowered the village!'
            });
        }, 8000); 
        return; // STOP the game loop here so it doesn't go to discussion
    }
    
    // 3. If the game is NOT over, proceed to the discussion phase as normal
    setTimeout(() => {
        startNewDiscussionPhase(roomCode);
    }, 10000); // 10 seconds to read the morning message
}

function startNewDiscussionPhase(roomCode) {
    rooms[roomCode].gamePhase = 'discussion';
    rooms[roomCode].votes = {}; // Track votes immediately! {playerId: targetPlayerName or 'skip'}
    
    setTimeout(() => {
        io.to(roomCode).emit('discussion-phase-started', {
            players: rooms[roomCode].players,
            duration: 90 // Let's give 90 seconds since voting is happening concurrently
        });
        
        rooms[roomCode].discussionTimer = setTimeout(() => {
            endVotingPhase(roomCode); // Discussion ending automatically ends the voting
        }, 90000);
    }, 2000);
}



function endVotingPhase(roomCode) {
    const votes = rooms[roomCode].votes;
    const voteCount = {};
    
    // If NO ONE voted at all (timer ran out), default to skip
    if (Object.keys(votes).length === 0) {
        voteCount['skip'] = 1;
    } else {
        // Count the votes
        Object.values(votes).forEach(targetName => {
            voteCount[targetName] = (voteCount[targetName] || 0) + 1;
        });
    }
    // Find the option with the most votes
    let eliminated = Object.keys(voteCount).reduce((a, b) => 
        voteCount[a] > voteCount[b] ? a : b
    );

    // Tie-breaker logic: If there is a tie for the most votes, default to 'skip'
    const maxVotes = voteCount[eliminated];
    const tiedOptions = Object.keys(voteCount).filter(key => voteCount[key] === maxVotes);
    if (tiedOptions.length > 1) {
        eliminated = 'skip';
    }
    
    // Only eliminate someone if "skip" didn't win
    if (eliminated !== 'skip') {
        rooms[roomCode].players = rooms[roomCode].players.filter(p => p !== eliminated);
        if (!rooms[roomCode].eliminatedPlayers) rooms[roomCode].eliminatedPlayers = new Set();
        rooms[roomCode].eliminatedPlayers.add(eliminated);
    }
    
    // 1. Tell everyone who was voted out
    io.to(roomCode).emit('player-eliminated', {
        name: eliminated,
        voteCount: voteCount[eliminated]
    });
    
    // 2. NOW check if that vote ended the game
    const winner = checkGameOver(roomCode);
    
    if (winner) {
        // If the game is over, wait 6 seconds to read the vote results, then show Game Over
        setTimeout(() => {
            io.to(roomCode).emit('game-over', {
                winner: winner,
                message: winner === 'Villagers' ? 'The Werewolf has been eliminated! The village is safe.' : 'The Werewolf has overpowered the village!'
            });
        }, 6000); 
        return; // STOP the game loop here
    }
    
    // 3. If the game is NOT over, proceed to the Night Phase
    setTimeout(() => {
        startNightPhase(roomCode);
    }, 5000);
}


function checkGameOver(roomCode) {
    const room = rooms[roomCode];
    if (!room) return null;

    let aliveWolves = 0;
    let aliveVillagers = 0;

    // Loop through all original roles to see who is still alive
    Object.keys(room.playerRoles).forEach(socketId => {
        const user = socketToUser[socketId];
        
        // Make sure the user exists AND they haven't been eliminated
        if (user && !room.eliminatedPlayers.has(user.displayName)) {
            if (room.playerRoles[socketId] === 'Wolf') {
                aliveWolves++;
            } else {
                aliveVillagers++;
            }
        }
    });

    console.log(`Checking Win State: Wolves(${aliveWolves}) vs Villagers(${aliveVillagers})`);

    // Win Conditions
    if (aliveWolves === 0) return 'Villagers';
    
    // If the number of wolves is equal to or greater than the villagers, wolves win
    if (aliveWolves >= aliveVillagers && aliveWolves > 0) return 'Werewolf'; 
    
    return null; // Game is not over yet
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
  socket.on('create-room', (roomName, numberOfPlayer, creatorname) => {
    // 1. Generate a unique code
    const code = createUniqueRoom(rooms);
    
    // 2. Save the room data
    rooms[code] = {
      roomName: roomName,
      numberOfPlayers: numberOfPlayer,
      players: [creatorname],
      creatorId: socket.id,
      gamePhase: 'lobby', // Good practice to initialize the phase immediately
      eliminatedPlayers: new Set() // Initialize this early too
    };
    
    // 3. Register the user internally
    socketToUser[socket.id] = { 
        roomCode: code, 
        displayName: creatorname 
    };

    // 4. ACTUALLY join the Socket.IO room
    socket.join(code);
    console.log(`${creatorname} created and joined room: ${code}`);
    
    // 5. Send the new code back to the creator so they can transition to the lobby
    socket.emit('room-created', code); 
    
    // 6. Update the player list (even though it's just them right now)
    io.to(code).emit('update-players', rooms[code].players);
  });


  /* ---------------------- Join Room Logic ---------------------- */
  
  // 1. Check if the room is valid before letting them join
  socket.on('check-if-room-exists', (roomCode) => {
    if (roomCode in rooms) {
      if (rooms[roomCode].players.length >= rooms[roomCode].numberOfPlayers) {
        socket.emit('RoomCheck', 'full'); 
      } else {
        socket.emit('RoomCheck', 'exists'); 
      }
    } else {
      socket.emit('RoomCheck', 'not-found'); 
    }
  });

  // 2. Actually join the room
  socket.on('join-room', (roomCode, displayName) => {
    // Double check it isn't full just in case
    if(rooms[roomCode].players.length >= rooms[roomCode].numberOfPlayers) {
      socket.emit('room-full', roomCode);
      return;
    }
    
    socket.join(roomCode);
    console.log(`${displayName} joined room: ${roomCode}`);
    
    if (rooms[roomCode]) {
      rooms[roomCode].players.push(displayName);

      // Remember this socket's info!
      socketToUser[socket.id] = { roomCode: roomCode, displayName: displayName };
      
      // Tell everyone in the room to update their player list
      io.to(roomCode).emit('update-players', rooms[roomCode].players);
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
              startNightPhase(roomCode);
          }, 17000); // 17 seconds to allow for role reveal animation
      }
  });

 socket.on('cast-vote', (roomCode, targetPlayerName) => {
    if (rooms[roomCode] && rooms[roomCode].gamePhase === 'discussion') {
        // Record the vote
        rooms[roomCode].votes[socket.id] = targetPlayerName;
        
        // Calculate current tallies to send back to clients instantly
        const voteCount = {};
        Object.values(rooms[roomCode].votes).forEach(target => {
            voteCount[target] = (voteCount[target] || 0) + 1;
        });

        // Tell everyone the new totals
        io.to(roomCode).emit('live-vote-update', voteCount);

        // Check if everyone alive has voted
        const playerIds = Array.from(io.sockets.adapter.rooms.get(roomCode) || []);
        const activePlayerIds = playerIds.filter(id => {
            const p = socketToUser[id];
            return p && !rooms[roomCode].eliminatedPlayers.has(p.displayName);
        });

        if (Object.keys(rooms[roomCode].votes).length >= activePlayerIds.length) {
            if (rooms[roomCode].discussionTimer) {
                clearTimeout(rooms[roomCode].discussionTimer);
                rooms[roomCode].discussionTimer = null;
            }
            endVotingPhase(roomCode);
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