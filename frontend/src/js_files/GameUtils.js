// Per-element typewriter animation helper.
export function typeWriterEffect(element, text, speed = 40, callback) {
    if (element.typewriterInterval) clearInterval(element.typewriterInterval);
    element.textContent = ""; 
    let i = 0;
    element.typewriterInterval = setInterval(() => {
        if (i < text.length) {
            element.textContent += text.charAt(i);
            i++;
        } else {
            clearInterval(element.typewriterInterval);
            element.typewriterInterval = null; 
            if (callback) callback(); 
        }
    }, speed); 
}


// Appends system-style messages to in-game chat panel.
export function appendToGameChat(messageText) {
    const gameChatBox = document.getElementById('gameChatBox');
    if (!gameChatBox || !messageText.trim()) return;
    
    const msgDiv = document.createElement("div");
    msgDiv.className = "chat-message";
    msgDiv.style.color = "#ffd700"; 
    msgDiv.style.fontFamily = "'Cinzel', serif";
    msgDiv.style.fontWeight = "800";
    msgDiv.textContent = messageText;
    
    gameChatBox.appendChild(msgDiv);
    gameChatBox.scrollTop = gameChatBox.scrollHeight;
}