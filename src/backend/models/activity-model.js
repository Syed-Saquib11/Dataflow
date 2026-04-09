// src/backend/models/activity-model.js
const db = require('../database/db');

function initActivityTable() {
  db.run(`
    CREATE TABLE IF NOT EXISTS activity_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT,
      title TEXT,
      subtitle TEXT,
      iconType TEXT,
      timestamp TEXT DEFAULT (datetime('now'))
    )
  `, (err) => {
    if (err) console.error('Error creating activity_log table:', err.message);
    else console.log('Activity table ready.');
  });
}

function logActivity(type, title, subtitle, iconType, callback) {
  const sql = `
    INSERT INTO activity_log (type, title, subtitle, iconType)
    VALUES (?, ?, ?, ?)
  `;
  db.run(sql, [type, title, subtitle, iconType], function(err) {
    if (callback) callback(err, this ? this.lastID : null);
  });
}

function getRecentActivities(limit, callback) {
  const sql = `SELECT * FROM activity_log ORDER BY timestamp DESC LIMIT ?`;
  db.all(sql, [limit], (err, rows) => {
    if (callback) callback(err, rows);
  });
}

module.exports = {
  initActivityTable,
  logActivity,
  getRecentActivities
};
