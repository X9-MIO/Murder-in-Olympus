import { showPage } from './ui.js';
import { appendToGameChat } from './GameUtils.js';

export function setupVotingLogic(socket, gameState) {
    let discussionCountdownInterval = null;

    const openVoteMenuBtn = document.getElementById('openVoteMenuBtn');
    const closeVoteMenuBtn = document.getElementById('closeVoteMenuBtn');
    const votingOverlay = document.getElementById('votingOverlay');

    if (openVoteMenuBtn) openVoteMenuBtn.onclick = () => votingOverlay.classList.remove('hidden');
    if (closeVoteMenuBtn) closeVoteMenuBtn.onclick = () => votingOverlay.classList.add('hidden');

    socket.on('discussion-phase-started', data => {
        showPage('gamemessagingpage');
        
        let timeLeft = data.duration;
        const timerElement = document.getElementById('discussionTimer');
        
        if (discussionCountdownInterval) clearInterval(discussionCountdownInterval);
        
        discussionCountdownInterval = setInterval(() => {
            timeLeft--;
            if (timerElement) timerElement.textContent = `Discussion Ends In: ${timeLeft}s`;
            if (timeLeft <= 0) clearInterval(discussionCountdownInterval);
        }, 1000);

        setupVotingMenu(data.players);
    });

    function setupVotingMenu(players) {
        const container = document.getElementById('voting-buttons-container');
        if (!container) return;
        
        container.innerHTML = ''; 
        gameState.hasVoted = false;

        if (gameState.isEliminated) {
            if(openVoteMenuBtn) openVoteMenuBtn.disabled = true;
            return;
        }
        
        if (openVoteMenuBtn) openVoteMenuBtn.disabled = false;

        const createVoteRow = (targetName, displayName) => {
            const row = document.createElement('div');
            row.className = 'vote-row';
            
            const nameLabel = document.createElement('span');
            nameLabel.className = 'vote-name';
            nameLabel.textContent = displayName;

            const rightSide = document.createElement('div');
            rightSide.className = 'vote-right-side';

            const countText = document.createElement('span');
            countText.id = `vote-count-${targetName}`;
            countText.className = 'vote-count';
            countText.textContent = '0';

            const tickBtn = document.createElement('button');
            tickBtn.className = 'tick-btn';
            tickBtn.innerHTML = `<svg viewBox="0 0 24 24" class="tick-icon"><path d="M20 6L9 17l-5-5" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"></path></svg>`;

            tickBtn.onclick = () => {
                if (gameState.hasVoted) return; 
                gameState.hasVoted = true; 
                
                tickBtn.classList.add('selected-vote');
                document.querySelectorAll('.tick-btn').forEach(btn => btn.disabled = true);

                socket.emit('cast-vote', gameState.currentRoom, targetName);
                
                const msg = targetName === 'skip' ? `You voted to skip.` : `You voted for ${targetName}.`;
                appendToGameChat(msg);
            };

            rightSide.append(countText, tickBtn);
            row.append(nameLabel, rightSide);
            container.appendChild(row);
        };

        players.forEach(playerName => {
            if(gameState.eliminatedPlayers && gameState.eliminatedPlayers.has(playerName)) return;
            createVoteRow(playerName, playerName);
        });

        createVoteRow('skip', 'Skip Voting');
    }

    socket.on('live-vote-update', (voteCounts) => {
        document.querySelectorAll('.vote-count').forEach(el => el.textContent = '0');
        Object.entries(voteCounts).forEach(([target, count]) => {
            const targetText = document.getElementById(`vote-count-${target}`);
            if (targetText) targetText.textContent = `${count}`;
        });
    });

    socket.on('player-eliminated', (data) => {
        if (votingOverlay) votingOverlay.classList.add('hidden');
        
        if (data.name === 'skip') {
            appendToGameChat(`The village couldn't agree on who to kick. Nobody dies today.`);
        } else {
            appendToGameChat(`${data.name} was voted out with ${data.voteCount} votes!`);
            
            if (data.name === gameState.currentDisplayName) {
                gameState.isEliminated = true;
                
                const inputs = ['gameChatInput', 'gameSendBtn'];
                inputs.forEach(id => {
                    const el = document.getElementById(id);
                    if (el) el.disabled = true;
                });
                
                const chatContainer = document.getElementById('game-chat');
                if(chatContainer) chatContainer.style.display = 'none';
                if(openVoteMenuBtn) openVoteMenuBtn.classList.add('hidden');
                
                appendToGameChat(`You were eliminated. You are now a ghost and cannot speak.`);
            }

            if (!gameState.eliminatedPlayers) gameState.eliminatedPlayers = new Set();
            gameState.eliminatedPlayers.add(data.name);

            const gamePlayersList = document.getElementById("game-players-list");
            if (gamePlayersList) {
                gamePlayersList.querySelectorAll('li').forEach(item => { 
                    if (item.textContent.trim() === data.name) item.remove(); 
                });
            }
        }

        showEliminationModal(data.name, data.voteCount);
    });

    function showEliminationModal(eliminatedName, voteCount) {
        const modal = document.createElement('div');
        modal.id = 'eliminationModal';
        modal.style.cssText = `position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.85); display: flex; justify-content: center; align-items: center; z-index: 2000;`;
        
        const content = document.createElement('div');
        const isSkip = eliminatedName === 'skip';
        const color = isSkip ? '#f59e0b' : '#ef4444';
        
        content.style.cssText = `background: var(--bg); padding: 40px; border-radius: 15px; text-align: center; max-width: 400px; box-shadow: 0 10px 30px rgba(0,0,0,0.8); border: 3px solid ${color};`;
        
        const title = document.createElement('h2');
        title.textContent = isSkip ? 'Tied Vote!' : 'Player Eliminated!';
        title.style.color = color;
        
        const message = document.createElement('p');
        message.style.cssText = 'font-size: 1.3rem; margin: 20px 0;';
        message.textContent = isSkip ? 'The village failed to reach a majority. Nobody is kicked.' : `${eliminatedName} was exiled with ${voteCount} votes!`;
        
        const countdown = document.createElement('p');
        countdown.textContent = 'Going to sleep in 5 seconds...';
        countdown.style.color = 'var(--muted)';
        
        content.append(title, message, countdown);
        modal.appendChild(content);
        document.body.appendChild(modal);
        
        let timeLeft = 5;
        const timer = setInterval(() => {
            timeLeft--;
            countdown.textContent = `Going to sleep in ${timeLeft} seconds...`;
            if (timeLeft <= 0) {
                clearInterval(timer);
                modal.remove();
            }
        }, 1000);
    }
}