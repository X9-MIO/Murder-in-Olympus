import { showPage } from './ui.js';

export function setupRoomLogic(socket, gameState) {

  // Local error helpers (kept private to this module).
  function displayError(elementId, message) {
      const el = document.getElementById(elementId);
      if (el) {
          el.textContent = message;
          el.classList.remove("hidden");
      }
  }

  function hideError(elementId) {
      const el = document.getElementById(elementId);
      if (el) el.classList.add("hidden");
  }

  // Navigation between home/join/create/help screens.
  document.getElementById("home-join-btn").addEventListener('click', () => showPage("joinpage"));
  document.getElementById("home-create-btn").addEventListener('click', () => showPage("createroompage"));
  document.getElementById("home-help-btn").addEventListener('click', () => showPage("helppage"));
  document.getElementById("help-back-btn").addEventListener('click', () => showPage("homepage"));
  
  document.getElementById("createroomlink").addEventListener('click', (e) => { e.preventDefault(); showPage("createroompage"); });
  document.getElementById("joinroomlink").addEventListener('click', (e) => { e.preventDefault(); showPage("joinpage"); });

  document.getElementById("join-back-home-btn").addEventListener('click', () => { showPage("homepage"); hideError("join-error"); });
  document.getElementById("create-back-home-btn").addEventListener('click', () => { showPage("homepage"); hideError("create-error"); });

  // --- CREATE ROOM LOGIC ---
  document.getElementById("createroombtn").addEventListener('click', () => {
    hideError("create-error");

    const creatorName = document.getElementById("create-displayname").value.trim();
    const numberOfPlayers = Number(document.getElementById("playercount").value);

    const rolesConfig = {
      wolves: Number(document.getElementById("role-wolf").value) || 0,
      seers: Number(document.getElementById("role-seer").value) || 0,
      healers: Number(document.getElementById("role-healer").value) || 0,
      littleGirls: Number(document.getElementById("role-little-girl").value) || 0,
      artemis: Number(document.getElementById("role-artemis").value) || 0
    };
    
    // Balance rule: allow 2 wolves only in large lobbies (12+ players).
    const maxWolvesAllowed = numberOfPlayers >= 12 ? 2 : 1;
    const totalSpecialRoles = rolesConfig.wolves + rolesConfig.seers + rolesConfig.healers + rolesConfig.littleGirls + rolesConfig.artemis;
    
    if (creatorName === "") return displayError("create-error", "Fields cannot be empty");
    if (creatorName.length > 10) return displayError("create-error", "Name must be 10 characters or less");
    if (rolesConfig.wolves < 1 || rolesConfig.wolves > maxWolvesAllowed) {
      return displayError(
        "create-error",
        maxWolvesAllowed === 1
          ? "For games under 12 players, you must have exactly 1 Wolf."
          : "For 12+ players, you may have 1 or 2 Wolves."
      );
    }
    if (rolesConfig.littleGirls > 1) return displayError("create-error", "You can only have a maximum of 1 Little Girl.");
    if (totalSpecialRoles > numberOfPlayers) return displayError("create-error", `You selected ${totalSpecialRoles} roles for a ${numberOfPlayers} player game!`);

    gameState.currentDisplayName = creatorName;
    socket.emit('create-room', numberOfPlayers, creatorName, rolesConfig);
  });

  // --- JOIN ROOM LOGIC ---
  document.getElementById("joinbtn").addEventListener('click', () => {
    hideError("join-error");

    const roomCode = document.getElementById("roomcode").value.trim();
    const displayName = document.getElementById("displayname").value.trim();

    if (roomCode === "" || displayName === "") return displayError("join-error", "Fields cannot be empty");
    if (displayName.length > 10) return displayError("join-error", "Name must be 10 characters or less");

    socket.emit('check-if-room-exists', roomCode, displayName);
    
    socket.once('RoomCheck', (status) => {
      if (status === 'exists') {
        document.getElementById("room-code-display").textContent = roomCode;
        gameState.currentRoom = roomCode;
        gameState.currentDisplayName = displayName;
        gameState.isHost = false; // Ensures joiners don't get host powers
        
        showPage("lobby");
        socket.emit('join-room', roomCode, displayName);
        document.getElementById("startgamebtn").classList.add("hidden");
      } else if (status === 'full') {
        displayError("join-error", "This room is currently full.");
      } else if (status === 'started') {
        displayError("join-error", "This game has already started!");
      } else if (status === 'name-taken') {
        displayError("join-error", "That name is already taken.");
      } else {
        displayError("join-error", "Room does not exist.");
      }
    });
  });

  // --- SOCKET LISTENERS ---
  // Created-room flow (host lands in lobby and can start the game).
  socket.on('room-created', (newRoomCode) => {
    document.getElementById("room-code-display").textContent = newRoomCode;
    gameState.currentRoom = newRoomCode;
    gameState.isHost = true; // Host powers granted!
    showPage("lobby");
    document.getElementById("startgamebtn").classList.remove("hidden");
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

  socket.on('create-room-failed', (errorMessage) => {
    displayError("create-error", errorMessage || "Unable to create room with this role setup.");
    showPage("createroompage");
  });

  // Keep lobby player lists synchronized (lobby + in-game sidebar).
  socket.on('update-players', (playersArray) => {
    ['players-list', 'game-players-list'].forEach(id => {
        const list = document.getElementById(id);
        if (!list) return;
        
        list.innerHTML = "";
        playersArray.forEach(player => {
            const name = typeof player === 'string' ? player : player.display_name;
            const socketId = player.socket_id || null;

            const li = document.createElement("li");
            li.style.display = "flex";
            li.style.justifyContent = "space-between";
            li.style.alignItems = "center";
            
            const nameSpan = document.createElement("span");
            nameSpan.textContent = name;
            
            // Keeps names from breaking the layout
            nameSpan.style.whiteSpace = "nowrap";
            nameSpan.style.overflow = "hidden";
            nameSpan.style.textOverflow = "ellipsis";
            nameSpan.style.maxWidth = "130px";

            // Add a Crown to the Host's name
            if (gameState.isHost && name === gameState.currentDisplayName) {
                nameSpan.textContent = "👑 " + name; // Fixed Crown!
                nameSpan.style.color = "#d4af37";
                nameSpan.style.fontWeight = "bold";
            }

            li.appendChild(nameSpan);
            
            const isMe = name === gameState.currentDisplayName;
            
            // SECURITY CHECK: Only generate kick button if id === 'players-list' (Lobby)
            if (gameState.isHost && !isMe && socketId && id === 'players-list') {
                const kickBtn = document.createElement("button");
                kickBtn.textContent = "KICK";
                kickBtn.style.cssText = `
                    width: auto; 
                    padding: 4px 10px; 
                    background: #8b0000; 
                    font-size: 0.75rem; 
                    border-radius: 6px; 
                    color: white; 
                    cursor: pointer;
                    border: 1px solid #ff4444;
                    font-weight: bold;
                `;
                
                kickBtn.onclick = () => {
                    if (confirm(`Exile ${name} from Olympus?`)) {
                        socket.emit('kick-player', gameState.currentRoom, socketId);
                    }
                };
                li.appendChild(kickBtn);
            }
            list.appendChild(li);
        });
      });
  });

}