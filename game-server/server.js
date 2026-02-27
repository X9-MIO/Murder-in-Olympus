const io = require("socket.io")(3000, {
  cors: {
    origin: "http://localhost:5173",
  },
});

const rooms = {};

console.log("Socket.IO server running on port 3000");

io.on("connection", (socket) => {
  console.log("✅ Client connected:", socket.id);

  socket.on('join-room', (roomCode, displayName) => {
    socket.join(roomCode);
    console.log(displayName + " joined room: " + roomCode)
    console.log(socket.rooms);
  });

  socket.on('send-message', (message) => {
    socket.broadcast.emit("receive-message", message);
  });

  socket.on('getRooms', () => {
    socket.emit('roomData', rooms);
  });

  socket.on('created-room', (roomName, numberOfPlayers, code) => {
    rooms[code] = {
      roomName,
      numberOfPlayers,
      code
    };

    console.log(rooms);
  });
});

io.on("disconnection", (socket) => {
  console.log("Client disconnected: " + socket.id)
});

