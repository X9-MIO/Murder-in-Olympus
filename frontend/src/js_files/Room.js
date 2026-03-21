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

  document.getElementById("join-back-home-btn").addEventListener('click', () => {
    showPage("homepage");
    hideError("join-error");
  });

  document.getElementById("create-back-home-btn").addEventListener('click', () => {
    showPage("homepage");
    hideError("create-error");
  });

  // --- Create Room ---
  document.getElementById("createroombtn").addEventListener('click', () => {
    const creatorName = document.getElementById("create-displayname").value.trim();
    const numberOfPlayers = Number(document.getElementById("playercount").value);
    
    const rolesConfig = {
      wolves: Number(document.getElementById("role-wolf").value),
      seers: Number(document.getElementById("role-seer").value),
      healers: Number(document.getElementById("role-healer").value),
      littleGirls: Number(document.getElementById("role-little-girl").value)
    };
    
    // Calculate total special roles
    const totalSpecialRoles = rolesConfig.wolves + rolesConfig.seers + rolesConfig.healers + rolesConfig.littleGirls;
    
    if(creatorName === "") {
      displayError("create-error", "Fields cannot be empty");
      return;
    }
    
    if(totalSpecialRoles > numberOfPlayers) {
      displayError("create-error", "Total roles cannot exceed number of players");
      return;
    }

    gameState.currentDisplayName = creatorName;
    
    socket.emit('create-room', numberOfPlayers, creatorName, rolesConfig);
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

        socket.emit('join-room', roomCode, displayName);
      } else if (status === 'full') {
        displayError("join-error", "This room is currently full.");
      } else {
        displayError("join-error", "Room does not exist.");
      }
    });
  });

  socket.on('join-room-success', (roomCode) => {
    document.getElementById("room-code-display").textContent = roomCode;
    showPage("lobby");
    document.getElementById("startgamebtn").classList.add("hidden");
    hideError("join-error");
  });

  socket.on('name-taken', () => {
    displayError("join-error", "That display name is already in this room. Choose a different name.");
    showPage("joinpage");
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