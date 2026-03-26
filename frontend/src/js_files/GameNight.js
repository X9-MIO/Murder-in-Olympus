import { showPage } from './ui.js';
import { typeWriterEffect } from './GameUtils.js';

export function setupGameNight(socket, gameState) {
    let nightCountdownInterval = null;

    socket.on('night-phase-started', (data) => {
        showPage('nightpage'); 
        const nightMsg = document.getElementById('night-message-text');
        if (nightMsg) typeWriterEffect(nightMsg, data.message, 40);        
        const actionContainer = document.getElementById('night-action-container');
        const waitingText = document.getElementById('night-waiting-text');
        if(actionContainer) actionContainer.classList.add('hidden');
        if(waitingText) waitingText.classList.remove('hidden');
    });

    socket.on('night-action-required', (data) => {
        const nightMsg = document.getElementById('night-message-text');
        if (nightMsg) typeWriterEffect(nightMsg, data.message, 40);        
        
        const actionContainer = document.getElementById('night-action-container');
        const waitingText = document.getElementById('night-waiting-text');
        const nightTimer = document.getElementById('night-timer');
        
        if(actionContainer) actionContainer.classList.remove('hidden');
        if(waitingText) waitingText.classList.add('hidden');
        if(nightTimer) nightTimer.classList.remove('hidden');
        
        actionContainer.innerHTML = '';
        data.targets.forEach(targetName => {
            const btn = document.createElement('button');
            btn.className = 'night-target-btn';
            btn.textContent = targetName;
            btn.style.cssText = "display: block; width: 100%; margin: 10px 0; padding: 15px; font-size: 1.2rem; background: var(--bg); border: 2px solid var(--accent); color: var(--text); border-radius: 8px; cursor: pointer; transition: 0.3s;";
            
            btn.onclick = () => {
                document.querySelectorAll('.night-target-btn').forEach(b => b.disabled = true);
                btn.textContent = "Revealing...";
                
                socket.emit('submit-night-action', gameState.currentRoom, {
                    type: data.type, target: targetName
                });
                
                if (data.type !== 'seer-inspect' && data.type !== 'little-girl-peek') {
                    btn.textContent = "Action Submitted!";
                    btn.style.background = "var(--accent)";
                    btn.style.color = "#fff";
                }
            };
            actionContainer.appendChild(btn);
        });
        
        let timeLeft = data.duration;
        if (nightTimer) nightTimer.textContent = `${timeLeft}s`;
        
        if (nightCountdownInterval) clearInterval(nightCountdownInterval);
        nightCountdownInterval = setInterval(() => {
            timeLeft--;
            if (nightTimer) nightTimer.textContent = `${timeLeft}s`;
            if (timeLeft <= 0) {
                clearInterval(nightCountdownInterval);
                if(actionContainer) actionContainer.classList.add('hidden');
                if(nightTimer) nightTimer.classList.add('hidden');
                if(waitingText) {
                    waitingText.textContent = "Time's up! Waiting for sunrise...";
                    waitingText.classList.remove('hidden');
                }
            }
        }, 1000);
    });
}