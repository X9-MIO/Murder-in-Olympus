const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");

const dbPath = path.join(__dirname, "game.db");
console.log("Opening SQLite DB at:", dbPath);

const db = new Database(dbPath);

// Enable Foreign Key support explicitly
db.pragma('foreign_keys = ON');

// 1. Rooms (MUST be created first so other tables can link to it)
db.prepare(`
  CREATE TABLE IF NOT EXISTS rooms (
    room_code TEXT PRIMARY KEY,
    number_of_players INTEGER NOT NULL,
    creator_socket_id TEXT NOT NULL,
    game_phase TEXT NOT NULL DEFAULT 'lobby',
    winner TEXT DEFAULT NULL,
    role_config TEXT DEFAULT NULL
  )
`).run();

// 2. Players
db.prepare(`
  CREATE TABLE IF NOT EXISTS players (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    room_code TEXT NOT NULL,
    socket_id TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'Villager',
    eliminated INTEGER NOT NULL DEFAULT 0,
    is_host INTEGER NOT NULL DEFAULT 0,
    inspections_left INTEGER NOT NULL DEFAULT 2,
    FOREIGN KEY (room_code) REFERENCES rooms(room_code)
  )
`).run();

// 3. Messages
db.prepare(`
  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    room_code TEXT NOT NULL,
    socket_id TEXT NOT NULL,
    display_name TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (room_code) REFERENCES rooms(room_code)
  )
`).run();

// 4. Votes
db.prepare(`
  CREATE TABLE IF NOT EXISTS votes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    room_code TEXT NOT NULL,
    voter_socket_id TEXT NOT NULL,
    target_name TEXT NOT NULL,
    round_number INTEGER NOT NULL DEFAULT 1,
    FOREIGN KEY (room_code) REFERENCES rooms(room_code)
  )
`).run();

// 5. Night actions (Typo "prepare" removed from middle of string)
db.prepare(`
  CREATE TABLE IF NOT EXISTS night_actions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    room_code TEXT NOT NULL,
    socket_id TEXT NOT NULL,
    player_name TEXT NOT NULL,
    role TEXT NOT NULL,
    action_type TEXT NOT NULL,
    target_name TEXT,
    round_number INTEGER NOT NULL DEFAULT 1,
    FOREIGN KEY (room_code) REFERENCES rooms(room_code)
  )
`).run();

console.log("DB exists after init:", fs.existsSync(dbPath));

module.exports = db;