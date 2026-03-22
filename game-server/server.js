// server.js
console.log("server.js started");

const crypto = require("crypto").webcrypto;
const { randomBytes } = require("crypto");
const dbFns = require("./databaseFunction");
const io = require("socket.io")(3000, {
  cors: {
    origin: "http://localhost:5173",
  },
});

console.log("Socket.IO server running on port 3000");

/* ========================================================================== */
/* RUNTIME STATE                                                              */
/* ========================================================================== */

const socketToUser = {};     // socket.id -> { roomCode, displayName }
const runtimeRooms = {};     // roomCode -> { actionQueue: [], actionTimeout, discussionTimer }

/* ========================================================================== */
/* UTILITY FUNCTIONS                                                          */
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

function createRuntimeRoom(roomCode) {
  if (!runtimeRooms[roomCode]) {
    runtimeRooms[roomCode] = {
      actionQueue: [],
      actionTimeout: null,
      discussionTimer: null,
    };
  }
}

function clearRuntimeRoom(roomCode) {
  if (!runtimeRooms[roomCode]) return;
  if (runtimeRooms[roomCode].actionTimeout) {
    clearTimeout(runtimeRooms[roomCode].actionTimeout);
  }
  if (runtimeRooms[roomCode].discussionTimer) {
    clearTimeout(runtimeRooms[roomCode].discussionTimer);
  }
  delete runtimeRooms[roomCode];
}

function createUniqueRoomCode() {
  let code;
  do {
    code = generateRoomCode(6);
  } while (dbFns.getRoom(code));
  return code;
}

function getAlivePlayers(roomCode) {
  return dbFns.getPlayers(roomCode).filter((p) => !p.eliminated);
}

function getAlivePlayerNames(roomCode) {
  return getAlivePlayers(roomCode).map((p) => p.display_name);
}

function buildVoteCount(votes) {
  const voteCount = {};
  votes.forEach((vote) => {
    voteCount[vote.target_name] = (voteCount[vote.target_name] || 0) + 1;
  });
  return voteCount;
}

// ----- Helpers for roles & resolution -----
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Simple composition:
// - Always 1 Wolf
// - Add Seer + Healer if >= 5 players
// - Add Little Girl if >= 6 players
// - Fill the rest with Villagers
function buildRoleList(playerCount, roleConfig = null) {
  // If custom config is provided, use it
  if (roleConfig) {
    const roles = [];
    
    // Add wolves
    for (let i = 0; i < roleConfig.wolves && roles.length < playerCount; i++) {
      roles.push("Wolf");
    }
    // Add seers
    for (let i = 0; i < roleConfig.seers && roles.length < playerCount; i++) {
      roles.push("Seer");
    }
    // Add healers
    for (let i = 0; i < roleConfig.healers && roles.length < playerCount; i++) {
      roles.push("Healer");
    }
    // Add little girls
    for (let i = 0; i < roleConfig.littleGirls && roles.length < playerCount; i++) {
      roles.push("Little Girl");
    }
    // Add Artemis!
    for (let i = 0; i < roleConfig.artemis && roles.length < playerCount; i++) {
      roles.push("Artemis");
    }
    
    // Fill remaining with villagers
    while (roles.length < playerCount) {
      roles.push("Villager");
    }
    
    return shuffle(roles);
  }
  
  // Default behavior if no config
  const roles = ["Wolf"];
  if (playerCount >= 5) roles.push("Seer", "Healer");
  if (playerCount >= 6) roles.push("Little Girl");
  if (playerCount >= 7) roles.push("Artemis");
  while (roles.length < playerCount) roles.push("Villager");
  return shuffle(roles);
}

// Majority with random tie-break (future-proof if you add multiple Wolves)
function majorityChoice(names) {
  if (!names || names.length === 0) return null;
  const counts = {};
  for (const n of names) counts[n] = (counts[n] || 0) + 1;
  const max = Math.max(...Object.values(counts));
  const top = Object.entries(counts)
    .filter(([, c]) => c === max)
    .map(([n]) => n);
  return top[Math.floor(Math.random() * top.length)];
}

/* ========================================================================== */
/* GAME LOOP LOGIC                                                            */
/* ========================================================================== */

