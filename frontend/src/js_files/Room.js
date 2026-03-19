// room.js
import { showPage, displayError, hideError } from './ui.js';

export function setupRoomLogic(socket, gameState) {
  
  // --- Navigation Links ---
  document.getElementById("home-join-btn").addEventListener('click', () => {
    showPage("joinpage");
  });

  document.getElementById("home-create-btn").addEventListener('click', () => {
    showPage("createroompage");
  });

  document.getElementById("home-help-btn").addEventListener('click', () => {
    showPage("helppage");
  });

  document.getElementById("help-back-btn").addEventListener('click', () => {
    showPage("homepage");
  });

  document.getElementById("createroomlink").addEventListener('click', (e) => {
    e.preventDefault();
    showPage("createroompage");
  });

  document.getElementById("joinroomlink").addEventListener('click', (e) => {
    e.preventDefault();
    showPage("joinpage");
  });

  // --- Create Room ---
  document.getElementById("createroombtn").addEventListener('click', () => {
    const creatorName = document.getElementById("create-displayname").value.trim();
    const numberOfPlayers = Number(document.getElementById("playercount").value);

    if(creatorName === "") {
      displayError("create-error", "Fields cannot be empty");
      return;
    }

    gameState.currentDisplayName = creatorName;
    
    socket.emit('create-room', numberOfPlayers, creatorName);
  });

  socket.on('room-created', (newRoomCode) => {
    document.getElementById("room-code-display").textContent = newRoomCode;
    gameState.currentRoom = newRoomCode;
    
    showPage("lobby");
    document.getElementById("startgamebtn").classList.remove("hidden");
  });

  // --- Join Room ---
  document.getElementById("joinbtn").addEventListener('click', () => {
    const roomCode = document.getElementById("roomcode").value.trim();
    const displayName = document.getElementById("displayname").value.trim();

    if(roomCode === "" || displayName === "") {
      displayError("join-error", "Fields cannot be empty");
      return;
    }

    socket.emit('check-if-room-exists', roomCode);
    
    socket.once('RoomCheck', (status) => {
      if (status === 'exists') {
        document.getElementById("room-code-display").textContent = roomCode;
        gameState.currentRoom = roomCode;
        gameState.currentDisplayName = displayName;
        
        showPage("lobby");
        socket.emit('join-room', roomCode, displayName);
        document.getElementById("startgamebtn").classList.add("hidden");
      } else if (status === 'full') {
        displayError("join-error", "This room is currently full.");
      } else {
        displayError("join-error", "Room does not exist.");
      }
    });
  });

  

  // --- Lobby Updates ---
  socket.on('update-players', (playersArray) => {
    // 1. Update the Lobby list
    const playersList = document.getElementById("players-list");
    if (playersList) {
      playersList.innerHTML = ""; 
      playersArray.forEach(playerName => {
        const li = document.createElement("li");
        li.textContent = playerName;
        playersList.appendChild(li);
      });
    }

    
    const gamePlayersList = document.getElementById("game-players-list");
    if (gamePlayersList) {
        gamePlayersList.innerHTML = "";
        playersArray.forEach(playerName => {
            const li = document.createElement("li");
            li.textContent = playerName;
            gamePlayersList.appendChild(li);
        });
    }
  });
}