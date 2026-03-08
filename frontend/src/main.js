// main.js
import { io } from "socket.io-client";


// Import our feature modules
import { setupRoomLogic } from './Room.js';
import { setupChatLogic } from './Chat.js';
import { setupGameLogic } from './Game.js';

export const socket = io("http://localhost:3000");

// Group state into an object so it can easily be shared and updated across files
export const gameState = {
    currentRoom: "",
    currentDisplayName: "",
    isEliminated: false
};

console.log("Script loaded");

// --- Socket Connection Events ---
socket.on("connect", () => {
  console.log("Connected with id:", socket.id);
});

socket.on("connect_error", (err) => {
  console.error("Connection error:", err.message);
});

socket.on("disconnect", (reason) => {
  console.log("Disconnected:", reason);
});

// --- Initialize Features ---
// We pass the socket and gameState to our other files so they can use them
setupRoomLogic(socket, gameState);
setupChatLogic(socket, gameState);
setupGameLogic(socket, gameState);