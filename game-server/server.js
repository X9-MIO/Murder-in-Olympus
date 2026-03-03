const io = require("socket.io")(3000, {
  cors: {
    origin: "http://localhost:5173",
  },
});

const rooms = {};

console.log("Socket.IO server running on port 3000");

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

io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });

  socket.on('join-room', (roomCode, displayName) => {
    socket.join(roomCode);
    console.log(displayName + " joined room: " + roomCode)
    console.log(socket.rooms);
  });

  socket.on('send-message', (message) => {
    socket.broadcast.emit("receive-message", message);
  });

  socket.on('create-room', (roomName, numberOfPlayers) => {
    code = createUniqueRoom(rooms);

    rooms[code] = {
      roomName,
      numberOfPlayers
    };

    console.log(rooms);
  });

  socket.on('check-if-room-exists', (roomCode) => {
    if (roomCode in rooms) {
      socket.emit('RoomCheck', true);
    }
    else {
      socket.emit('RoomCheck', false)
    }
  });

});

