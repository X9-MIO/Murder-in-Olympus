console.log("server.js started");

const io = require("socket.io")(3000, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

const dbFns = require("./databaseFunction");
const { socketToUser, clearRuntimeRoom } = require("./serverState");

const { setupRoomEvents } = require("./serverRoom");
const { setupChatEvents } = require("./serverChat");
const { setupGameEvents } = require("./serverGame");

console.log("Socket.IO server running on port 3000");

io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

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
        const updatedPlayers = dbFns.getPlayers(roomCode).map((p) => ({display_name: p.display_name,socket_id: p.socket_id}));
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

  setupRoomEvents(io, socket);
  setupChatEvents(io, socket);
  setupGameEvents(io, socket);
});