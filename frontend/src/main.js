import { io } from "socket.io-client";
import './styles.css';

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

function showPage(pageId) {
  document.querySelectorAll(".page").forEach(page => {
    page.classList.add("hidden");
  });

  document.getElementById(pageId).classList.remove("hidden");
}

const button = document.getElementById("joinbtn");

button.addEventListener('click', () => {
  const roomCode = document.getElementById("roomcode").value;
  const displayName = document.getElementById("displayname").value;

  showPage("lobby");

  socket.emit('join-room', roomCode, displayName);
});

const chatBox = document.querySelector(".chat-box");
const chatInput = document.getElementById("chatInput");
const sendBtn = document.getElementById("sendBtn");

function displayMessage(messageText) {
  if (!messageText.trim()) return; // prevent empty messages

  // Create message container
  const messageDiv = document.createElement("div");
  messageDiv.classList.add("chat-message");

  messageDiv.textContent = messageText;

  // Add to chat box
  chatBox.appendChild(messageDiv);

  // Auto scroll to bottom
  chatBox.scrollTop = chatBox.scrollHeight;
}

// When clicking Send
sendBtn.addEventListener("click", () => {
  socket.emit("send-message", chatInput.value);
  displayMessage(chatInput.value);
  chatInput.value = "";
});

// Allow pressing Enter
chatInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    socket.emit("send-message", chatInput.value);
    displayMessage(chatInput.value);
    chatInput.value = "";
  }
});

// Listen for messages
socket.on("receive-message", (message) => {
  displayMessage(message);
});

const createRoomLink = document.getElementById("createroomlink");

createRoomLink.addEventListener('click', (e) => {
  e.preventDefault();

  showPage("createroompage");
});

const joinRoomLink = document.getElementById("joinroomlink")

joinRoomLink.addEventListener('click', (e) => {
  e.preventDefault();

  showPage("joinpage")
});

const createRoomButton = document.getElementById("createroombtn");

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
  let code;
  do {
    code = generateRoomCode(6);
  } while (code in existingRooms);
  return code;
}

createRoomButton.addEventListener('click', () => {
  const roomName = document.getElementById("roomname");
  const numberOfPlayers = document.getElementById("playercount").value;

  socket.emit('getRooms');
  socket.once('roomData', (rooms) => {
    const code = createUniqueRoom(rooms)
    socket.emit("created-room", roomName, numberOfPlayers, code);
  });
  
  showPage("lobby")
});
