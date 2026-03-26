import { showPage } from './ui.js';
import { typeWriterEffect } from './GameUtils.js';

// Handles pre-game intro animation and role-card reveal sequence.
export function setupGameStart(socket, gameState) {
    // Host-only Start Game button.
    const startGameBtn = document.getElementById("startgamebtn");
    if (startGameBtn) {
        startGameBtn.addEventListener('click', () => {
            socket.emit('start-game', gameState.currentRoom);
        });
    }

    const toggleRoleBtn = document.getElementById('toggleRoleBtn');
    const discussionRoleCard = document.getElementById('discussionRoleCard');
    if (toggleRoleBtn && discussionRoleCard) {
        toggleRoleBtn.addEventListener('click', () => {
            discussionRoleCard.classList.toggle('flipped');
            if (discussionRoleCard.classList.contains('flipped')) {
                toggleRoleBtn.textContent = 'Hide Role';
            } else {
                toggleRoleBtn.textContent = 'Show Role';
            }
        });
    }

    // Server broadcast indicating role assignment is complete and intro should begin.
    socket.on('game-starting', () => {
        showPage("gamepage"); 

        const gameChatBox = document.getElementById("gameChatBox");
        if (gameChatBox) gameChatBox.innerHTML = "";
        
        const introScreen = document.querySelector(".intro-screen");
        const introMain = document.querySelector(".intro-main");
        const introSub = document.querySelector(".intro-sub");
        const gameContent = document.getElementById("actualGameContent");

        if (introScreen) introScreen.classList.remove("hidden");
        if (gameContent) gameContent.classList.add("hidden");

        // Re-trigger CSS animations every round (including play-again).
        if (introMain) {
            introMain.classList.remove("typewriter");
            introMain.style.width = "0";
            void introMain.offsetWidth; 
            introMain.classList.add("typewriter");
        }

        if (introSub) {
            introSub.classList.remove("fade-in");
            introSub.style.opacity = "0";
            void introSub.offsetWidth; 
            introSub.classList.add("fade-in");
        }

        const rolePrefix = document.getElementById("role-prefix-text");
        const cardRoleText = document.getElementById("card-role-text");
        const roleCard = document.getElementById("roleCard"); 
        const revealStatusText = document.getElementById("reveal-status-text"); 

        if (roleCard) roleCard.classList.remove("flipped");
        if (cardRoleText) cardRoleText.style.opacity = "0";
        if (revealStatusText) revealStatusText.textContent = "";
        if (rolePrefix) rolePrefix.textContent = ""; 

        setTimeout(() => {
            if(introScreen) introScreen.classList.add("hidden");
            if(gameContent) gameContent.classList.remove("hidden");

            if (rolePrefix) typeWriterEffect(rolePrefix, "You are...", 60);

            let timeLeft = 5;
            const countdownInterval = setInterval(() => {
                timeLeft--;
                if (revealStatusText && timeLeft > 0) {
                    revealStatusText.textContent = `Revealing role in ${timeLeft} seconds...`;
                }
            }, 1000);

            setTimeout(() => {
                clearInterval(countdownInterval); 
                if (roleCard) roleCard.classList.add("flipped");
                if (cardRoleText) cardRoleText.style.opacity = "1";
                if (rolePrefix) typeWriterEffect(rolePrefix, "You are the", 40);
                if (revealStatusText) typeWriterEffect(revealStatusText, "Your role is revealed! Moving to discussion...", 30);
            }, 5000); 

        }, 6000); 
    });
}