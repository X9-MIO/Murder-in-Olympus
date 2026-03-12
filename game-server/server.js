console.log("server.js started");
const crypto = require("crypto").webcrypto;
const dbFns = require("./databaseFunction");
const io = require("socket.io")(3000, {
  cors: {
    origin: "http://localhost:5173",
  },
});

const socketToUser = {};

// Runtime-only state: timers / queues / handles
const runtimeRooms = {};

console.log("Socket.IO server running on port 3000");


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

/* ========================================================================== */
/* GAME LOOP LOGIC                                                            */
/* ========================================================================== */

function startNightPhase(roomCode) {
  const room = dbFns.getRoom(roomCode);
  if (!room) return;

  createRuntimeRoom(roomCode);
  runtimeRooms[roomCode].actionQueue = [];

  dbFns.updateRoomPhase(roomCode, "night");
  dbFns.clearNightActions(roomCode);

  io.to(roomCode).emit("night-phase-started", {
    message: "This is the night phase. A werewolf will come and kill someone.",
  });

  const alivePlayers = getAlivePlayers(roomCode);

  const playersWithRoles = alivePlayers.map((player) => ({
    id: player.socket_id,
    name: player.display_name,
    role: player.role,
  }));

  const werewolf = playersWithRoles.find((p) => p.role === "Wolf");

  if (werewolf) {
    runtimeRooms[roomCode].actionQueue.push({
      type: "werewolf-kill",
      player: werewolf,
      targets: playersWithRoles
        .filter((p) => p.role !== "Wolf")
        .map((p) => p.name),
    });
  }

  processNextNightAction(roomCode);
}

function processNextNightAction(roomCode) {
  const room = dbFns.getRoom(roomCode);
  if (!room) return;

  createRuntimeRoom(roomCode);

  if (runtimeRooms[roomCode].actionQueue.length === 0) {
    setTimeout(() => {
      revealNightActions(roomCode);
    }, 2000);
    return;
  }

  const action = runtimeRooms[roomCode].actionQueue.shift();

  if (action.type === "werewolf-kill") {
    io.to(action.player.id).emit("night-action-required", {
      type: "werewolf-kill",
      targets: action.targets,
      message: "Choose a player to eliminate tonight...",
      duration: 20,
    });
  }

  runtimeRooms[roomCode].actionTimeout = setTimeout(() => {
    processNextNightAction(roomCode);
  }, 20000);
}

function revealNightActions(roomCode) {
  const room = dbFns.getRoom(roomCode);
  if (!room) return;

  dbFns.updateRoomPhase(roomCode, "action-reveal");

  const actions = dbFns.getNightActions(roomCode);
  const werewolfKill = actions.find((action) => action.action_type === "werewolf-kill");

  if (werewolfKill && werewolfKill.target_name) {
    dbFns.eliminatePlayerByName(roomCode, werewolfKill.target_name);
  }

  io.to(roomCode).emit("night-actions-revealed", {
    actions,
    eliminatedPlayer: werewolfKill ? werewolfKill.target_name : null,
    message: "The night has passed... Here is what transpired:",
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
    }, 8000);
    return;
  }

  setTimeout(() => {
    startDiscussionPhase(roomCode);
  }, 10000);
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
  const tiedOptions = Object.keys(voteCount).filter(
    (key) => voteCount[key] === maxVotes
  );

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
  socket.on("create-room", (roomName, numberOfPlayer, creatorname) => {
    const code = createUniqueRoomCode();

    dbFns.createRoom(code, roomName, numberOfPlayer, socket.id);
    dbFns.addPlayer(code, socket.id, creatorname, 1);

    socketToUser[socket.id] = {
      roomCode: code,
      displayName: creatorname,
    };

    createRuntimeRoom(code);
    socket.join(code);

    socket.emit("room-created", code);

    const players = dbFns.getPlayers(code).map((p) => p.display_name);
    io.to(code).emit("update-players", players);
  });

  /* ---------------------- Check Room ---------------------- */
  socket.on("check-if-room-exists", (roomCode) => {
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

    socket.to(roomCode).emit("receive-message",message);
  });

  /* ---------------------- Start Game ---------------------- */
  socket.on("start-game", (roomCode) => {
    const room = dbFns.getRoom(roomCode);
    if (!room || room.creator_socket_id !== socket.id) return;

    const players = dbFns.getPlayers(roomCode);
    const shuffledPlayers = [...players].sort(() => Math.random() - 0.5);

    shuffledPlayers.forEach((player, index) => {
      const role = index === 0 ? "Wolf" : "Villager";
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

    if (runtimeRooms[roomCode]?.actionTimeout) {
      clearTimeout(runtimeRooms[roomCode].actionTimeout);
      runtimeRooms[roomCode].actionTimeout = null;
    }

    processNextNightAction(roomCode);
  });
});