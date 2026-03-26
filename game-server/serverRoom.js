const dbFns = require("./databaseFunction");
const { socketToUser, runtimeRooms, createUniqueRoomCode, createRuntimeRoom } = require("./serverState");

// Room/lobby-only events (create, join, kick, and play-again reset).
function setupRoomEvents(io, socket) {
  // Host creates a room and becomes first player.
  socket.on("create-room", (numberOfPlayer, creatorname, roleConfig = null) => {
    // Server-side guard: never trust client-side role validation.
    const wolves = Number(roleConfig?.wolves || 0);
    const maxWolvesAllowed = Number(numberOfPlayer) >= 12 ? 2 : 1;
    if (wolves < 1 || wolves > maxWolvesAllowed) {
      socket.emit(
        "create-room-failed",
        maxWolvesAllowed === 1
          ? "For games under 12 players, you must have exactly 1 Wolf."
          : "For 12+ players, you may have 1 or 2 Wolves."
      );
      return;
    }

    const code = createUniqueRoomCode();
    dbFns.createRoom(code, numberOfPlayer, socket.id, roleConfig);
    dbFns.addPlayer(code, socket.id, creatorname, 1);

    socketToUser[socket.id] = { roomCode: code, displayName: creatorname };
    createRuntimeRoom(code);
    runtimeRooms[code].roleConfig = roleConfig; 

    socket.join(code);
    socket.emit("room-created", code);

    const players = dbFns.getPlayers(code).map((p) => ({
      display_name: p.display_name,
      socket_id: p.socket_id
    }));
    io.to(code).emit("update-players", players);
  });

  // Lightweight availability check before join request.
  socket.on("check-if-room-exists", (roomCode, requestedName) => {
    const room = dbFns.getRoom(roomCode);
    if (!room) return socket.emit("RoomCheck", "not-found");
    if (room.game_phase !== "lobby") return socket.emit("RoomCheck", "started");
    
    const players = dbFns.getPlayers(roomCode);
    if (players.length >= room.number_of_players) return socket.emit("RoomCheck", "full");

    if (requestedName) {
      const nameTaken = players.some((p) => p.display_name.toLowerCase() === requestedName.toLowerCase());
      if (nameTaken) return socket.emit("RoomCheck", "name-taken");
    }
    socket.emit("RoomCheck", "exists");
  });

  // Join an existing lobby room (never mid-game).
  socket.on("join-room", (roomCode, displayName) => {
    const room = dbFns.getRoom(roomCode);
    if (!room || room.game_phase !== "lobby") return;

    const players = dbFns.getPlayers(roomCode);
    if (players.length >= room.number_of_players) return socket.emit("room-full", roomCode);

    const normalizedRequestedName = String(displayName || "").trim().toLowerCase();
    const nameAlreadyExists = players.some((p) => String(p.display_name || "").trim().toLowerCase() === normalizedRequestedName);
    if (nameAlreadyExists) return socket.emit("name-taken", roomCode);

    socket.join(roomCode);
    dbFns.addPlayer(roomCode, socket.id, displayName, 0);
    socketToUser[socket.id] = { roomCode, displayName };
    socket.emit("join-room-success", roomCode);

    const updatedPlayers = dbFns.getPlayers(roomCode).map((p) => ({
      display_name: p.display_name,
      socket_id: p.socket_id
    }));
    io.to(roomCode).emit("update-players", updatedPlayers);
  });

  // Host can remove players while room is still in lobby phase.
  socket.on("kick-player", (roomCode, targetSocketId) => {
    const room = dbFns.getRoom(roomCode);
    
    if (room && room.creator_socket_id === socket.id && room.game_phase === 'lobby') {
      const targetSocket = io.sockets.sockets.get(targetSocketId);
      
      if (targetSocket) {
        targetSocket.emit("you-were-kicked"); 
        targetSocket.leave(roomCode); 
        dbFns.removePlayer(targetSocketId); 
        
        // Update everyone's list
        const players = dbFns.getPlayers(roomCode).map(p => ({
            display_name: p.display_name,
            socket_id: p.socket_id
        }));
        io.to(roomCode).emit("update-players", players);
      }
    }
  });

  // Reset match state after game over and return all players to lobby state.
  socket.on("play-again", (roomCode) => {
    const room = dbFns.getRoom(roomCode);
    if (!room) return;

    if (room.game_phase !== "game_over" && room.game_phase !== "lobby") {
      socket.emit("play-again-failed", "The game already started without you.");
      return; 
    }

    if (room.game_phase === "game_over") {
      dbFns.resetRoomForNewGame(roomCode);
    }

    io.to(roomCode).emit("room-reset");
    const players = dbFns.getPlayers(roomCode).map((p) => ({
      display_name: p.display_name,
      socket_id: p.socket_id
    }));
    io.to(roomCode).emit("update-players", players);
  });
}

module.exports = { setupRoomEvents };