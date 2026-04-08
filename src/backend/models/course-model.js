// ═══════════════════════════════════════════════════════════
//  COURSE MODEL
//  Uses shared db.js — never opens its own connection.
//  NOTE: Courses are currently stored as JSON on disk via
//  main.js for UI flexibility. This model handles the
//  SQLite courses table for future enrollment linking.
// ═══════════════════════════════════════════════════════════

const db = require('../database/db');

// Create table on first load
db.run(`
  CREATE TABLE IF NOT EXISTS courses (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL,
    description TEXT,
    createdAt   TEXT DEFAULT CURRENT_TIMESTAMP
  )
`);

function getAllCourses() {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM courses ORDER BY name ASC', [], (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function addCourse(data) {
  return new Promise((resolve, reject) => {
    db.run(
      'INSERT INTO courses (name, description) VALUES (?, ?)',
      [data.name, data.description || ''],
      function (err) {
        if (err) reject(err);
        else resolve({ id: this.lastID });
      }
    );
  });
}

function deleteCourse(id) {
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM courses WHERE id = ?', [id], function (err) {
      if (err) reject(err);
      else resolve({ success: true });
    });
  });
}

module.exports = { getAllCourses, addCourse, deleteCourse };