console.log("server.js started");

// Socket.IO entrypoint for real-time game events.
// The frontend connects to this port directly.
const io = require("socket.io")(3000, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

// DB helpers and in-memory room runtime cleanup.
const dbFns = require("./databaseFunction");
const { socketToUser, clearRuntimeRoom } = require("./serverState");

// Feature-specific event handlers.
const { setupRoomEvents } = require("./serverRoom");
const { setupChatEvents } = require("./serverChat");
const { setupGameEvents } = require("./serverGame");

console.log("Socket.IO server running on port 3000");

io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);

    // Resolve room/user context for this socket.
    const user = socketToUser[socket.id];
    if (!user) return;

    const { roomCode, displayName } = user;
    const room = dbFns.getRoom(roomCode);

    if (room) {
      // If host leaves, close the entire room and clear pending timers/state.
      if (room.creator_socket_id === socket.id) {
        io.to(roomCode).emit("host-disconnected");
        dbFns.deleteRoom(roomCode);
        clearRuntimeRoom(roomCode);
        console.log(`Room ${roomCode} deleted because the host left.`);
      } else {
        // Normal player disconnect: remove player and refresh the player list.
        dbFns.removePlayer(socket.id);
        const updatedPlayers = dbFns.getPlayers(roomCode).map((p) => ({display_name: p.display_name,socket_id: p.socket_id}));
        io.to(roomCode).emit("update-players", updatedPlayers);

        // If that was the last player, remove room and clear runtime state.
        if (dbFns.getPlayers(roomCode).length === 0) {
          dbFns.deleteRoom(roomCode);
          clearRuntimeRoom(roomCode);
          console.log(`Room ${roomCode} deleted because it is empty.`);
        } else {
          console.log(`${displayName} removed from room ${roomCode}.`);
        }
      }
    }

    // Always remove socket->user mapping to avoid stale references.
    delete socketToUser[socket.id];
  });

  // Register room/chat/game feature events for this client.
  setupRoomEvents(io, socket);
  setupChatEvents(io, socket);
  setupGameEvents(io, socket);
});