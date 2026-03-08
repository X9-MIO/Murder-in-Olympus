// game.js
import { showPage } from './ui.js';

export function setupGameLogic(socket, gameState) {
    
    /* ========================================================================== */
    /* 1. INITIALIZATION & SETUP                                                  */
    /* ========================================================================== */
    
    // timer handles for discussion phase
    let discussionCountdownInterval = null;
    let discussionEndTimeout = null;

    /* ========================================================================== */
    /* 2. GAME START & ROLE REVEAL                                                */
    /* ========================================================================== */

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

    /* ========================================================================== */
    /* 4. DISCUSSION PHASE LOGIC                                                  */
    /* ========================================================================== */

    socket.on('discussion-phase-started', data => {
        // Show timer for discussion phase
        let timeLeft = data.duration;
        const timerElement = document.getElementById('discussionTimer') || createDiscussionTimer();
        
        // clear any previous handles just in case
        if (discussionCountdownInterval) clearInterval(discussionCountdownInterval);
        if (discussionEndTimeout) clearTimeout(discussionEndTimeout);

        discussionCountdownInterval = setInterval(() => {
            timeLeft--;
            timerElement.textContent = `Discussion: ${timeLeft}s`;
            
            if (timeLeft <= 0) {
                clearInterval(discussionCountdownInterval);
                discussionCountdownInterval = null;
                gameChatInput.disabled = true;
                gameSendBtn.disabled = true;
                appendToGameChat("[NARRATOR]: Discussion phase ended. Voting starting...");
            }
        }, 1000);

        discussionEndTimeout = setTimeout(() => {
            // ensure countdown is cleared
            if (discussionCountdownInterval) {
                clearInterval(discussionCountdownInterval);
                discussionCountdownInterval = null;
            }
            gameChatInput.disabled = true;
            gameSendBtn.disabled = true;
            appendToGameChat("[SYSTEM]: Discussion phase ended. Voting starting...");
        }, data.duration * 1000);

        // Show skip button
        showSkipButton();
    });
    
    function createDiscussionTimer() {
        const timerDiv = document.getElementById('discussionTimer');
        if (timerDiv) {
            timerDiv.textContent = '';
        }
        return timerDiv;
    }
    
    function showSkipButton() {
        const skipBtn = document.getElementById('skipDiscussionBtn');
        if (skipBtn) {
            skipBtn.classList.remove('hidden');
            skipBtn.textContent = 'Skip Discussion';
            skipBtn.disabled = false;
            skipBtn.onclick = () => {
                socket.emit('skip-discussion', gameState.currentRoom);
                skipBtn.textContent = 'Waiting...';
                skipBtn.disabled = true;
            };
        }
    }
    
    function hideSkipButton() {
        const skipBtn = document.getElementById('skipDiscussionBtn');
        if (skipBtn) skipBtn.classList.add('hidden');
    }

    socket.on('player-skipped', (data) => {
        appendToGameChat(`[NARRATOR]: A player skipped discussion. ${data.remaining} players remaining to skip.`);
    });
    
    socket.on('discussion-skipped', () => {
        appendToGameChat("[NARRATOR]: All players skipped! Moving to voting phase...");
        hideSkipButton();
        const timerElement = document.getElementById('discussionTimer');
        if (timerElement) timerElement.style.display = 'none';

        if (discussionCountdownInterval) {
            clearInterval(discussionCountdownInterval);
            discussionCountdownInterval = null;
        }
        if (discussionEndTimeout) {
            clearTimeout(discussionEndTimeout);
            discussionEndTimeout = null;
        }
    });

    /* ========================================================================== */
    /* 5. VOTING PHASE LOGIC                                                      */
    /* ========================================================================== */
    
    socket.on('voting-phase-started', (data) => {
        gameChatInput.disabled = true;
        gameSendBtn.disabled = true;
        hideSkipButton(); // Hide skip button when voting starts
        showVotingUI(data.players);
        
        // Show timer for voting period (30 seconds)
        let voteTimeLeft = 30;
        const voteTimerElement = document.getElementById('voteTimer') || createVoteTimer();
        
        const voteCountdownInterval = setInterval(() => {
            voteTimeLeft--;
            voteTimerElement.textContent = `Voting: ${voteTimeLeft}s`;
            
            if (voteTimeLeft <= 0) {
                clearInterval(voteCountdownInterval);
                appendToGameChat("[NARRATOR]: Voting phase ended. Counting votes...");
                // Hide voting UI and timer
                const votingContainer = document.getElementById('votingContainer');
                if (votingContainer) votingContainer.remove();
                const voteTimerElement = document.getElementById('voteTimer');
                if (voteTimerElement) voteTimerElement.remove();
                gameChatBox.style.display = 'block';
            }
        }, 1000);
    });

    function showVotingUI(players) {
        // Don't show voting UI if player is eliminated
        if (gameState.isEliminated) {
            appendToGameChat("[NARRATOR]: You are eliminated and cannot vote.");
            return;
        }
        
        // Hide discussion chat
        gameChatBox.style.display = 'none';
        
        // Create voting container
        const votingContainer = document.createElement('div');
        votingContainer.id = 'votingContainer';
        votingContainer.style.cssText = `
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 15px;
            padding: 20px;
            background: rgba(0, 0, 0, 0.7);
            border-radius: 10px;
            margin: 20px 0;
        `;
        
        const votingTitle = document.createElement('h2');
        votingTitle.textContent = 'VOTING PHASE - Who do you suspect?';
        votingTitle.style.color = 'var(--accent)';
        votingContainer.appendChild(votingTitle);
        
        const buttonsContainer = document.createElement('div');
        buttonsContainer.style.cssText = `
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 10px;
            width: 100%;
            max-width: 600px;
        `;
        
        // Create vote buttons for each player
        players.forEach(playerName => {
            const btn = document.createElement('button');
            btn.textContent = playerName;
            btn.style.cssText = `
                padding: 12px 20px;
                background: #ef4444;
                color: white;
                border: none;
                border-radius: 5px;
                font-size: 1rem;
                cursor: pointer;
                font-weight: bold;
            `;
            btn.onmouseover = () => btn.style.background = '#dc2626';
            btn.onmouseout = () => btn.style.background = '#ef4444';
            btn.onclick = () => {
                socket.emit('cast-vote', gameState.currentRoom, playerName);
                appendToGameChat(`[NARRATOR]: You voted for ${playerName}`);
                votingContainer.style.display = 'none';
                const voteTimerElement = document.getElementById('voteTimer');
                if (voteTimerElement) voteTimerElement.remove();
                gameChatBox.style.display = 'block';
            };
            buttonsContainer.appendChild(btn);
        });
        
        votingContainer.appendChild(buttonsContainer);
        gameChatBox.parentElement.insertBefore(votingContainer, gameChatBox);
    }

    function createVoteTimer() {
        const timerDiv = document.createElement('div');
        timerDiv.id = 'voteTimer';
        timerDiv.style.cssText = 'text-align: center; font-size: 1.5rem; color: #ef4444; margin: 10px 0;';
        const gamePage = document.getElementById('gamemessagingpage');
        if (gamePage) {
            gamePage.insertBefore(timerDiv, gamePage.firstChild);
        }
        return timerDiv;
    }

    /* ========================================================================== */
    /* 6. ELIMINATION LOGIC                                                       */
    /* ========================================================================== */

    socket.on('player-eliminated', (data) => {
        // Show elimination message
        appendToGameChat(`[NARRATOR]: ${data.name} was voted out with ${data.voteCount} votes!`);
        
        // Check if current player was eliminated
        if (data.name === gameState.currentDisplayName) {
            // Mark player as eliminated in game state
            gameState.isEliminated = true;
            
            // Disable chat input
            gameChatInput.disabled = true;
            gameSendBtn.disabled = true;
            
            // Hide chat input container
            const chatInput = document.getElementById('game-chat');
            if (chatInput) chatInput.style.display = 'none';
            
            // Hide skip button
            const skipBtn = document.getElementById('skipDiscussionBtn');
            if (skipBtn) skipBtn.classList.add('hidden');
            
            // Hide vote button
            const voteBtn = document.getElementById('votebtn');
            if (voteBtn) voteBtn.classList.add('hidden');
            
            // Disable all dynamically created vote buttons
            const voteButtons = document.querySelectorAll('#votingContainer button');
            voteButtons.forEach(btn => {
                btn.disabled = true;
                btn.style.opacity = '0.5';
                btn.style.cursor = 'not-allowed';
                btn.onclick = null;
            });
            
            // Hide voting UI if it's displayed
            const votingContainer = document.getElementById('votingContainer');
            if (votingContainer) votingContainer.style.display = 'none';
            
            // Hide vote timer if it's displayed
            const voteTimer = document.getElementById('voteTimer');
            if (voteTimer) voteTimer.style.display = 'none';
            
            appendToGameChat(`[SYSTEM]: You have been eliminated. You can no longer participate.`);
        }
        
        // Update the player list by removing eliminated player
        const playersList = document.getElementById("players-list");
        if (playersList) {
            const playerItems = playersList.querySelectorAll('li');
            playerItems.forEach(item => {
                if (item.textContent === data.name) {
                    item.remove();
                }
            });
        }
        
        // Show elimination announcement in a modal or overlay
        showEliminationModal(data.name, data.voteCount);
        
        // After a delay, transition to next phase (night phase or continue discussion)
        setTimeout(() => {
            hideEliminationModal();
            // The server will handle transitioning to night phase or next discussion
        }, 5000);
    });
    
    function showEliminationModal(eliminatedName, voteCount) {
        const modal = document.createElement('div');
        modal.id = 'eliminationModal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
        `;
        
        const modalContent = document.createElement('div');
        modalContent.style.cssText = `
            background: var(--bg);
            padding: 30px;
            border-radius: 10px;
            text-align: center;
            border: 2px solid #ef4444;
            max-width: 400px;
        `;
        
        const title = document.createElement('h2');
        title.textContent = 'PLAYER ELIMINATED!';
        title.style.color = '#ef4444';
        
        const message = document.createElement('p');
        message.textContent = `${eliminatedName} was voted out with ${voteCount} votes!`;
        message.style.fontSize = '1.2rem';
        message.style.margin = '20px 0';
        
        const countdown = document.createElement('p');
        countdown.textContent = 'Continuing in 5 seconds...';
        countdown.style.color = 'var(--muted)';
        
        modalContent.appendChild(title);
        modalContent.appendChild(message);
        modalContent.appendChild(countdown);
        modal.appendChild(modalContent);
        
        document.body.appendChild(modal);
        
        // Countdown timer
        let timeLeft = 5;
        const countdownInterval = setInterval(() => {
            timeLeft--;
            countdown.textContent = `Continuing in ${timeLeft} seconds...`;
            if (timeLeft <= 0) {
                clearInterval(countdownInterval);
            }
        }, 1000);
    }
    
    function hideEliminationModal() {
        const modal = document.getElementById('eliminationModal');
        if (modal) {
            modal.remove();
        }
    }

    /* ========================================================================== */
    /* 7. DAY & NIGHT CYCLE                                                       */
    /* ========================================================================== */
    
    socket.on('day-phase-started', (data) => {
        appendToGameChat(`[NARRATOR]: ${data.message}`);
        showDayPhase(data.message);
    });
    
    socket.on('night-action-required', (data) => {
        showNightActionUI(data);
    });
    
    socket.on('night-actions-revealed', (data) => {
        appendToGameChat(`[NARRATOR]: ${data.message}`);
        data.actions.forEach(action => {
            if (action.type === 'werewolf-kill') {
                appendToGameChat(`[NARRATOR]: The werewolf eliminated ${action.target}!`);
            }
            // Add other action types here
        });
        
        // Check if current player was killed at night
        if (data.eliminatedPlayer === gameState.currentDisplayName) {
            // Mark player as eliminated in game state
            gameState.isEliminated = true;
            
            // Disable chat input
            gameChatInput.disabled = true;
            gameSendBtn.disabled = true;
            
            // Hide chat input container
            const chatInput = document.getElementById('game-chat');
            if (chatInput) chatInput.style.display = 'none';
            
            // Hide skip button
            const skipBtn = document.getElementById('skipDiscussionBtn');
            if (skipBtn) skipBtn.classList.add('hidden');
            
            // Hide vote button
            const voteBtn = document.getElementById('votebtn');
            if (voteBtn) voteBtn.classList.add('hidden');
            
            // Disable all dynamically created vote buttons
            const voteButtons = document.querySelectorAll('#votingContainer button');
            voteButtons.forEach(btn => {
                btn.disabled = true;
                btn.style.opacity = '0.5';
                btn.style.cursor = 'not-allowed';
                btn.onclick = null;
            });
            
            // Hide voting UI if it's displayed
            const votingContainer = document.getElementById('votingContainer');
            if (votingContainer) votingContainer.style.display = 'none';
            
            // Hide vote timer if it's displayed
            const voteTimer = document.getElementById('voteTimer');
            if (voteTimer) voteTimer.style.display = 'none';
            
            appendToGameChat(`[NARRATOR]: You have been eliminated. You can no longer participate.`);
        }
        
        // Update player list if someone was eliminated at night
        if (data.eliminatedPlayer) {
            const playersList = document.getElementById("players-list");
            if (playersList) {
                const playerItems = playersList.querySelectorAll('li');
                playerItems.forEach(item => {
                    if (item.textContent === data.eliminatedPlayer) {
                        item.remove();
                    }
                });
            }
        }
        
        hideNightActionUI();
    });
    
    function showDayPhase(message) {
        const dayModal = document.createElement('div');
        dayModal.id = 'dayModal';
        dayModal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(135, 206, 235, 0.9);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
        `;
        
        const dayContent = document.createElement('div');
        dayContent.style.cssText = `
            background: var(--bg);
            padding: 40px;
            border-radius: 15px;
            text-align: center;
            border: 3px solid #ffd700;
            max-width: 500px;
        `;
        
        const sunIcon = document.createElement('div');
        sunIcon.textContent = '☀️';
        sunIcon.style.cssText = 'font-size: 4rem; margin-bottom: 20px;';
        
        const dayTitle = document.createElement('h1');
        dayTitle.textContent = 'DAY PHASE';
        dayTitle.style.cssText = 'color: #ffd700; margin-bottom: 20px;';
        
        const dayMessage = document.createElement('p');
        dayMessage.textContent = message;
        dayMessage.style.cssText = 'font-size: 1.2rem; line-height: 1.6;';
        
        dayContent.appendChild(sunIcon);
        dayContent.appendChild(dayTitle);
        dayContent.appendChild(dayMessage);
        dayModal.appendChild(dayContent);
        
        document.body.appendChild(dayModal);
        
        // Auto-hide after 10 seconds
        setTimeout(() => {
            if (dayModal.parentElement) {
                dayModal.remove();
            }
        }, 10000);
    }
    
    function showNightActionUI(data) {
        const nightModal = document.createElement('div');
        nightModal.id = 'nightModal';
        nightModal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.95);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
        `;
        
        const nightContent = document.createElement('div');
        nightContent.style.cssText = `
            background: var(--bg);
            padding: 30px;
            border-radius: 10px;
            text-align: center;
            border: 2px solid #ef4444;
            max-width: 400px;
        `;
        
        const moonIcon = document.createElement('div');
        moonIcon.textContent = '🌙';
        moonIcon.style.cssText = 'font-size: 3rem; margin-bottom: 15px;';
        
        const nightTitle = document.createElement('h2');
        nightTitle.textContent = 'NIGHT PHASE';
        nightTitle.style.cssText = 'color: #ef4444; margin-bottom: 15px;';
        
        const actionMessage = document.createElement('p');
        actionMessage.textContent = data.message;
        actionMessage.style.cssText = 'margin-bottom: 20px;';
        
        const targetSelect = document.createElement('select');
        targetSelect.id = 'nightTargetSelect';
        targetSelect.style.cssText = `
            width: 100%;
            padding: 10px;
            margin-bottom: 20px;
            border-radius: 5px;
            border: 1px solid var(--muted);
        `;
        
        const defaultOption = document.createElement('option');
        defaultOption.textContent = 'Choose a target...';
        defaultOption.disabled = true;
        defaultOption.selected = true;
        targetSelect.appendChild(defaultOption);
        
        data.targets.forEach(target => {
            const option = document.createElement('option');
            option.value = target;
            option.textContent = target;
            targetSelect.appendChild(option);
        });
        
        const submitBtn = document.createElement('button');
        submitBtn.textContent = 'Submit Action';
        submitBtn.style.cssText = `
            padding: 12px 24px;
            background: #ef4444;
            color: white;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-weight: bold;
        `;
        submitBtn.onclick = () => {
            const selectedTarget = targetSelect.value;
            if (selectedTarget) {
                socket.emit('submit-night-action', gameState.currentRoom, {
                    type: data.type,
                    target: selectedTarget
                });
                nightModal.remove();
            }
        };
        
        nightContent.appendChild(moonIcon);
        nightContent.appendChild(nightTitle);
        nightContent.appendChild(actionMessage);
        nightContent.appendChild(targetSelect);
        nightContent.appendChild(submitBtn);
        nightModal.appendChild(nightContent);
        
        document.body.appendChild(nightModal);
    }
    
    function hideNightActionUI() {
        const nightModal = document.getElementById('nightModal');
        if (nightModal) {
            nightModal.remove();
        }
    }
}