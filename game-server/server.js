const crypto = require("crypto").webcrypto;
const io = require("socket.io")(3000, {
  cors: {
    origin: "http://localhost:5173",
  },
});

const rooms = {};

const socketToUser = {};

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

  socket.on('join-room', (roomCode, displayName) => {
    if(rooms[roomCode].players.length >= rooms[roomCode].numberOfPlayers) {
      socket.emit('room-full', roomCode);
      return;
    }
    socket.join(roomCode);
    console.log(displayName + " joined room: " + roomCode)
    console.log(socket.rooms);
    if (rooms[roomCode]) {
      rooms[roomCode].players.push(displayName);

      // Remember this socket's info!
      socketToUser[socket.id] = { roomCode: roomCode, displayName: displayName };
      
      // Tell everyone in the room (including the joiner) to update their list
      io.to(roomCode).emit('update-players', rooms[roomCode].players);
    }
  });

  socket.on('send-message', (roomCode,message) => {

    socket.to(roomCode).emit("receive-message", message);
  });

 socket.on('create-room', (roomName, numberOfPlayer,creatorname) => {
  // 1. Generate the code (added 'const' to be safe)
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

  // Host wants to start the game
  socket.on('start-game', (roomCode) => {
      if (rooms[roomCode] && rooms[roomCode].creatorId === socket.id) {
          console.log("Host is starting game in room: " + roomCode);
          
          // 1. Ask Socket.IO for the hidden IDs of everyone currently inside this room
          const playerIds = Array.from(io.sockets.adapter.rooms.get(roomCode) || []);
          
          // 2. Shuffle the players randomly
          const shuffledPlayers = playerIds.sort(() => Math.random() - 0.5);
          
          // 3. Hand out the roles privately
          shuffledPlayers.forEach((playerId, index) => {
              let assignedRole = "Villager"; // Default role
              
              if (index === 0) {
                  assignedRole = "Wolf"; // The first random person gets to be the killer
              }
              // You can add more roles here later! (e.g., if index === 1, role = "Detective")

              // 4. Send this role PRIVATELY to this specific player only!
              io.to(playerId).emit('receive-role', assignedRole);
          });
          
          // 5. Finally, tell the whole room to play the intro animation
          io.to(roomCode).emit('game-starting');
      }
  });

});

