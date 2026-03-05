// game.js
import { showPage } from './ui.js';

export function setupGameLogic(socket, gameState) {
  
    // Host clicks "Start Game"
    document.getElementById("startgamebtn").addEventListener('click', () => {
        socket.emit('start-game', gameState.currentRoom);
    });

    // Listen for the server telling us our secret role
    socket.on('receive-role', (role) => {
        gameState.myRole = role; 
        
        const cardRoleText = document.getElementById("card-role-text");
        if (cardRoleText) {
            cardRoleText.textContent = gameState.myRole;
            cardRoleText.style.color = gameState.myRole === "Wolf" ? "#ef4444" : "var(--accent)"; 
        }

        const roleImage = document.getElementById("role-image");
        const messagingRoleImage = document.getElementById("messaging-role-image");
        
        const imagePath = gameState.myRole === "Wolf" ? "/public/wolf.png" : "/public/villager.png";

        if (roleImage) roleImage.src = imagePath; 
        if (messagingRoleImage) messagingRoleImage.src = imagePath;
    });

    // Listen for the server telling EVERYONE in the room to start
    socket.on('game-starting', () => {
        showPage("gamepage"); 
        
        const roleCard = document.getElementById("roleCard");
        const roleTextContainer = document.getElementById("role-text-container");
        const revealStatusText = document.getElementById("reveal-status-text");

        if (roleCard) roleCard.classList.remove("flipped");
        if (roleTextContainer) roleTextContainer.classList.add("hidden");
        if (revealStatusText) revealStatusText.textContent = "Revealing role in 5 seconds...";

        // Timer 1: Wait 6s for animation
        setTimeout(() => {
            const introScreen = document.querySelector(".intro-screen");
            if(introScreen) introScreen.classList.add("hidden");
            
            const gameContent = document.getElementById("actualGameContent");
            if(gameContent) gameContent.classList.remove("hidden");

            let timeLeft = 5;
            const countdownInterval = setInterval(() => {
                timeLeft--;
                if (revealStatusText && timeLeft > 0) revealStatusText.textContent = `Revealing role in ${timeLeft} seconds...`;
            }, 1000);

            // Timer 2: Wait 5s, flip card
            setTimeout(() => {
                clearInterval(countdownInterval); 
                if (roleCard) roleCard.classList.add("flipped");
                if (roleTextContainer) roleTextContainer.classList.remove("hidden");
                if (revealStatusText) revealStatusText.textContent = "Your role is revealed! Moving to discussion...";

                // Timer 3: Wait 5s, transition to Discussion Phase
                setTimeout(() => {
                    showPage("gamemessagingpage");
                }, 5000);

            }, 5000); 

        }, 6000); 
    });

    // ==========================================
    // DISCUSSION PHASE CHAT LOGIC
    // ==========================================
    const gameChatInput = document.getElementById('gameChatInput'); 
    const gameSendBtn = document.getElementById('gameSendBtn');
    const gameChatBox = document.getElementById('gameChatBox');
    
    function appendToGameChat(messageText) {
        if (!gameChatBox || !messageText.trim()) return;
        const msgElement = document.createElement('div');
        msgElement.classList.add("chat-message");
        msgElement.textContent = messageText;
        gameChatBox.appendChild(msgElement);
        gameChatBox.scrollTop = gameChatBox.scrollHeight;
    }

    function sendGameMessage() {
        const text = gameChatInput.value.trim();
        if (text && gameState.currentRoom) {
            const fullMessage = gameState.currentDisplayName + ": " + text;
            
            // Reuses your existing server backend logic!
            socket.emit('send-message', gameState.currentRoom, fullMessage);
            
            appendToGameChat("You: " + text);
            gameChatInput.value = '';
        }
    }

    if (gameSendBtn) gameSendBtn.addEventListener('click', sendGameMessage);
    if (gameChatInput) {
        gameChatInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') sendGameMessage();
        });
    }

    // Since chat.js also listens to "receive-message", we add a listener here just for the game phase UI
    socket.on('receive-message', (message) => {
        appendToGameChat(message);
    });
}