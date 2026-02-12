const io = require("socket.io")(3000, {
  cors: {
    origin: "http://localhost:5173",
  },
});

console.log("Socket.IO server running on port 3000");

io.on("connection", (socket) => {
  console.log("✅ Client connected:", socket.id);
});

io.on("send-message", (message) => {
  console.log(message);
})