function startNightPhase(roomCode) {
  const room = dbFns.getRoom(roomCode);
  if (!room) return;

  createRuntimeRoom(roomCode);

  dbFns.updateRoomPhase(roomCode, "night");
  dbFns.clearNightActions(roomCode);

  // Tell EVERYONE the night has started (Villagers will just see "Waiting for sunrise...")
  io.to(roomCode).emit("night-phase-started", {
    message: "Night falls on Olympus...",
  });

  const alivePlayers = getAlivePlayers(roomCode).map((p) => ({
    id: p.socket_id,
    name: p.display_name,
    role: p.role,
  }));

  const wolves = alivePlayers.filter((p) => p.role === "Wolf");
  const healer   = alivePlayers.find((p) => p.role === "Healer");
  const seer     = alivePlayers.find((p) => p.role === "Seer");
  const littleG  = alivePlayers.find((p) => p.role === "Little Girl");
  const Artemis   = alivePlayers.find((p) => p.role === "Artemis");

  const allNames     = alivePlayers.map((p) => p.name);
  const nonWolfNames = alivePlayers.filter((p) => p.role !== "Wolf").map((p) => p.name);

  // --- SEND ACTIONS TO EVERYONE AT THE SAME TIME ---

  if (seer) {
    io.to(seer.id).emit("night-action-required", {
      type: "seer-inspect",
      targets: allNames.filter((n) => n !== seer.name),
      message: "Choose a player to inspect...",
      duration: 20,
    });
  }

  if (healer) {
    io.to(healer.id).emit("night-action-required", {
      type: "healer-save",
      targets: allNames, // allow self-save
      message: "Choose a player to save...",
      duration: 20,
    });
  }

  wolves.forEach(wolf => {
    io.to(wolf.id).emit("night-action-required", {
      type: "werewolf-kill",
      targets: nonWolfNames, // They can't kill other wolves!
      message: "Choose a player to eliminate tonight...",
      duration: 20,
    });
  });

  if (littleG) {
    io.to(littleG.id).emit("night-action-required", {
      type: "little-girl-peek",
      targets: ["Click to Peek at the Wolf"],
      message: "WARNING: You have a 70% chance to be seen!",
      duration: 10 + Math.floor(Math.random() * 10), // Changed to random number between 10s and 19s so her timer perfectly syncs with everyone else
    });
  }

  if (Artemis) {
    io.to(Artemis.id).emit("night-action-required", {
      type: "Artemis-shoot",
      // Give him the option to not shoot anyone, plus the rest of the players
      targets: ["Do not shoot", ...allNames.filter((n) => n !== Artemis.name)],
      message: "Shoot a Wolf! If you shoot an innocent, YOU will die of guilt!",
      duration: 20,
    });
  }

  // --- START THE ONE GLOBAL TIMER ---
  // When 20 seconds are up, the server automatically resolves everything!
  runtimeRooms[roomCode].actionTimeout = setTimeout(() => {
    runtimeRooms[roomCode].actionTimeout = null;
    revealNightActions(roomCode);
  }, 20000); 
}



