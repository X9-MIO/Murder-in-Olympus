const dbFns = require("./databaseFunction");
const { socketToUser, runtimeRooms, createUniqueRoomCode, createRuntimeRoom } = require("./serverState");

function setupRoomEvents(io, socket) {
  socket.on("create-room", (numberOfPlayer, creatorname, roleConfig = null) => {
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

    socket.emit("room-reset");
    const players = dbFns.getPlayers(roomCode).map((p) => ({
      display_name: p.display_name,
      socket_id: p.socket_id
    }));
    io.to(roomCode).emit("update-players", players);
  });
}

module.exports = { setupRoomEvents };