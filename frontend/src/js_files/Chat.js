// chat.js
export function setupChatLogic(socket, gameState) {
  const chatBox = document.querySelector(".chat-box");
  const chatInput = document.getElementById("chatInput");
  const sendBtn = document.getElementById("sendBtn");

  function displayMessage(messageText) {
    if (!messageText.trim()) return; 
    const messageDiv = document.createElement("div");
    messageDiv.classList.add("chat-message");
    messageDiv.textContent = messageText;
    chatBox.appendChild(messageDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
  }

  function sendMessage() {
    if(!chatInput.value.trim()) return;
    const fullMessage = gameState.currentDisplayName + ": " + chatInput.value;
    socket.emit("send-message", gameState.currentRoom, fullMessage);
    displayMessage("You: " + chatInput.value);
    chatInput.value = "";
  }

  sendBtn.addEventListener("click", sendMessage);

  chatInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      sendMessage();
    }
  });

  socket.on("receive-message", (message) => {
    displayMessage(message);
  });
}