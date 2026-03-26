const dbFns = require("./databaseFunction");

// Returns winner string when game is over, otherwise null.
function checkGameOver(roomCode) {
  const players = dbFns.getPlayers(roomCode);
  if (!players || players.length === 0) return null;

  let aliveWolves = 0; 
  let aliveVillagers = 0;
  
  players.forEach((player) => {
    if (!player.eliminated) {
      if (player.role === "Wolf") aliveWolves++;
      else aliveVillagers++;
    }
  });

  // Villagers win if all wolves are eliminated.
  if (aliveWolves === 0) return "Villagers";
  // Wolves win once they reach parity with living non-wolves.
  if (aliveWolves >= aliveVillagers && aliveWolves > 0) return "Werewolf";
  return null;
}

module.exports = { checkGameOver };