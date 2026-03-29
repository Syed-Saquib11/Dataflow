// src/backend/database/db.js
// ONLY handles DB connection. NO queries here.

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', '..', '..', 'data', 'database.db');

// Ensure data directory exists
const fs = require('fs');
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Failed to connect to database:', err.message);
  } else {
    console.log('Connected to SQLite database at:', dbPath);
    // Enable foreign keys
    db.run('PRAGMA foreign_keys = ON');
  }
});

module.exports = db;
