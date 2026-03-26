import { appendToGameChat } from './GameUtils.js';

export function setupGameChatLogic(socket, gameState) {
    const gameChatInput = document.getElementById('gameChatInput'); 
    const gameSendBtn = document.getElementById('gameSendBtn');
    const gameChatBox = document.getElementById('gameChatBox');

    const olympianColors = [
        "#ffd700", 
        "#f87171", 
        "#60a5fa", 
        "#c084fc", 
        "#4ade80", 
        "#fbbf24", 
        "#2dd4bf", 
        "#f472b6", 
        "#94a3b8", 
        "#fb7185", 
        "#818cf8", 
        "#fb923c", 
        "#a7f3d0", 
        "#fca5a5", 
        "#5eead4"  
    ];

    // Deterministic color from player name for readable chat identity.
    function getColorFromName(name) {
        if (name === "You") return "#a855f7";
        let hash = 0;
        for (let i = 0; i < name.length; i++) {
            hash = name.charCodeAt(i) + ((hash << 5) - hash);
        }
        return olympianColors[Math.abs(hash % olympianColors.length)];
    }

    // Formats messages as "name: message" when possible, fallback for system lines.
    function formatGameMessage(messageText) {
        if (!messageText?.trim()) return;
        
        const msgDiv = document.createElement("div");
        msgDiv.className = "chat-message";
        msgDiv.style.marginBottom = "8px";

        const colonIndex = messageText.indexOf(":");
        
        if (colonIndex !== -1) {
            const name = messageText.slice(0, colonIndex).trim();
            const text = messageText.slice(colonIndex + 1);

            const nameSpan = document.createElement("span");
            nameSpan.textContent = name + ": ";
            nameSpan.style.fontWeight = "bold";
            nameSpan.style.color = getColorFromName(name);

            // Make narrator/system speaker labels stand out more.
            if (name.toUpperCase().includes("NARRATOR")) {
                nameSpan.style.fontWeight = "900";
            }
            
            const textSpan = document.createElement("span");
            textSpan.textContent = text;
            textSpan.style.color = "#e8dcc4"; 

            if (name.toUpperCase().includes("NARRATOR")) {
                textSpan.style.fontWeight = "700";
            }

            msgDiv.append(nameSpan, textSpan);
        } else {
            msgDiv.textContent = messageText;
            msgDiv.style.color = "#ffd700"; 
            msgDiv.style.fontFamily = "'Cinzel', serif";
            msgDiv.style.fontSize = "1.1rem";
            msgDiv.style.fontWeight = "800";
            msgDiv.style.textAlign = "center";
            msgDiv.style.padding = "10px";
            msgDiv.style.borderTop = "1px solid rgba(212, 175, 55, 0.2)";
            msgDiv.style.borderBottom = "1px solid rgba(212, 175, 55, 0.2)";
        }

        gameChatBox.appendChild(msgDiv);
        gameChatBox.scrollTop = gameChatBox.scrollHeight;
    }

    // Sends chat message to server and mirrors local "You:" copy instantly.
    function sendGameMessage() {
        const text = gameChatInput.value.trim();
        if (text && gameState.currentRoom) {
            socket.emit('send-message', gameState.currentRoom, `${gameState.currentDisplayName}: ${text}`);
            formatGameMessage(`You: ${text}`);
            gameChatInput.value = '';
        }
    }

    if (gameSendBtn) gameSendBtn.addEventListener('click', sendGameMessage);
    if (gameChatInput) {
        gameChatInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') sendGameMessage();
        });
    }

    socket.on('receive-message', (message) => {
        formatGameMessage(message);
    });
}