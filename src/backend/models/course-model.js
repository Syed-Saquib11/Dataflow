const db = require('../database/db');

db.run(`
  CREATE TABLE IF NOT EXISTS courses (
    id          INTEGER PRIMARY KEY,
    name        TEXT NOT NULL,
    code        TEXT,
    level       TEXT,
    days        TEXT,
    time        TEXT,
    dur         TEXT,
    topics      TEXT,
    gradientKey TEXT,
    createdAt   TEXT DEFAULT CURRENT_TIMESTAMP
  )
`);

function getAllCourses() {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM courses ORDER BY createdAt ASC', [], (err, rows) => {
      if (err) return reject(err);
      // Parse topics JSON and rebuild gradient object for renderer
      const COURSE_GRADIENTS = {
        blue: { key: 'blue', grad: 'linear-gradient(135deg,#5b6ef5 0%,#7c52e8 100%)', dot: '#5b6ef5', tagBg: 'rgba(91,110,245,.1)', tagC: '#4f5bd5' },
        teal: { key: 'teal', grad: 'linear-gradient(135deg,#1ec99e 0%,#17a98a 100%)', dot: '#1ec99e', tagBg: 'rgba(30,201,158,.1)', tagC: '#0e9b7a' },
        red: { key: 'red', grad: 'linear-gradient(135deg,#f87171 0%,#f97316 100%)', dot: '#f97316', tagBg: 'rgba(249,115,22,.1)', tagC: '#d97706' },
        orange: { key: 'orange', grad: 'linear-gradient(135deg,#fb923c 0%,#f59e0b 100%)', dot: '#fb923c', tagBg: 'rgba(251,146,60,.1)', tagC: '#d97706' },
        sky: { key: 'sky', grad: 'linear-gradient(135deg,#38bdf8 0%,#6366f1 100%)', dot: '#38bdf8', tagBg: 'rgba(56,189,248,.1)', tagC: '#0284c7' },
        purple: { key: 'purple', grad: 'linear-gradient(135deg,#a78bfa 0%,#ec4899 100%)', dot: '#a78bfa', tagBg: 'rgba(167,139,250,.1)', tagC: '#7c3aed' },
      };
      resolve(rows.map(r => ({
        id: r.id,
        name: r.name,
        code: r.code,
        level: r.level,
        days: r.days,
        time: r.time,
        dur: r.dur,
        topics: JSON.parse(r.topics || '[]'),
        g: COURSE_GRADIENTS[r.gradientKey] || COURSE_GRADIENTS.blue,
      })));
    });
  });
}

// Bulk replace — mirrors the old JSON save behaviour exactly
function bulkSaveCourses(courses) {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run('BEGIN TRANSACTION');
      db.run('DELETE FROM courses');
      const stmt = db.prepare(`
        INSERT INTO courses (id, name, code, level, days, time, dur, topics, gradientKey)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const c of courses) {
        stmt.run(
          c.id, c.name, c.code || '', c.level || 'Beginner',
          c.days || '', c.time || '', c.dur || '',
          JSON.stringify(c.topics || []),
          c.g?.key || 'blue'
        );
      }
      stmt.finalize();
      db.run('COMMIT', (err) => {
        if (err) reject(err);
        else resolve({ ok: true });
      });
    });
  });
}

module.exports = { getAllCourses, bulkSaveCourses };