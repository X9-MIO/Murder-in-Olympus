import { io } from "socket.io-client";
import { setupRoomLogic } from './Room.js';
import { setupChatLogic } from './Chat.js';
import { setupGameChatLogic } from './GameChat.js';
import { setupRoleLogic } from './GameRoles.js';
import { setupVotingLogic } from './GameVote.js';
import { setupGameStart } from './GameStart.js';
import { setupGameNight } from './GameNight.js';
import { setupGameDay } from './GameDay.js';
import { setupGameOver } from './GameOver.js';


export const socket = io("http://localhost:3000", { transports: ["polling", "websocket"] });

export const gameState = {
    currentRoom: "",
    currentDisplayName: "",
    isEliminated: false
};

socket.on("connect", () => console.log("Connected:", socket.id));
socket.on("connect_error", (err) => console.error("Connection error:", err.message));
socket.on("disconnect", (reason) => console.log("Disconnected:", reason));
socket.on("you-were-kicked", () => {
    alert("You have been kicked from the room by the host.");
    window.location.reload();
});

setupRoomLogic(socket, gameState);
setupChatLogic(socket, gameState);
setupGameChatLogic(socket, gameState);
setupRoleLogic(socket, gameState);
setupVotingLogic(socket, gameState);
setupGameStart(socket, gameState);
setupGameNight(socket, gameState);
setupGameDay(socket, gameState);
setupGameOver(socket, gameState);