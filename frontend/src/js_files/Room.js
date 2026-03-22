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
    
    // Using || 0 ensures blank boxes don't break the math!
    const rolesConfig = {
      wolves: Number(document.getElementById("role-wolf").value) || 0,
      seers: Number(document.getElementById("role-seer").value) || 0,
      healers: Number(document.getElementById("role-healer").value) || 0,
      littleGirls: Number(document.getElementById("role-little-girl").value) || 0,
      artemis: Number(document.getElementById("role-artemis").value) || 0
    };
    
    const totalSpecialRoles = rolesConfig.wolves + rolesConfig.seers + rolesConfig.healers + rolesConfig.littleGirls + rolesConfig.artemis;
    
    if(creatorName === "") {
      displayError("create-error", "Fields cannot be empty");
      return;
    }

    // --- STRICT ROLE LIMITS ---
    
    if (rolesConfig.wolves !== 1) {
      displayError("create-error", "You must have exactly 1 Wolf!");
      return;
    }
    
    if (rolesConfig.littleGirls > 1) {
      displayError("create-error", "You can only have a maximum of 1 Little Girl.");
      return;
    }
    
    // Check if they selected more special roles than total players
    if(totalSpecialRoles > numberOfPlayers) {
      displayError("create-error", `You selected ${totalSpecialRoles} roles for a ${numberOfPlayers} player game!`);
      return;
    }

    gameState.currentDisplayName = creatorName;
    
    socket.emit('create-room', numberOfPlayers, creatorName, rolesConfig);
  });

  // --- Join Room ---

  socket.on('room-created', (newRoomCode) => {
    document.getElementById("room-code-display").textContent = newRoomCode;
    gameState.currentRoom = newRoomCode;
    
    showPage("lobby");
    document.getElementById("startgamebtn").classList.remove("hidden");
  });

  document.getElementById("joinbtn").addEventListener('click', () => {
    const roomCode = document.getElementById("roomcode").value.trim();
    const displayName = document.getElementById("displayname").value.trim();

    if(roomCode === "" || displayName === "") {
      displayError("join-error", "Fields cannot be empty");
      return;
    }

    // Pass the displayName to the server so it can check it!
    socket.emit('check-if-room-exists', roomCode, displayName);
    
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
      } else if (status === 'name-taken') { // <--- NEW ERROR CHECK
        displayError("join-error", "That name is already taken! Choose a different one.");
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