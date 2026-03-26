const dbFns = require("./databaseFunction");
const { runtimeRooms, createRuntimeRoom, getAlivePlayers, getAlivePlayerNames, buildVoteCount, majorityChoice } = require("./serverState");
const { checkGameOver } = require("./serverGameWin");

// Night phase setup: clear actions, push role-specific action prompts, and arm timeout.
function startNightPhase(io, roomCode) {
  const room = dbFns.getRoom(roomCode);
  if (!room) return;

  createRuntimeRoom(roomCode);
  dbFns.updateRoomPhase(roomCode, "night");
  dbFns.clearNightActions(roomCode);

  io.to(roomCode).emit("night-phase-started", { message: "Night falls. Everyone goes to sleep." });

  // Build alive-player context once for this phase tick.
  const alivePlayers = getAlivePlayers(roomCode).map((p) => ({ 
      id: p.socket_id, 
      name: p.display_name, 
      role: p.role,
      inspections_left: p.inspections_left 
  }));
  
  const wolves = alivePlayers.filter((p) => p.role === "Wolf");
  const healers = alivePlayers.filter((p) => p.role === "Healer");
  const seers = alivePlayers.filter((p) => p.role === "Seer");
  const littleGs = alivePlayers.filter((p) => p.role === "Little Girl");
  const artemises = alivePlayers.filter((p) => p.role === "Artemis");

  const allNames = alivePlayers.map((p) => p.name);
  const nonWolfNames = alivePlayers.filter((p) => p.role !== "Wolf").map((p) => p.name);

  // Seers can only act while they still have inspections remaining.
  seers.forEach(seer => {
      if (seer.inspections_left > 0) {
          io.to(seer.id).emit("night-action-required", { 
              type: "seer-inspect", 
              targets: allNames.filter((n) => n !== seer.name), 
              message: `Who do you want to inspect? (${seer.inspections_left} left)`, 
              duration: 20 
          });
      }
  });

  healers.forEach(healer => io.to(healer.id).emit("night-action-required", { type: "healer-save", targets: allNames.filter((n) => n !== healer.name), message: "Who do you want to protect?", duration: 20 }));  wolves.forEach(wolf => io.to(wolf.id).emit("night-action-required", { type: "werewolf-kill", targets: nonWolfNames, message: "Who is your target tonight?", duration: 20 }));
  littleGs.forEach(littleG => io.to(littleG.id).emit("night-action-required", { type: "little-girl-peek", targets: ["Click to Peek at the Wolf"], message: "Peek at the wolves? (Careful, they might see you)", duration: 10 + Math.floor(Math.random() * 10) }));
  artemises.forEach(artemis => io.to(artemis.id).emit("night-action-required", { type: "Artemis-shoot", targets: ["Do not shoot", ...allNames.filter((n) => n !== artemis.name)], message: "Take a shot. (Hit an innocent and you die instead)", duration: 20 }));

  runtimeRooms[roomCode].actionTimeout = setTimeout(() => {
    runtimeRooms[roomCode].actionTimeout = null;
    revealNightActions(io, roomCode);
  }, 20000); 
}

