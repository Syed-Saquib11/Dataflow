// src/backend/database/db.js
// ONLY handles DB connection. NO queries here.

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// DATA_PATH is set by main.js before anything requires this module.
// Falls back to __dirname-relative path for dev mode (npm start).
const dataDir = global.DATA_PATH || path.join(__dirname, '..', '..', '..', 'data');

const dbPath = path.join(dataDir, 'database.db');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Failed to connect to database:', err.message);
  } else {
    console.log('Connected to SQLite database at:', dbPath);
    db.run('PRAGMA foreign_keys = ON');
  }
});

module.exports = db;