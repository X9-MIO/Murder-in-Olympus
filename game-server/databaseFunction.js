const db = require("./db");
console.log("databaseFunctions.js loaded");

// Thin data-access layer for rooms, players, chat, votes, and night actions.
// Room functions
function createRoom(roomCode, numberOfPlayers, creatorSocketId, roleConfig = null) {
  const configJson = roleConfig ? JSON.stringify(roleConfig) : null;
  db.prepare(`
    INSERT INTO rooms (room_code, number_of_players, creator_socket_id, game_phase, role_config)
    VALUES (?, ?, ?, 'lobby', ?)
  `).run(roomCode, numberOfPlayers, creatorSocketId, configJson);
}

function getRoleConfig(roomCode) {
  const room = db.prepare(`SELECT role_config FROM rooms WHERE room_code = ?`).get(roomCode);
  if (!room || !room.role_config) return null;
  try {
    return JSON.parse(room.role_config);
  } catch (e) {
    return null;
  }
}

function getRoom(roomCode) {
  return db.prepare(`
    SELECT * FROM rooms
    WHERE room_code = ?
  `).get(roomCode);
}

function deleteRoom(roomCode) {
  db.prepare(`DELETE FROM players WHERE room_code = ?`).run(roomCode);
  db.prepare(`DELETE FROM messages WHERE room_code = ?`).run(roomCode);
  db.prepare(`DELETE FROM votes WHERE room_code = ?`).run(roomCode);
  db.prepare(`DELETE FROM night_actions WHERE room_code = ?`).run(roomCode);
  db.prepare(`DELETE FROM rooms WHERE room_code = ?`).run(roomCode);
}

function updateRoomPhase(roomCode, phase) {
  db.prepare(`
    UPDATE rooms
    SET game_phase = ?
    WHERE room_code = ?
  `).run(phase, roomCode);
}

function setWinner(roomCode, winner) {
  db.prepare(`
    UPDATE rooms
    SET winner = ?
    WHERE room_code = ?
  `).run(winner, roomCode);
}

function resetRoomForNewGame(roomCode) {
  db.prepare(`
    UPDATE rooms
    SET game_phase = 'lobby', winner = NULL
    WHERE room_code = ?
  `).run(roomCode);

  db.prepare(`
    UPDATE players
    SET role = 'Villager', eliminated = 0
    WHERE room_code = ?
  `).run(roomCode);

  db.prepare(`DELETE FROM votes WHERE room_code = ?`).run(roomCode);
  db.prepare(`DELETE FROM night_actions WHERE room_code = ?`).run(roomCode);
}

// Player functions
function addPlayer(roomCode, socketId, displayName, isHost = 0) {
  // 1. Delete any leftover ghost records for this socket connection first
  db.prepare(`
    DELETE FROM players 
    WHERE socket_id = ?
  `).run(socketId);

  // 2. Insert the fresh player into the new room securely
  db.prepare(`
    INSERT INTO players (room_code, socket_id, display_name, is_host)
    VALUES (?, ?, ?, ?)
  `).run(roomCode, socketId, displayName, isHost);
}

function getPlayers(roomCode) {
  return db.prepare(`
    SELECT * FROM players
    WHERE room_code = ?
    ORDER BY id ASC
  `).all(roomCode);
}

function getAlivePlayers(roomCode) {
  return db.prepare(`
    SELECT * FROM players
    WHERE room_code = ? AND eliminated = 0
    ORDER BY id ASC
  `).all(roomCode);
}

function getHostPlayer(roomCode) {
  return db.prepare(`
    SELECT * FROM players
    WHERE room_code = ? AND is_host = 1
    LIMIT 1
  `).get(roomCode);
}

function removePlayer(socketId) {
  db.prepare(`
    DELETE FROM players
    WHERE socket_id = ?
  `).run(socketId);
}

function getPlayerBySocket(socketId) {
  return db.prepare(`
    SELECT * FROM players
    WHERE socket_id = ?
  `).get(socketId);
}

function assignRole(socketId, role) {
  db.prepare(`
    UPDATE players
    SET role = ?
    WHERE socket_id = ?
  `).run(role, socketId);
}

function eliminatePlayerByName(roomCode, displayName) {
  db.prepare(`
    UPDATE players
    SET eliminated = 1
    WHERE room_code = ? AND display_name = ?
  `).run(roomCode, displayName);
}

// Message functions
function saveMessage(roomCode, socketId, displayName, message) {
  db.prepare(`
    INSERT INTO messages (room_code, socket_id, display_name, message)
    VALUES (?, ?, ?, ?)
  `).run(roomCode, socketId, displayName, message);
}

function getMessages(roomCode) {
  return db.prepare(`
    SELECT * FROM messages
    WHERE room_code = ?
    ORDER BY created_at ASC, id ASC
  `).all(roomCode);
}

// Vote functions
function saveVote(roomCode, voterSocketId, targetName, roundNumber = 1) {
  const existing = db.prepare(`
    SELECT * FROM votes
    WHERE room_code = ? AND voter_socket_id = ? AND round_number = ?
  `).get(roomCode, voterSocketId, roundNumber);

  if (existing) {
    db.prepare(`
      UPDATE votes
      SET target_name = ?
      WHERE room_code = ? AND voter_socket_id = ? AND round_number = ?
    `).run(targetName, roomCode, voterSocketId, roundNumber);
  } else {
    db.prepare(`
      INSERT INTO votes (room_code, voter_socket_id, target_name, round_number)
      VALUES (?, ?, ?, ?)
    `).run(roomCode, voterSocketId, targetName, roundNumber);
  }
}

function getVotes(roomCode, roundNumber = 1) {
  return db.prepare(`
    SELECT * FROM votes
    WHERE room_code = ? AND round_number = ?
    ORDER BY id ASC
  `).all(roomCode, roundNumber);
}

function clearVotes(roomCode, roundNumber = 1) {
  db.prepare(`
    DELETE FROM votes
    WHERE room_code = ? AND round_number = ?
  `).run(roomCode, roundNumber);
}

// Night action functions
function saveNightAction(roomCode, socketId, playerName, role, actionType, targetName, roundNumber = 1) {
  db.prepare(`
    INSERT INTO night_actions (room_code, socket_id, player_name, role, action_type, target_name, round_number)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(roomCode, socketId, playerName, role, actionType, targetName, roundNumber);
}

function getNightActions(roomCode, roundNumber = 1) {
  return db.prepare(`
    SELECT * FROM night_actions
    WHERE room_code = ? AND round_number = ?
    ORDER BY id ASC
  `).all(roomCode, roundNumber);
}

function clearNightActions(roomCode, roundNumber = 1) {
  db.prepare(`
    DELETE FROM night_actions
    WHERE room_code = ? AND round_number = ?
  `).run(roomCode, roundNumber);
}


function useInspection(socketId) {
  db.prepare(`
    UPDATE players 
    SET inspections_left = inspections_left - 1 
    WHERE socket_id = ?
  `).run(socketId);
}

module.exports = {
  createRoom,
  getRoom,
  getRoleConfig,
  deleteRoom,
  updateRoomPhase,
  setWinner,
  resetRoomForNewGame,
  addPlayer,
  getPlayers,
  getAlivePlayers,
  getHostPlayer,
  removePlayer,
  getPlayerBySocket,
  assignRole,
  eliminatePlayerByName,
  saveMessage,
  getMessages,
  saveVote,
  getVotes,
  clearVotes,
  saveNightAction,
  getNightActions,
  clearNightActions,
  useInspection
};