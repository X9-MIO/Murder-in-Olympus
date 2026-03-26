import { showPage } from './ui.js';
import { typeWriterEffect } from './GameUtils.js';

export function setupGameOver(socket, gameState) {
    let gameOverCountdownInterval = null;

    socket.on('game-over', (data) => {
        showPage('gameoverpage');
        const title = document.getElementById('game-over-title');
        const msg = document.getElementById('game-over-message');
        
        if (title) {
            title.textContent = data.winner === 'Werewolf' ? 'WEREWOLF WINS!' : 'VILLAGERS WIN!';
            title.style.color = data.winner === 'Werewolf' ? '#ef4444' : '#22c55e';
            title.parentElement.style.border = `3px solid ${data.winner === 'Werewolf' ? '#ef4444' : '#22c55e'}`;
        }
        if (msg) typeWriterEffect(msg, data.message, 45); 

        let timeLeft = 20;
        let timerDisplay = document.getElementById('game-over-timer-display');
        if (!timerDisplay) {
            timerDisplay = document.createElement('p');
            timerDisplay.id = 'game-over-timer-display';
            timerDisplay.style.color = 'var(--muted)';
            timerDisplay.style.marginTop = '15px';
            const backToLobbyBtn = document.getElementById('backToLobbyBtn');
            if (backToLobbyBtn) {
                backToLobbyBtn.parentElement.parentNode.insertBefore(timerDisplay, backToLobbyBtn.parentElement);
            }
        }
        
        timerDisplay.textContent = `Auto-returning to Home in ${timeLeft}s...`;
        if (gameOverCountdownInterval) clearInterval(gameOverCountdownInterval);
        
        gameOverCountdownInterval = setInterval(() => {
            timeLeft--;
            if (timerDisplay) timerDisplay.textContent = `Auto-returning to Home in ${timeLeft}s...`;
            if (timeLeft <= 0) {
                clearInterval(gameOverCountdownInterval);
                window.location.reload(); 
            }
        }, 1000);
    });

    const backToLobbyBtn = document.getElementById('backToLobbyBtn');
    if (backToLobbyBtn) {
        backToLobbyBtn.onclick = () => {
            if (gameOverCountdownInterval) clearInterval(gameOverCountdownInterval); 
            socket.emit('play-again', gameState.currentRoom); 
        };
    }

    socket.on('play-again-failed', (errorMessage) => {
        alert(errorMessage);
        window.location.reload();
    });

    const gameOverHomeBtn = document.getElementById('gameOverHomeBtn');
    if (gameOverHomeBtn) {
        gameOverHomeBtn.onclick = () => {
            if (gameOverCountdownInterval) clearInterval(gameOverCountdownInterval);
            window.location.reload(); 
        };
    }

    socket.on('room-reset', () => {
        showPage('lobby');
        const mainChatBox = document.querySelector(".chat-box");
        if (mainChatBox) mainChatBox.innerHTML = "";
        const gameChatBox = document.getElementById("gameChatBox");
        if (gameChatBox) gameChatBox.innerHTML = "";

        gameState.isEliminated = false;
        gameState.hasVoted = false;
        if (gameState.eliminatedPlayers) gameState.eliminatedPlayers.clear();

        const gameChatInput = document.getElementById('gameChatInput'); 
        const gameSendBtn = document.getElementById('gameSendBtn');
        const openVoteMenuBtn = document.getElementById('openVoteMenuBtn');

        if(gameChatInput) gameChatInput.disabled = false;
        if(gameSendBtn) gameSendBtn.disabled = false;
        
        const chatInputContainer = document.getElementById('game-chat');
        if(chatInputContainer) chatInputContainer.style.display = ''; 
        if(openVoteMenuBtn) openVoteMenuBtn.classList.remove('hidden');
    });

    socket.on('host-disconnected', () => {
        alert("The Host has left the game. The room has been closed.");
        window.location.reload(); 
    });
}