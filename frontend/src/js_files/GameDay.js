import { showPage } from './ui.js';
import { typeWriterEffect, appendToGameChat } from './GameUtils.js';

export function setupGameDay(socket, gameState) {
    socket.on('night-actions-revealed', (data) => {
        showPage('daypage'); 
        
        const dayMsg = document.getElementById('day-message-text');
        if (dayMsg) typeWriterEffect(dayMsg, data.message, 45);
        
    
        appendToGameChat(data.message);
        
        if (data.eliminatedPlayers?.length > 0) {
            data.eliminatedPlayers.forEach(deadPlayer => {
                if (deadPlayer === gameState.currentDisplayName) {
                    gameState.isEliminated = true;
                    
                    ['gameChatInput', 'gameSendBtn'].forEach(id => {
                        const el = document.getElementById(id);
                        if (el) el.disabled = true;
                    });
                    
                    const chatContainer = document.getElementById('game-chat');
                    if (chatContainer) chatContainer.style.display = 'none';
                    
                    const voteBtn = document.getElementById('openVoteMenuBtn');
                    if (voteBtn) voteBtn.classList.add('hidden');
                    
                    appendToGameChat(`You were eliminated in the night. You are now a ghost and cannot speak.`);
                }
                
                const playersList = document.getElementById("game-players-list");
                if (playersList) {
                    playersList.querySelectorAll('li').forEach(item => {
                        if (item.textContent.trim() === deadPlayer) item.remove();
                    });
                }
            });
        }
    });
}