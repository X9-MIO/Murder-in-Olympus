# Murder in Olympus
A Werewolf hidden in plain sight
Can you survive the night?

## Table of Contents
1. [About](#about)
2. [Technologies](#technologies)

## About
Murder in Olympus is web based game. Its a social deduction group game similar to Among Us or Mafia. Players secretly take on roles and try to figure out who is the werewolf before the werewolves kill everyone else

There are 2 main teams: the Olympians and the werewolves. Every round, a werewolf can wake up at night and select someone to eliminate. The olympians would wake up at the end of the round and try to deduce who the werewolves are. 
In order to figure out who the werewolf is, players can talk to each other through a text chat in order to come up with strategies and win the game. Werewolves would also have a private text chat to allow them to come up with their own strategies as well.

Players would then vote who they think is the werewolf using a voting system. The narrator would then reveal if the person who was eliminated was truly a werewolf or an Olympian.

## Technologies
- **Frontend:** React, TailwindCSS
- **Backend:** Node.js, Express
- **Database:** PostgreSQL + Django
- **Realtime:** Socket.io


# Murder in Olympus
A Werewolf hidden in plain sight. Can you survive the night?

## Table of Contents
1. [About](#about)
2. [Technologies](#technologies)
3. [How to Run](#how-to-run)

## About
Murder in Olympus is a web-based social deduction game similar to Among Us or Mafia. Players secretly take on roles and try to figure out who the werewolves are before the werewolves eliminate the Olympians.

### Gameplay
- **Olympians:** Must use deduction and strategy to find the hidden threats.
- **Werewolves:** Wake up each night to eliminate a player and use a private chat to coordinate.
- **Discussion & Voting:** During the day, all players use a global text chat to discuss strategies. Players then vote on who to eliminate.
- **Victory:** The Narrator reveals the identity of the eliminated player, and the game continues until one team remains.

## Technologies
- **Frontend:** Vanilla JavaScript, Vite, TailwindCSS
- **Backend:** Python, Django
- **Game Server:** Node.js, Express
- **Realtime:** Socket.io
- **Database:** PostgreSQL (Production) / SQLite (Development)

## How to Run

### 1. Prerequisites
Ensure you have the following installed:
- [Node.js](https://nodejs.org/) (v18 or higher)
- [Python](https://www.python.org/) (v3.10 or higher)

### 2. Setup
Clone the repository and switch to the development branch:
```bash
git clone <your-repo-url>
cd Murder-in-Olympus
git checkout set-up-node
```
Run the automated setup script to create the virtual environment and install all dependencies

- **Windows:** Double-click setup.bat or run .\setup.bat in your terminal.

### 3. Make the room

To start all three servers (Django, Node, and Vite) simultaneously in one terminal window, run:
```bash
npm start
```
### 4. Local Network / Mobile Play
The project is configured to be accessible on your local Wi-Fi:

1. Ensure your phone and PC are on the same Wi-Fi network.

2. Find the Network IP address shown in the terminal when Vite starts (e.g., http://192.168.0.x:5173).

3. Open that address on your mobile browser to play!