function revealNightActions(roomCode) {
  const room = dbFns.getRoom(roomCode);
  if (!room) return;

  dbFns.updateRoomPhase(roomCode, "action-reveal");
  const actions = dbFns.getNightActions(roomCode);

  let deaths = []; // We use an array now, because multiple people can die!

  // 1. Resolve Wolf kill
  const wolfVotes = actions.filter((a) => a.action_type === "werewolf-kill").map((a) => a.target_name).filter(Boolean);
  const healerSave = actions.find((a) => a.action_type === "healer-save");
  const savedName  = healerSave ? healerSave.target_name : null;

  let wolfKill = majorityChoice(wolfVotes);
  if (wolfKill && savedName && wolfKill === savedName) {
    wolfKill = null; // Healer saved them!
  }
  if (wolfKill) deaths.push(wolfKill);

  // 2. Resolve Artemis shot
  const ArtemisAction = actions.find(a => a.action_type === "Artemis-shoot");
  if (ArtemisAction && ArtemisAction.target_name && ArtemisAction.target_name !== "Do not shoot") {
    const alivePlayers = dbFns.getAlivePlayers(roomCode);
    const target = alivePlayers.find(p => p.display_name === ArtemisAction.target_name);
    const sheriffPlayer = alivePlayers.find(p => p.role === "Artemis");

    if (target && sheriffPlayer) {
      if (target.role === "Wolf") {
        deaths.push(target.display_name); // Good shot! The Wolf dies.
      } else {
        deaths.push(sheriffPlayer.display_name); // Bad shot! Sheriff dies instead.
      }
    }
  }

  // Make sure we don't list the same person twice (if Wolf & Sheriff killed the same guy)
  deaths = [...new Set(deaths)];

  // Actually eliminate them in the database
  deaths.forEach(name => dbFns.eliminatePlayerByName(roomCode, name));

  if (savedName) {
    const savedPlayer = dbFns.getAlivePlayers(roomCode).find(p => p.display_name === savedName);
    if (savedPlayer) {
        io.to(savedPlayer.socket_id).emit("you-were-saved");
    }
  }

  // Build the narrative message
  let morningMessage = "The sun rises over Olympus. ";
  if (deaths.length > 0) {
    morningMessage += `Tragedy has struck! ${deaths.join(" and ")} died in the night.`;
  } else {
    morningMessage += "It is a miracle. Nobody was killed last night.";
  }

  io.to(roomCode).emit("night-actions-revealed", {
    actions,
    eliminatedPlayers: deaths, // Sending an array of names now!
    message: morningMessage
  });

  dbFns.clearNightActions(roomCode);


  const aliveAfterNight = dbFns.getAlivePlayers(roomCode);
  const aliveNonWolves = aliveAfterNight.filter(p => p.role !== "Wolf");

  // If there is at least one non-wolf left, roll a 10% chance
  if (aliveNonWolves.length > 0 && Math.random() < 0.10) {
     // Pick a random innocent player
     const turnedPlayer = aliveNonWolves[Math.floor(Math.random() * aliveNonWolves.length)];
     
     // Change their role in the database to a Wolf!
     dbFns.assignRole(turnedPlayer.socket_id, "Wolf");

     // Secretly message them so they know their role changed!
     io.to(turnedPlayer.socket_id).emit("you-turned-wolf");
     console.log(`[INFECTION]: ${turnedPlayer.display_name} was turned into a Wolf!`);
  }
  // Check Game Over...
  const winner = checkGameOver(roomCode);
  if (winner) {
    dbFns.setWinner(roomCode, winner);
    dbFns.updateRoomPhase(roomCode, "game_startNightPhaseover");
    setTimeout(() => {
      io.to(roomCode).emit("game-over", {
        winner,
        message: winner === "Villagers" 
            ? "The Werewolf has been eliminated! The village is safe." 
            : "The Werewolf has overpowered the village!",
      });
    }, 8000);
    return;
  }

  setTimeout(() => { startDiscussionPhase(roomCode); }, 10000);
}

function startDiscussionPhase(roomCode) {
  const room = dbFns.getRoom(roomCode);
  if (!room) return;

  createRuntimeRoom(roomCode);

  dbFns.updateRoomPhase(roomCode, "discussion");
  dbFns.clearVotes(roomCode);

  setTimeout(() => {
    io.to(roomCode).emit("discussion-phase-started", {
      players: getAlivePlayerNames(roomCode),
      duration: 90,
    });

    runtimeRooms[roomCode].discussionTimer = setTimeout(() => {
      endVotingPhase(roomCode);
    }, 90000);
  }, 2000);
}

function endVotingPhase(roomCode) {
  const room = dbFns.getRoom(roomCode);
  if (!room) return;

  const votes = dbFns.getVotes(roomCode);
  let voteCount = {};

  if (votes.length === 0) {
    voteCount["skip"] = 1;
  } else {
    voteCount = buildVoteCount(votes);
  }

  let eliminated = Object.keys(voteCount).reduce((a, b) =>
    voteCount[a] > voteCount[b] ? a : b
  );

  const maxVotes = voteCount[eliminated];
  const tiedOptions = Object.keys(voteCount).filter((key) => voteCount[key] === maxVotes);

  if (tiedOptions.length > 1) {
    eliminated = "skip";
  }

  if (eliminated !== "skip") {
    dbFns.eliminatePlayerByName(roomCode, eliminated);
  }

  io.to(roomCode).emit("player-eliminated", {
    name: eliminated,
    voteCount: voteCount[eliminated],
  });

  const winner = checkGameOver(roomCode);
  if (winner) {
    dbFns.setWinner(roomCode, winner);
    dbFns.updateRoomPhase(roomCode, "game_over");

    setTimeout(() => {
      io.to(roomCode).emit("game-over", {
        winner,
        message:
          winner === "Villagers"
            ? "The Werewolf has been eliminated! The village is safe."
            : "The Werewolf has overpowered the village!",
      });
    }, 6000);
    return;
  }

  setTimeout(() => {
    startNightPhase(roomCode);
  }, 5000);
}