// Resolve all submitted night actions, apply deaths/saves, and transition state.
function revealNightActions(io, roomCode) {
  const room = dbFns.getRoom(roomCode);
  if (!room) return;

  dbFns.updateRoomPhase(roomCode, "action-reveal");
  const actions = dbFns.getNightActions(roomCode);
  const alivePlayers = dbFns.getAlivePlayers(roomCode);

  let deaths = []; 
  const wolfVotes = actions.filter((a) => a.action_type === "werewolf-kill").map((a) => a.target_name).filter(Boolean);
  const healerSaves = actions.filter((a) => a.action_type === "healer-save").map(a => a.target_name).filter(Boolean);

  let wolfKill = majorityChoice(wolfVotes);
  if (wolfKill && healerSaves.includes(wolfKill)) wolfKill = null; 
  if (wolfKill) deaths.push(wolfKill);

  const artemisActions = actions.filter(a => a.action_type === "Artemis-shoot");
  artemisActions.forEach(action => {
    if (action.target_name && action.target_name !== "Do not shoot") {
      const target = alivePlayers.find(p => p.display_name === action.target_name);
      const shooter = alivePlayers.find(p => p.display_name === action.player_name); 
      if (target && shooter) {
        if (target.role === "Wolf") deaths.push(target.display_name); 
        else deaths.push(shooter.display_name); 
      }
    }
  });

  deaths = [...new Set(deaths)]; 
  deaths.forEach(name => dbFns.eliminatePlayerByName(roomCode, name));

  healerSaves.forEach(savedName => {
    if (savedName && savedName !== "Do not heal") {
      const savedPlayer = alivePlayers.find(p => p.display_name === savedName);
      if (savedPlayer) io.to(savedPlayer.socket_id).emit("you-were-saved");
    }
  });

  let morningMessage = "Morning has arrived. ";
  if (deaths.length > 0) morningMessage += `${deaths.join(" and ")} didn't wake up.`;
  else morningMessage += "Everyone survived the night.";

  io.to(roomCode).emit("night-actions-revealed", { actions, eliminatedPlayers: deaths, message: morningMessage });
  dbFns.clearNightActions(roomCode);

  const aliveAfterNight = dbFns.getAlivePlayers(roomCode);
  const aliveNonWolves = aliveAfterNight.filter(p => p.role !== "Wolf");

  // Hidden mechanic: 10% chance a random non-wolf is infected into Wolf role.
  if (aliveNonWolves.length > 0 && Math.random() < 0.10) {
     const turnedPlayer = aliveNonWolves[Math.floor(Math.random() * aliveNonWolves.length)];
     dbFns.assignRole(turnedPlayer.socket_id, "Wolf");
     io.to(turnedPlayer.socket_id).emit("you-turned-wolf");
  }

  const winner = checkGameOver(roomCode);
  if (winner) {
    dbFns.setWinner(roomCode, winner);
    dbFns.updateRoomPhase(roomCode, "game_over");
    setTimeout(() => {
      io.to(roomCode).emit("game-over", { winner, message: winner === "Villagers" ? "The wolves are dead. The village wins." : "The village has fallen. Wolves win." });
    }, 8000);
    return;
  }

  setTimeout(() => { startDiscussionPhase(io, roomCode); }, 10000);
}

// Start daytime discussion/voting timer.
function startDiscussionPhase(io, roomCode) {
  const room = dbFns.getRoom(roomCode);
  if (!room) return;

  createRuntimeRoom(roomCode);
  dbFns.updateRoomPhase(roomCode, "discussion");
  dbFns.clearVotes(roomCode);

  setTimeout(() => {
    io.to(roomCode).emit("discussion-phase-started", { players: getAlivePlayerNames(roomCode), duration: 90 });
    runtimeRooms[roomCode].discussionTimer = setTimeout(() => { endVotingPhase(io, roomCode); }, 90000);
  }, 2000);
}

// Tally votes, eliminate result (or skip on tie), then check win condition.
function endVotingPhase(io, roomCode) {
  const room = dbFns.getRoom(roomCode);
  if (!room) return;

  const votes = dbFns.getVotes(roomCode);
  let voteCount = {};

  if (votes.length === 0) voteCount["skip"] = 1;
  else voteCount = buildVoteCount(votes);

  let eliminated = Object.keys(voteCount).reduce((a, b) => voteCount[a] > voteCount[b] ? a : b);
  const maxVotes = voteCount[eliminated];
  const tiedOptions = Object.keys(voteCount).filter((key) => voteCount[key] === maxVotes);

  if (tiedOptions.length > 1) eliminated = "skip";
  if (eliminated !== "skip") dbFns.eliminatePlayerByName(roomCode, eliminated);

  io.to(roomCode).emit("player-eliminated", { name: eliminated, voteCount: voteCount[eliminated] });

  const winner = checkGameOver(roomCode);
  if (winner) {
    dbFns.setWinner(roomCode, winner);
    dbFns.updateRoomPhase(roomCode, "game_over");
    setTimeout(() => {
      io.to(roomCode).emit("game-over", { winner, message: winner === "Villagers" ? "The wolves are dead. The village wins." : "The village has fallen. Wolves win." });
    }, 6000);
    return;
  }

  setTimeout(() => { startNightPhase(io, roomCode); }, 5000);
}

module.exports = { startNightPhase, endVotingPhase };