const dbFns = require("./databaseFunction");
const { socketToUser } = require("./serverState");

// Handles room chat messages (alive players only).
function setupChatEvents(io, socket) {
  socket.on("send-message", (roomCode, message) => {
    const user = socketToUser[socket.id];
    if (!user) return;

    const player = dbFns.getPlayerBySocket(socket.id);
    if (!player || player.eliminated) return;

    dbFns.saveMessage(roomCode, socket.id, user.displayName, message);
    socket.to(roomCode).emit("receive-message", message);
  });
}

module.exports = { setupChatEvents };