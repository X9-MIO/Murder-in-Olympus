# Murder-in-Olympus

##  Getting Started

To run this project locally, you will need to start both the **Game Server** and the **Frontend Development Server**.

### Prerequisites
* [Node.js](https://nodejs.org/) (v16 or higher recommended)
* npm (comes with Node)

---

### 1. Setup & Installation

First, clone the repository and install the dependencies for both parts of the application.

also you need to install better-sqlite3



**For the Backend:**
```bash
cd Murder-in-Olympus
cd game-server
npm install
```


**For the Backend:**
```bash
cd Murder-in-Olympus
npm install better-sqlite3
```

### 2. Run the server.js

```bash
cd game-server
node server.js
```
### 3. Run the webpage

```bash
cd frontend
npm run dev
```


# Structure of frontend

This project is designed as a single-page application. This means all game "screens" (Home, Create Room, Lobby, Game) live inside the same index.html file.

## How it Works

1. Everything is in one place: Instead of separate .html files, we use <div> containers (like <div class="join-page"> or <div class="lobby-page">) to represent different screens.

2. State Management: We use JavaScript (main.js) to show or hide these containers based on what the user is doing.

3. Why we do this: It  allows the Socket.io connection to stay alive throughout the entire session without disconnecting.

# Important stuff

If you change anything in the server.js file, you must restart the server to see your changes. Also, don't forget to save your progress by pressing Ctrl + S.

## To do

1. vote logic
2. nigh and day logic
3. player vote out logic
4. werewolf vote to kill logic
5. other character logic  
6. ..

---

# Game Logic Overview

## Variables

```javascript
let discussionCountdownInterval = null;
let discussionEndTimeout = null;
```

## Socket Events

```javascript
socket.on('discussion-phase-started', data => {
    // …create timer element…
    if (discussionCountdownInterval) clearInterval(discussionCountdownInterval);
    if (discussionEndTimeout) clearTimeout(discussionEndTimeout);

    discussionCountdownInterval = setInterval(…);
    discussionEndTimeout = setTimeout(…, data.duration * 1000);

    showSkipButton();
});

socket.on('discussion-skipped', () => {
    appendToGameChat("[SYSTEM]: All players skipped! Moving to voting phase…");
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
```

