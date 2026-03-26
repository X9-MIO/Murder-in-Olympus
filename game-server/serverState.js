const crypto = require("crypto").webcrypto;
const dbFns = require("./databaseFunction");


const socketToUser = {};     
const runtimeRooms = {};     

function generateRoomCode(length = 6) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  let code = "";
  for (let i = 0; i < length; i++) code += chars[array[i] % chars.length];
  return code;
}

function createRuntimeRoom(roomCode) {
  if (!runtimeRooms[roomCode]) {
    runtimeRooms[roomCode] = { actionQueue: [], actionTimeout: null, discussionTimer: null };
  }
}

function clearRuntimeRoom(roomCode) {
  if (!runtimeRooms[roomCode]) return;
  if (runtimeRooms[roomCode].actionTimeout) clearTimeout(runtimeRooms[roomCode].actionTimeout);
  if (runtimeRooms[roomCode].discussionTimer) clearTimeout(runtimeRooms[roomCode].discussionTimer);
  delete runtimeRooms[roomCode];
}

function createUniqueRoomCode() {
  let code;
  do { code = generateRoomCode(6); } while (dbFns.getRoom(code));
  return code;
}

function getAlivePlayers(roomCode) {
  return dbFns.getPlayers(roomCode).filter((p) => !p.eliminated);
}

function getAlivePlayerNames(roomCode) {
  return getAlivePlayers(roomCode).map((p) => p.display_name);
}

function buildVoteCount(votes) {
  const voteCount = {};
  votes.forEach((vote) => { voteCount[vote.target_name] = (voteCount[vote.target_name] || 0) + 1; });
  return voteCount;
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildRoleList(playerCount, roleConfig = null) {
  if (roleConfig) {
    const roles = [];
    for (let i = 0; i < roleConfig.wolves && roles.length < playerCount; i++) roles.push("Wolf");
    for (let i = 0; i < roleConfig.seers && roles.length < playerCount; i++) roles.push("Seer");
    for (let i = 0; i < roleConfig.healers && roles.length < playerCount; i++) roles.push("Healer");
    for (let i = 0; i < roleConfig.littleGirls && roles.length < playerCount; i++) roles.push("Little Girl");
    for (let i = 0; i < roleConfig.artemis && roles.length < playerCount; i++) roles.push("Artemis");
    while (roles.length < playerCount) roles.push("Villager");
    return shuffle(roles);
  }
  const roles = ["Wolf"];
  if (playerCount >= 5) roles.push("Seer", "Healer");
  if (playerCount >= 6) roles.push("Little Girl");
  if (playerCount >= 7) roles.push("Artemis");
  while (roles.length < playerCount) roles.push("Villager");
  return shuffle(roles);
}

function majorityChoice(names) {
  if (!names || names.length === 0) return null;
  const counts = {};
  for (const n of names) counts[n] = (counts[n] || 0) + 1;
  const max = Math.max(...Object.values(counts));
  const top = Object.entries(counts).filter(([, c]) => c === max).map(([n]) => n);
  return top[Math.floor(Math.random() * top.length)];
}

module.exports = {
  socketToUser, runtimeRooms, createRuntimeRoom, clearRuntimeRoom,
  createUniqueRoomCode, getAlivePlayers, getAlivePlayerNames,
  buildVoteCount, buildRoleList, majorityChoice
};