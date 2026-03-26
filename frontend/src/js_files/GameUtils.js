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


export function appendToGameChat(messageText) {
    const gameChatBox = document.getElementById('gameChatBox');
    if (!gameChatBox || !messageText.trim()) return;
    
    const msgDiv = document.createElement("div");
    msgDiv.className = "chat-message";
    msgDiv.style.color = "#ffd700"; 
    msgDiv.style.fontFamily = "'Cinzel', serif";
    msgDiv.textContent = messageText;
    
    gameChatBox.appendChild(msgDiv);
    gameChatBox.scrollTop = gameChatBox.scrollHeight;
}