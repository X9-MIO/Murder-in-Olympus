import { io } from "socket.io-client";

const socket = io("http://192.168.0.9:3000");
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

function sendMessage(messageText) {
  console.log("Sending:", messageText);
  socket.emit("send-message", messageText);
}


socket.on("receive-message", (message) => {
  console.log("New message:", message);

  const chatBox = document.getElementById("chat-box");

  const p = document.createElement("p");
  p.textContent = message;
  chatBox.appendChild(p);
});

const button = document.getElementById("send");

button.addEventListener("click", () => {
  console.log("Button clicked");
  const text = message.value;

  if (text.trim() !== "") {
    sendMessage(text);

    // show your own message instantly
    const chatBox = document.getElementById("chat-box");
    const p = document.createElement("p");
    p.textContent = "Me: " + text;
    chatBox.appendChild(p);

    message.value = "";
  }
});
