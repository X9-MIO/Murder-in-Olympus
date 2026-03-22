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
            
            // Assign unique colors to the new roles
            if (role === "Wolf") cardRoleText.style.color = "#ef4444"; // Red
            else if (role === "Seer") cardRoleText.style.color = "#a855f7"; // Purple
            else if (role === "Healer") cardRoleText.style.color = "#22c55e"; // Green
            else if (role === "Little Girl") cardRoleText.style.color = "#ec4899"; // Pink
            else if (role === "Artemis") cardRoleText.style.color = "#eab308"; // Yellow
            else cardRoleText.style.color = "var(--accent)"; // Default Villager
        }

        const roleImage = document.getElementById("role-image");
        const messagingRoleImage = document.getElementById("messaging-role-image");
        
        // Map the new roles to their specific images
        let imagePath = "/public/villager.png"; 
        if (role === "Wolf") imagePath = "/public/wolf.png";
        else if (role === "Seer") imagePath = "/public/seer.png"; 
        else if (role === "Healer") imagePath = "/public/healer.png";
        else if (role === "Little Girl") imagePath = "/public/little-girl.png";
        else if (role === "Artemis") imagePath = "/public/artemis.png";

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
    /* PRIVATE ROLE FEEDBACK LOGIC                                                */
    /* ========================================================================== */

    // Handle Seer's inspection result
    socket.on('seer-result', (data) => {
        // The easiest way to show them the result is to push a private system message into their chat
        appendToGameChat(`[VISION]: You inspected ${data.target}. Their true role is ${data.role}!`);
        
        // Optionally, you can also display this on the screen temporarily
        const waitingText = document.getElementById('night-waiting-text');
        if (waitingText) {
            waitingText.textContent = `Vision received: ${data.target} is a ${data.role}!`;
            waitingText.classList.remove('hidden');
        }
    });

    // Handle Little Girl's passive peek
    socket.on('little-girl-caught', (data) => {
        // Send a private, scary system message to the Wolf
        appendToGameChat(`[DANGER]: You heard a twig snap in the dark... You saw ${data.littleGirlName} peeking at you! They are the Little Girl!`);
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

    // Handle waking up and realizing the Healer saved you!
    socket.on('you-were-saved', () => {
        // 1. Send a private message in their chat
        appendToGameChat(`[DIVINE LIGHT]: A warm light enveloped you in the dark. You were visited by the Healer!`);

        // 2. Create the glorious pop-up modal
        const modal = document.createElement('div');
        modal.id = 'savedModal';
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0, 0, 0, 0.85); display: flex; justify-content: center;
            align-items: center; z-index: 2000;
        `;
        
        const modalContent = document.createElement('div');
        modalContent.style.cssText = `
            background: var(--bg); padding: 40px; border-radius: 15px;
            text-align: center; max-width: 400px; box-shadow: 0 10px 30px rgba(34, 197, 94, 0.8);
            border: 3px solid #22c55e;
        `;
        
        const title = document.createElement('h2');
        title.textContent = 'DIVINE INTERVENTION!';
        title.style.color = '#22c55e'; // Bright Green
        
        const message = document.createElement('p');
        message.style.fontSize = '1.3rem';
        message.style.margin = '20px 0';
        message.textContent = 'The Healer visited you in the night. You are protected from the beasts!';

        const closeBtn = document.createElement('button');
        closeBtn.textContent = 'Praise the Gods';
        closeBtn.style.cssText = `
            padding: 10px 20px; background: #22c55e; color: #fff; 
            border: none; border-radius: 5px; cursor: pointer; font-size: 1.1rem;
            transition: 0.3s;
        `;
        closeBtn.onclick = () => modal.remove();

        modalContent.appendChild(title);
        modalContent.appendChild(message);
        modalContent.appendChild(closeBtn);
        modal.appendChild(modalContent);
        document.body.appendChild(modal);

        // Auto-remove the modal after 7 seconds just in case they forget to click close
        setTimeout(() => {
            if (document.getElementById('savedModal')) modal.remove();
        }, 7000);
    });

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
        const nightMsg = document.getElementById('night-message-text');
        if (nightMsg) nightMsg.textContent = data.message;
        
        const actionContainer = document.getElementById('night-action-container');
        const waitingText = document.getElementById('night-waiting-text');
        const nightTimer = document.getElementById('night-timer');
        
        if(actionContainer) actionContainer.classList.remove('hidden');
        if(waitingText) waitingText.classList.add('hidden');
        if(nightTimer) nightTimer.classList.remove('hidden');
        
        // 1. Clear whatever was in the container before
        actionContainer.innerHTML = '';
        
        // 2. Create a clickable button for every target
        data.targets.forEach(targetName => {
            const btn = document.createElement('button');
            btn.className = 'night-target-btn';
            btn.textContent = targetName;
            
            // Add some base styling so they look like big clickable blocks
            btn.style.cssText = "display: block; width: 100%; margin: 10px 0; padding: 15px; font-size: 1.2rem; background: var(--bg); border: 2px solid var(--accent); color: var(--text); border-radius: 8px; cursor: pointer; transition: 0.3s;";
            
            btn.onclick = () => {
                // Disable ALL buttons so they can't click twice
                document.querySelectorAll('.night-target-btn').forEach(b => b.disabled = true);
                
                // Show a loading state briefly
                btn.textContent = "Revealing...";
                
                socket.emit('submit-night-action', gameState.currentRoom, {
                    type: data.type,
                    target: targetName
                });
                
                // If it's the Wolf or Healer, just show "Submitted"
                if (data.type !== 'seer-inspect' && data.type !== 'little-girl-peek') {
                    btn.textContent = "Action Submitted!";
                    btn.style.background = "var(--accent)";
                    btn.style.color = "#fff";
                }
            };
            actionContainer.appendChild(btn);
        });
        
        // 3. Handle the Timer
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




    // Make the Seer's button flip to show the role
    socket.on('seer-result', (data) => {
        const buttons = document.querySelectorAll('.night-target-btn');
        buttons.forEach(btn => {
            if (btn.textContent === "Revealing...") {
                btn.textContent = `${data.target} is the ${data.role}!`;
                // Turn red for wolf, purple for anything else
                btn.style.background = data.role === 'Wolf' ? '#ef4444' : '#a855f7';
                btn.style.color = '#fff';
            }
        });
        appendToGameChat(`[VISION]: You inspected ${data.target}. Their true role is ${data.role}!`);
    });

    // Make the Little Girl's button flip to show the Wolf
    socket.on('little-girl-result', (data) => {
        const buttons = document.querySelectorAll('.night-target-btn');
        const wolvesList = data.wolves.length > 0 ? data.wolves.join(", ") : "Nobody";
        buttons.forEach(btn => {
            if (btn.textContent === "Revealing...") {
                btn.textContent = `The Wolf is: ${wolvesList}!`;
                btn.style.background = '#ef4444'; // Red for wolf
                btn.style.color = '#fff';
            }
        });
        appendToGameChat(`[PEEK]: You saw the wolves: ${wolvesList}`);
    });

   
   // If the Little Girl gets caught, notify the Wolf AND highlight her button!
    socket.on('little-girl-caught', (data) => {
        // 1. Send the scary chat message
        appendToGameChat(`[DANGER]: You heard a twig snap... ${data.littleGirlName} is the Little Girl and just saw you!`);

        // 2. Find the Little Girl's button on the Wolf's screen and change it
        const buttons = document.querySelectorAll('.night-target-btn');
        buttons.forEach(btn => {
            // Check if this button has the Little Girl's name
            if (btn.textContent === data.littleGirlName) {
                btn.textContent = `${data.littleGirlName} (Caught Peeking!)`;
                
                // Turn her button bright pink so the Wolf immediately notices!
                btn.style.background = '#ec4899'; 
                btn.style.color = '#fff';
                btn.style.borderColor = '#fff';
                btn.style.fontWeight = 'bold';
            }
        });
    });




    
    socket.on('night-actions-revealed', (data) => {
        showPage('daypage'); 
        
        const dayMsg = document.getElementById('day-message-text');
        if (dayMsg) dayMsg.textContent = data.message;
        appendToGameChat(`[NARRATOR]: ${data.message}`);
        
        // Loop through everyone who died and remove them!
        if (data.eliminatedPlayers && data.eliminatedPlayers.length > 0) {
            data.eliminatedPlayers.forEach(deadPlayer => {
                
                if (deadPlayer === gameState.currentDisplayName) {
                    gameState.isEliminated = true;
                    if(gameChatInput) gameChatInput.disabled = true;
                    if(gameSendBtn) gameSendBtn.disabled = true;
                    
                    const chatInputContainer = document.getElementById('game-chat');
                    if(chatInputContainer) chatInputContainer.style.display = 'none';
                    
                    if(openVoteMenuBtn) openVoteMenuBtn.classList.add('hidden');
                    appendToGameChat(`[SYSTEM]: You have been eliminated. You can no longer participate.`);
                }
                
                const gamePlayersList = document.getElementById("game-players-list");
                if (gamePlayersList) {
                    const playerItems = gamePlayersList.querySelectorAll('li');
                    playerItems.forEach(item => {
                        if (item.textContent.trim() === deadPlayer) {
                            item.remove();
                        }
                    });
                }
            });
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


    // Handle the player being infected and turned into a Wolf
    socket.on('you-turned-wolf', () => {
        // Change their role locally
        gameState.myRole = "Wolf";
        
        // Update the Role Card text to red
        const cardRoleText = document.getElementById("card-role-text");
        if (cardRoleText) {
            cardRoleText.textContent = "Wolf";
            cardRoleText.style.color = "#ef4444"; 
        }
        
        // Update the Images to the Wolf image
        const roleImage = document.getElementById("role-image");
        const messagingRoleImage = document.getElementById("messaging-role-image");
        if (roleImage) roleImage.src = "/public/wolf.png"; 
        if (messagingRoleImage) messagingRoleImage.src = "/public/wolf.png";

        // Send a terrifying message to their chat
        appendToGameChat(`[CURSE]: You were bitten in the night! You are now a WOLF! Your new goal is to eliminate the village.`);
        
        // --- NEW CUSTOM RED POP-UP ---
        const modal = document.createElement('div');
        modal.id = 'infectedModal';
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0, 0, 0, 0.85); display: flex; justify-content: center;
            align-items: center; z-index: 2000;
        `;
        
        const modalContent = document.createElement('div');
        modalContent.style.cssText = `
            background: var(--bg); padding: 40px; border-radius: 15px;
            text-align: center; max-width: 400px; box-shadow: 0 10px 30px rgba(239, 68, 68, 0.8);
            border: 3px solid #ef4444;
        `;
        
        const title = document.createElement('h2');
        title.textContent = 'YOU WERE BITTEN!';
        title.style.color = '#ef4444'; // Bright Red
        
        const message = document.createElement('p');
        message.style.fontSize = '1.3rem';
        message.style.margin = '20px 0';
        message.textContent = 'You have transformed into a Werewolf! Your new goal is to eliminate the village.';

        const closeBtn = document.createElement('button');
        closeBtn.textContent = 'Accept your fate';
        closeBtn.style.cssText = `
            padding: 10px 20px; background: #ef4444; color: #fff; 
            border: none; border-radius: 5px; cursor: pointer; font-size: 1.1rem;
            transition: 0.3s; font-family: 'VT323', monospace;
        `;
        closeBtn.onclick = () => modal.remove();

        modalContent.appendChild(title);
        modalContent.appendChild(message);
        modalContent.appendChild(closeBtn);
        modal.appendChild(modalContent);
        document.body.appendChild(modal);

        // Auto-remove the modal after 8 seconds just in case they forget to close it
        setTimeout(() => {
            if (document.getElementById('infectedModal')) modal.remove();
        }, 8000);
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