// game.js
import { showPage } from './ui.js';

export function setupGameLogic(socket, gameState) {
    
    /* ========================================================================== */
    /* 1. INITIALIZATION & SETUP                                                  */
    /* ========================================================================== */
    
    let discussionCountdownInterval = null;
    let nightCountdownInterval = null;

    /* ========================================================================== */
    /* 2. GAME START & ROLE REVEAL                                                */
    /* ========================================================================== */

    const startGameBtn = document.getElementById("startgamebtn");
    if (startGameBtn) {
        startGameBtn.addEventListener('click', () => {
            socket.emit('start-game', gameState.currentRoom);
        });
    }

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

    socket.on('game-starting', () => {
        
        showPage("gamepage"); 
        
        const rolePrefix = document.getElementById("role-prefix-text");
        const cardRoleText = document.getElementById("card-role-text");
        const roleCard = document.getElementById("roleCard"); 
        const revealStatusText = document.getElementById("reveal-status-text"); 

        if (rolePrefix) rolePrefix.textContent = "You are...";
        if (cardRoleText) cardRoleText.style.opacity = "0";

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

            setTimeout(() => {
                clearInterval(countdownInterval); 
                if (roleCard) roleCard.classList.add("flipped");
                
                if (rolePrefix) rolePrefix.textContent = "You are the";
                if (cardRoleText) cardRoleText.style.opacity = "1";
                if (revealStatusText) revealStatusText.textContent = "Your role is revealed! Moving to discussion...";
            }, 5000); 

        }, 6000); 
    });

    /* ========================================================================== */
    /* 3. IN-GAME CHAT LOGIC                                                      */
    /* ========================================================================== */
    
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

    socket.on('receive-message', (message) => {
        appendToGameChat(message);
    });

    /* ========================================================================== */
    /* 4. OVERLAY MENU LOGIC                                                      */
    /* ========================================================================== */
    const openVoteMenuBtn = document.getElementById('openVoteMenuBtn');
    const closeVoteMenuBtn = document.getElementById('closeVoteMenuBtn');
    const votingOverlay = document.getElementById('votingOverlay');

    if (openVoteMenuBtn) openVoteMenuBtn.onclick = () => votingOverlay.classList.remove('hidden');
    if (closeVoteMenuBtn) closeVoteMenuBtn.onclick = () => votingOverlay.classList.add('hidden');

    /* ========================================================================== */
    /* 5. DISCUSSION & LIVE VOTING LOGIC                                          */
    /* ========================================================================== */

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
        if(openVoteMenuBtn) openVoteMenuBtn.disabled = false;

        const createVoteRow = (targetName, displayName) => {
            const row = document.createElement('div');
            row.classList.add('vote-row');
            
            const nameLabel = document.createElement('span');
            nameLabel.classList.add('vote-name');
            nameLabel.textContent = displayName;

            const rightSide = document.createElement('div');
            rightSide.classList.add('vote-right-side');

            const countText = document.createElement('span');
            countText.id = `vote-count-${targetName}`;
            countText.classList.add('vote-count');
            countText.textContent = '0';

            const tickBtn = document.createElement('button');
            tickBtn.classList.add('tick-btn');
            
            // This creates a perfect, transparent checkmark that automatically changes color!
            tickBtn.innerHTML = `
                <svg viewBox="0 0 24 24" class="tick-icon">
                    <path d="M20 6L9 17l-5-5" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"></path>
                </svg>
            `;

            tickBtn.onclick = () => {
                if (gameState.hasVoted) return; 
                gameState.hasVoted = true; 
                
                tickBtn.classList.add('selected-vote');
                
                const allTickBtns = document.querySelectorAll('.tick-btn');
                allTickBtns.forEach(btn => btn.disabled = true);

                socket.emit('cast-vote', gameState.currentRoom, targetName);
                
                if(targetName === 'skip') {
                    appendToGameChat(`[SYSTEM]: You voted to skip.`);
                } else {
                    appendToGameChat(`[SYSTEM]: You voted for ${targetName}`);
                }
            };

            rightSide.appendChild(countText);
            rightSide.appendChild(tickBtn);
            
            row.appendChild(nameLabel);
            row.appendChild(rightSide);
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
        for (const [target, count] of Object.entries(voteCounts)) {
            const targetText = document.getElementById(`vote-count-${target}`);
            if (targetText) targetText.textContent = `${count}`;
        }
    });

    /* ========================================================================== */
    /* 6. ELIMINATION LOGIC                                                       */
    /* ========================================================================== */
    socket.on('player-eliminated', (data) => {
        if (votingOverlay) votingOverlay.classList.add('hidden');
        
        if (data.name === 'skip') {
            appendToGameChat(`[NARRATOR]: The village could not agree. Nobody is eliminated today.`);
        } else {
            appendToGameChat(`[NARRATOR]: ${data.name} was voted out with ${data.voteCount} votes!`);
            
            if (data.name === gameState.currentDisplayName) {
                gameState.isEliminated = true;
                if(gameChatInput) gameChatInput.disabled = true;
                if(gameSendBtn) gameSendBtn.disabled = true;
                
                const chatInputContainer = document.getElementById('game-chat');
                if(chatInputContainer) chatInputContainer.style.display = 'none';
                
                if(openVoteMenuBtn) openVoteMenuBtn.classList.add('hidden');
                appendToGameChat(`[SYSTEM]: You have been eliminated. You can no longer participate.`);
            }

            if (!gameState.eliminatedPlayers) gameState.eliminatedPlayers = new Set();
            gameState.eliminatedPlayers.add(data.name);

            const gamePlayersList = document.getElementById("game-players-list");
            if (gamePlayersList) {
                const items = gamePlayersList.querySelectorAll('li');
                items.forEach(item => { 
                    if (item.textContent.trim() === data.name) item.remove(); 
                });
            }
        }

        showEliminationModal(data.name, data.voteCount);
        
        setTimeout(() => {
            const modal = document.getElementById('eliminationModal');
            if (modal) modal.remove();
        }, 5000);
    });

    function showEliminationModal(eliminatedName, voteCount) {
        const modal = document.createElement('div');
        modal.id = 'eliminationModal';
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0, 0, 0, 0.85); display: flex; justify-content: center;
            align-items: center; z-index: 2000;
        `;
        
        const modalContent = document.createElement('div');
        modalContent.style.cssText = `
            background: var(--bg); padding: 40px; border-radius: 15px;
            text-align: center; max-width: 400px; box-shadow: 0 10px 30px rgba(0,0,0,0.8);
        `;
        
        const title = document.createElement('h2');
        const message = document.createElement('p');
        message.style.fontSize = '1.3rem';
        message.style.margin = '20px 0';

        if (eliminatedName === 'skip') {
            modalContent.style.border = '3px solid #f59e0b';
            title.textContent = 'NOBODY KICKED';
            title.style.color = '#f59e0b';
            message.textContent = 'The majority voted to skip the elimination.';
        } else {
            modalContent.style.border = '3px solid #ef4444';
            title.textContent = 'PLAYER ELIMINATED!';
            title.style.color = '#ef4444';
            message.textContent = `${eliminatedName} was voted out with ${voteCount} votes!`;
        }
        
        const countdown = document.createElement('p');
        countdown.textContent = 'Going to sleep in 5 seconds...';
        countdown.style.color = 'var(--muted)';
        
        modalContent.appendChild(title);
        modalContent.appendChild(message);
        modalContent.appendChild(countdown);
        modal.appendChild(modalContent);
        document.body.appendChild(modal);
        
        let timeLeft = 5;
        const countdownInterval = setInterval(() => {
            timeLeft--;
            countdown.textContent = `Going to sleep in ${timeLeft} seconds...`;
            if (timeLeft <= 0) clearInterval(countdownInterval);
        }, 1000);
    }

    /* ========================================================================== */
    /* 7. DAY & NIGHT CYCLE                                                       */
    /* ========================================================================== */
    
    socket.on('night-phase-started', (data) => {
        showPage('nightpage'); 
        
        const nightMsg = document.getElementById('night-message-text');
        if (nightMsg) nightMsg.textContent = data.message;
        
        const actionContainer = document.getElementById('night-action-container');
        const waitingText = document.getElementById('night-waiting-text');
        
        if(actionContainer) actionContainer.classList.add('hidden');
        if(waitingText) waitingText.classList.remove('hidden');
    });
    
    socket.on('night-action-required', (data) => {
        const targetSelect = document.getElementById('nightTargetSelect');
        const submitBtn = document.getElementById('submitNightActionBtn');
        const actionContainer = document.getElementById('night-action-container');
        const waitingText = document.getElementById('night-waiting-text');
        const nightTimer = document.getElementById('night-timer');
        
        if(actionContainer) actionContainer.classList.remove('hidden');
        if(waitingText) waitingText.classList.add('hidden');
        if(nightTimer) nightTimer.classList.remove('hidden');
        
        if (targetSelect) {
            targetSelect.innerHTML = '<option disabled selected>Choose a target...</option>';
            data.targets.forEach(target => {
                const option = document.createElement('option');
                option.value = target;
                option.textContent = target;
                targetSelect.appendChild(option);
            });
        }
        
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
                    waitingText.textContent = "Time's up! You missed your chance to attack.";
                    waitingText.classList.remove('hidden');
                }
            }
        }, 1000);
        
        if (submitBtn) {
            submitBtn.onclick = () => {
                const selectedTarget = targetSelect.value;
                if (selectedTarget && selectedTarget !== 'Choose a target...') {
                    socket.emit('submit-night-action', gameState.currentRoom, {
                        type: data.type,
                        target: selectedTarget
                    });
                    
                    clearInterval(nightCountdownInterval);
                    
                    if(actionContainer) actionContainer.classList.add('hidden');
                    if(nightTimer) nightTimer.classList.add('hidden');
                    if(waitingText) {
                        waitingText.textContent = "Action submitted! Waiting for sunrise...";
                        waitingText.classList.remove('hidden');
                    }
                }
            };
        }
    });
    
    socket.on('night-actions-revealed', (data) => {
        showPage('daypage'); 
        
        let morningMessage = "The sun rises over Olympus. ";
        
        // Use the eliminatedPlayer string directly from the server!
        if (data.eliminatedPlayer) {
            morningMessage += `Tragedy has struck. The werewolf eliminated ${data.eliminatedPlayer}!`;
        } else {
            morningMessage += `It is a miracle. Nobody was killed last night.`;
        }
        
        const dayMsg = document.getElementById('day-message-text');
        if (dayMsg) dayMsg.textContent = morningMessage;
        
        appendToGameChat(`[NARRATOR]: ${morningMessage}`);
        
        if (data.eliminatedPlayer === gameState.currentDisplayName) {
            gameState.isEliminated = true;
            if(gameChatInput) gameChatInput.disabled = true;
            if(gameSendBtn) gameSendBtn.disabled = true;
            
            const chatInputContainer = document.getElementById('game-chat');
            if(chatInputContainer) chatInputContainer.style.display = 'none';
            
            if(openVoteMenuBtn) openVoteMenuBtn.classList.add('hidden');
            appendToGameChat(`[SYSTEM]: You have been eliminated. You can no longer participate.`);
        }
        
        if (data.eliminatedPlayer) {
            const gamePlayersList = document.getElementById("game-players-list");
            if (gamePlayersList) {
                const playerItems = gamePlayersList.querySelectorAll('li');
                playerItems.forEach(item => {
                    if (item.textContent.trim() === data.eliminatedPlayer) {
                        item.remove();
                    }
                });
            }
        }
    });

    /* ========================================================================== */
    /* 8. HIDE/SHOW ROLE CARD LOGIC                                               */
    /* ========================================================================== */

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

    /* ========================================================================== */
    /* 9. GAME OVER LOGIC                                                         */
    /* ========================================================================== */
    
    socket.on('game-over', (data) => {
        
        showPage('gameoverpage');
        
        const title = document.getElementById('game-over-title');
        const msg = document.getElementById('game-over-message');
        
        if (title) {
            title.textContent = data.winner === 'Werewolf' ? 'WEREWOLF WINS!' : 'VILLAGERS WIN!';
            title.style.color = data.winner === 'Werewolf' ? '#ef4444' : '#22c55e';
            title.parentElement.style.border = `3px solid ${data.winner === 'Werewolf' ? '#ef4444' : '#22c55e'}`;
        }
        
        if (msg) {
            typeWriterEffect(msg, data.message, 45); 
        }
    });

   const backToLobbyBtn = document.getElementById('backToLobbyBtn');
    if (backToLobbyBtn) {
        backToLobbyBtn.onclick = () => {
            // Instead of reloading the page, tell the server to restart the room!
            socket.emit('play-again', gameState.currentRoom); 
        };
    }

    // When the server confirms the reset, clean up the UI
    socket.on('room-reset', () => {
        // 1. Go back to the lobby screen
        showPage('lobby');

        // 2. Clear both chat boxes
        const mainChatBox = document.querySelector(".chat-box");
        if (mainChatBox) mainChatBox.innerHTML = "";
        
        const gameChatBox = document.getElementById("gameChatBox");
        if (gameChatBox) gameChatBox.innerHTML = "";

        // 3. Revive the player locally
        gameState.isEliminated = false;
        gameState.hasVoted = false;
        if (gameState.eliminatedPlayers) gameState.eliminatedPlayers.clear();

        // 4. Re-enable the chat inputs if they died last game
        if(gameChatInput) gameChatInput.disabled = false;
        if(gameSendBtn) gameSendBtn.disabled = false;
        
        const chatInputContainer = document.getElementById('game-chat');
        if(chatInputContainer) chatInputContainer.style.display = ''; // Restores default CSS
        
        if(openVoteMenuBtn) openVoteMenuBtn.classList.remove('hidden');
    });

    /* ========================================================================== */
    /* HELPER FUNCTIONS                                                           */
    /* ========================================================================== */

    function typeWriterEffect(element, text, speed = 40, callback) {
        element.textContent = ""; 
        let i = 0;
        const interval = setInterval(() => {
            if (i < text.length) {
                element.textContent += text.charAt(i);
                i++;
            } else {
                clearInterval(interval);
                if (callback) callback(); 
            }
        }, speed); 
    }

} 