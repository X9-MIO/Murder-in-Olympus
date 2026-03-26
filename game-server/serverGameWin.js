const dbFns = require("./databaseFunction");

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

  if (aliveWolves === 0) return "Villagers";
  if (aliveWolves >= aliveVillagers && aliveWolves > 0) return "Werewolf";
  return null;
}

module.exports = { checkGameOver };