function checkGameOver(roomCode) {
  const players = dbFns.getPlayers(roomCode);
  if (!players || players.length === 0) return null;

  let aliveWolves = 0;
  let aliveVillagers = 0;

  players.forEach((player) => {
    if (!player.eliminated) {
      if (player.role === "Wolf") {
        aliveWolves++;
      } else {
        aliveVillagers++;
      }
    }
  });

  console.log(`Checking Win State: Wolves(${aliveWolves}) vs Villagers(${aliveVillagers})`);

  if (aliveWolves === 0) return "Villagers";
  if (aliveWolves >= aliveVillagers && aliveWolves > 0) return "Werewolf";

  return null;
}

/* ========================================================================== */
/* SOCKET EVENTS                                                              */
/* ========================================================================== */

io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  /* ---------------------- Disconnect Handling ---------------------- */
  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);

    const user = socketToUser[socket.id];
    if (!user) return;

    const { roomCode, displayName } = user;
    const room = dbFns.getRoom(roomCode);

    if (room) {
      if (room.creator_socket_id === socket.id) {
        io.to(roomCode).emit("host-disconnected");
        dbFns.deleteRoom(roomCode);
        clearRuntimeRoom(roomCode);
        console.log(`Room ${roomCode} deleted because the host left.`);
      } else {
        dbFns.removePlayer(socket.id);

        const updatedPlayers = dbFns
          .getPlayers(roomCode)
          .filter((p) => !p.eliminated)
          .map((p) => p.display_name);

        io.to(roomCode).emit("update-players", updatedPlayers);

        if (dbFns.getPlayers(roomCode).length === 0) {
          dbFns.deleteRoom(roomCode);
          clearRuntimeRoom(roomCode);
          console.log(`Room ${roomCode} deleted because it is empty.`);
        } else {
          console.log(`${displayName} removed from room ${roomCode}.`);
        }
      }
    }

    delete socketToUser[socket.id];
  });

 /* ---------------------- Create Room ---------------------- */
  socket.on("create-room", (numberOfPlayer, creatorname, roleConfig = null) => {
    const code = createUniqueRoomCode();

    // REMOVE roleConfig from here so the database doesn't crash!
    dbFns.createRoom(code, numberOfPlayer, socket.id); 
    dbFns.addPlayer(code, socket.id, creatorname, 1);

    socketToUser[socket.id] = {
      roomCode: code,
      displayName: creatorname,
    };

    createRuntimeRoom(code);
    
    // Save the custom roles into the server's memory instead!
    runtimeRooms[code].roleConfig = roleConfig; 

    socket.join(code);
    socket.emit("room-created", code);

    const players = dbFns.getPlayers(code).map((p) => p.display_name);
    io.to(code).emit("update-players", players);
  });

  /* ---------------------- Check Room ---------------------- */
  socket.on("check-if-room-exists", (roomCode, requestedName) => {
    const room = dbFns.getRoom(roomCode);

    if (!room) {
      socket.emit("RoomCheck", "not-found");
      return;
    }

    const players = dbFns.getPlayers(roomCode);
    if (players.length >= room.number_of_players) {
      socket.emit("RoomCheck", "full");
      return;
    }

    
    if (requestedName) {
      const nameTaken = players.some(
        (p) => p.display_name.toLowerCase() === requestedName.toLowerCase()
      );
      
      if (nameTaken) {
        socket.emit("RoomCheck", "name-taken");
        return;
      }
    }

    socket.emit("RoomCheck", "exists");
  });

  /* ---------------------- Join Room ---------------------- */
  socket.on("join-room", (roomCode, displayName) => {
    const room = dbFns.getRoom(roomCode);

    if (!room) {
      socket.emit("RoomCheck", "not-found");
      return;
    }

    const players = dbFns.getPlayers(roomCode);
    if (players.length >= room.number_of_players) {
      socket.emit("room-full", roomCode);
      return;
    }

    socket.join(roomCode);
    dbFns.addPlayer(roomCode, socket.id, displayName, 0);

    socketToUser[socket.id] = { roomCode, displayName };

    const updatedPlayers = dbFns.getPlayers(roomCode).map((p) => p.display_name);
    io.to(roomCode).emit("update-players", updatedPlayers);
  });

  /* ---------------------- Chat ---------------------- */
  socket.on("send-message", (roomCode, message) => {
    const user = socketToUser[socket.id];
    if (!user) return;

    const player = dbFns.getPlayerBySocket(socket.id);
    if (!player || player.eliminated) return;

    dbFns.saveMessage(roomCode, socket.id, user.displayName, message);

    // Client locally renders "You: ..." so send to others only
    socket.to(roomCode).emit("receive-message", message);
  });

  /* ---------------------- Start Game ---------------------- */
  socket.on("start-game", (roomCode) => {
    const room = dbFns.getRoom(roomCode);
    if (!room || room.creator_socket_id !== socket.id) return;

    const players = dbFns.getPlayers(roomCode);
    
    // Pull the roles directly from memory instead of the database!
    const roleConfig = runtimeRooms[roomCode].roleConfig; 
    const roles = buildRoleList(players.length, roleConfig);

    // Assign shuffled roles fairly
    const order = [...players].sort(() => Math.random() - 0.5);
    order.forEach((player, idx) => {
      const role = roles[idx];
      dbFns.assignRole(player.socket_id, role);
      io.to(player.socket_id).emit("receive-role", role);
    });

    dbFns.updateRoomPhase(roomCode, "starting");
    io.to(roomCode).emit("game-starting");

    setTimeout(() => {
      startNightPhase(roomCode);
    }, 17000);
  });

  /* ---------------------- Voting ---------------------- */
  socket.on("cast-vote", (roomCode, targetPlayerName) => {
    const room = dbFns.getRoom(roomCode);
    if (!room || room.game_phase !== "discussion") return;

    const player = dbFns.getPlayerBySocket(socket.id);
    if (!player || player.eliminated) return;

    dbFns.saveVote(roomCode, socket.id, targetPlayerName);

    const votes = dbFns.getVotes(roomCode);
    const voteCount = buildVoteCount(votes);

    io.to(roomCode).emit("live-vote-update", voteCount);

    const alivePlayers = getAlivePlayers(roomCode);
    if (votes.length >= alivePlayers.length) {
      if (runtimeRooms[roomCode]?.discussionTimer) {
        clearTimeout(runtimeRooms[roomCode].discussionTimer);
        runtimeRooms[roomCode].discussionTimer = null;
      }
      endVotingPhase(roomCode);
    }
  });

  /* ---------------------- Night Action ---------------------- */
 /* ---------------------- Night Action ---------------------- */
  socket.on("submit-night-action", (roomCode, actionData) => {
    const room = dbFns.getRoom(roomCode);
    if (!room || room.game_phase !== "night") return;

    const player = dbFns.getPlayerBySocket(socket.id);
    if (!player || player.eliminated) return;

    dbFns.saveNightAction(
      roomCode,
      socket.id,
      player.display_name,
      player.role,
      actionData.type,
      actionData.target || null
    );

    // Seer logic: Instant feedback
    if (actionData.type === "seer-inspect" && player.role === "Seer" && actionData.target) {
      const target = getAlivePlayers(roomCode).find((p) => p.display_name === actionData.target);
      const targetRole = target ? target.role : "Unknown";
      io.to(socket.id).emit("seer-result", { target: actionData.target, role: targetRole });
    }

    // Little Girl logic: Reveal wolf, calculate 70% risk
    if (actionData.type === "little-girl-peek" && player.role === "Little Girl") {
      const currentWolves = getAlivePlayers(roomCode).filter(p => p.role === "Wolf");
      const wolfNames = currentWolves.map(p => p.display_name);
      
      io.to(socket.id).emit("little-girl-result", { wolves: wolfNames });

      // 70% chance to get caught!
      if (Math.random() < 0.70) {
        // Tell EVERY wolf that the Little Girl is peeking
        currentWolves.forEach(w => {
          io.to(w.socket_id).emit("little-girl-caught", { littleGirlName: player.display_name });
        });
      }
    }

    
  });

  /* ---------------------- Play Again / Reset ---------------------- */
  socket.on("play-again", (roomCode) => {
    const room = dbFns.getRoom(roomCode);
    if (!room) return;

    // 1. Reset DB roles, votes, and phase
    dbFns.resetRoomForNewGame(roomCode);

    // 2. Tell everyone to go back to the lobby
    io.to(roomCode).emit("room-reset");

    // 3. Send a fresh player list (all alive again)
    const players = dbFns.getPlayers(roomCode).map((p) => p.display_name);
    io.to(roomCode).emit("update-players", players);
  });

})