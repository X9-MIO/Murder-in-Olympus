// src/js_files/Chat.js

// Lobby chat only (before game starts).
export function setupChatLogic(socket, gameState) {
    const chatBox = document.querySelector(".chat-box");
    const chatInput = document.getElementById("chatInput");
    const sendBtn = document.getElementById("sendBtn");

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

    // Stable name -> color mapping for readable chat identities.
    function getColorFromName(name) {
        if (name === "You") return "#a855f7"; 
        
        let hash = 0;
        for (let i = 0; i < name.length; i++) {
            hash = name.charCodeAt(i) + ((hash << 5) - hash);
        }
        const index = Math.abs(hash % olympianColors.length);
        return olympianColors[index];
    }

    // Render plain system lines or split "name: text" messages.
    function displayMessage(messageText) {
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
            
            const textSpan = document.createElement("span");
            textSpan.textContent = text;
            textSpan.style.color = "#e8dcc4"; 

            msgDiv.appendChild(nameSpan);
            msgDiv.appendChild(textSpan);
        } else {
            msgDiv.textContent = messageText;
            msgDiv.style.color = "#a89878"; 
            msgDiv.style.fontStyle = "italic"; 
        }

        chatBox.appendChild(msgDiv);
        chatBox.scrollTop = chatBox.scrollHeight;
    }

    // Send and immediately mirror local message as "You:".
    function sendMessage() {
        const text = chatInput.value.trim();
        if(!text) return;
        
        socket.emit("send-message", gameState.currentRoom, `${gameState.currentDisplayName}: ${text}`);
        displayMessage(`You: ${text}`);
        chatInput.value = "";
    }

    sendBtn?.addEventListener("click", sendMessage);
    
    chatInput?.addEventListener("keydown", (e) => {
        if (e.key === "Enter") sendMessage();
    });

    socket.on("receive-message", displayMessage);
}