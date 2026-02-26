

const io = require("socket.io")(3000, {
  cors: {
    origin: "*", // This allows literally ANY device or URL to connect
    methods: ["GET", "POST"] // Explicitly allows the connection types Socket.io uses
  },
});

console.log("Socket.IO server running on port 3000");

io.on("connection", (socket) => {
  console.log("✅ Client connected:", socket.id);

  // Listen for messages from THIS client
  socket.on("send-message", (message) => {
    console.log("Message received:", message);

    // Send to everyone EXCEPT sender
    socket.broadcast.emit("receive-message", message);

    // If you want to send to everyone INCLUDING sender, use:
    // io.emit("receive-message", message);
  });
});