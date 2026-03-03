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

function displayError(errorElement, errorMessage) {
  const display = document.getElementById(errorElement);
  display.textContent = errorMessage;
  display.classList.remove("hidden");
}

function hideError(errorElement) {
  const display = document.getElementById(errorElement);
  display.classList.add("hidden");
}

const joinButton = document.getElementById("joinbtn");

joinButton.addEventListener('click', () => {
  const roomCode = document.getElementById("roomcode").value.trim();
  const displayName = document.getElementById("displayname").value.trim();

  let error = false;

  if(roomCode === "") {
    error = true;
    displayError("join-error", "room code field cannot be empty");
  }
  else {
    hideError("join-error");
  }

  if(displayName === "") {
    error = true;
    displayError("display-name-error", "display name field cannot be empty");
  }
  else {
    hideError("display-name-error");
  }

  if (error) {
    return;
  }

  socket.emit('check-if-room-exists', roomCode)
  socket.once('RoomCheck', (isThere) => {
    if(isThere) {
      showPage("lobby");
      socket.emit('join-room', roomCode, displayName);
    }
    else {
      displayError("join-error", "Room does not exist.");
    }
  });
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

createRoomButton.addEventListener('click', () => {
  const roomName = document.getElementById("roomname").value.trim();
  const numberOfPlayers = Number(document.getElementById("playercount").value);

  let error = false;

  if(roomName === "") {
    error = true;
    displayError("create-error", "Room name cannot be empty");
  }

  if(error){
    return;
  }
  
  socket.emit('create-room', roomName, numberOfPlayers)
  
  showPage("lobby")
});


