import { io } from "socket.io-client";

const socket = io("http://localhost:3000");
const message = document.getElementById("message");

console.log("Script loaded");

socket.on("connect", () => {
  console.log("Connected with id:", socket.id);
});

socket.on("connect_error", (err) => {
  console.error("Connection error:", err.message);
});

socket.on("disconnect", (reason) => {
  console.log("Disconnected:", reason);
});

function sendMessage(message) {
  socket.emit("send-message", message)
}

