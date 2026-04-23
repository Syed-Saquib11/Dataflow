// src/backend/models/test-model.js
const db = require('../database/db');

function initTestsTable() {
  db.serialize(() => {
    db.run(`
      CREATE TABLE IF NOT EXISTS tests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        courseId INTEGER,
        title TEXT NOT NULL,
        description TEXT,
        questions TEXT,
        duration INTEGER,
        color TEXT DEFAULT 'blue',
        status TEXT DEFAULT 'DRAFT',
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS test_results (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        testId INTEGER,
        studentId INTEGER,
        score INTEGER,
        answers TEXT,
        submittedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(testId) REFERENCES tests(id) ON DELETE CASCADE
      )
    `);

    // Add googleFormId column if it doesn't exist (safe to run multiple times)
    db.run(`ALTER TABLE tests ADD COLUMN googleFormId TEXT`, (err) => {
      // Ignore "duplicate column" error — just means column already exists
      if (err && !err.message.includes('duplicate column')) {
        console.error('Error adding googleFormId column:', err.message);
      }
    });
  });
}

function getAllTests(callback) {
  const sql = `
    SELECT * FROM tests 
    ORDER BY createdAt DESC
  `;
  db.all(sql, [], callback);
}

function getTestById(id, callback) {
  const sql = `SELECT * FROM tests WHERE id = ?`;
  db.get(sql, [id], callback);
}

function createTest(test, callback) {
  const sql = `
    INSERT INTO tests (courseId, title, description, questions, duration, color, status, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `;
  db.run(sql, [
    test.courseId || null,
    test.title,
    test.description || null,
    test.questions, // expected to be stringified JSON
    test.duration,
    test.color || 'blue',
    test.status || 'DRAFT'
  ], function (err) {
    callback(err, this ? { id: this.lastID } : null);
  });
}

function deleteTest(id, callback) {
  const sql = `DELETE FROM tests WHERE id = ?`;
  db.run(sql, [id], function (err) {
    callback(err, this ? { changes: this.changes } : null);
  });
}

function updateTest(id, test, callback) {
  const sql = `
    UPDATE tests SET
      title = ?,
      questions = ?,
      status = ?
    WHERE id = ?
  `;
  db.run(sql, [
    test.title,
    test.questions,
    test.status,
    id
  ], function(err) {
    callback(err, this ? { changes: this.changes } : null);
  });
}

function bulkInsertTestResults(results, callback) {
  if (!results || results.length === 0) return callback(null, { inserted: 0 });

  db.serialize(() => {
    let inserted = 0;
    db.run('BEGIN TRANSACTION');

    const stmt = db.prepare(`
      INSERT INTO test_results (testId, studentId, score, answers)
      VALUES (?, ?, ?, ?)
    `);

    results.forEach(res => {
      stmt.run([res.testId, res.studentId, res.score, JSON.stringify(res.answers || {})], (err) => {
        if (!err) inserted++;
      });
    });

    stmt.finalize();

    db.run('COMMIT', (err) => {
      if (err) {
        db.run('ROLLBACK');
        return callback(err);
      }
      callback(null, { inserted });
    });
  });
}

function getGradesOverviewData(callback) {
  const sql = `
    SELECT 
      s.id as studentDbId, s.firstName, s.lastName, s.studentId, s.rollNumber, s.courseId,
      c.name as courseName, 
      COALESCE(NULLIF(c.code, ''), c.name, '—') as courseCode,
      tr.id as resultId, tr.score, tr.submittedAt,
      t.id as testId, t.title as testTitle
    FROM students s
    LEFT JOIN test_results tr ON s.id = tr.studentId
    LEFT JOIN tests t ON tr.testId = t.id
    LEFT JOIN courses c ON s.courseId = c.id
    WHERE s.status = 'Active' AND s.courseId IS NOT NULL
    ORDER BY s.firstName, s.lastName, t.createdAt ASC
  `;
  db.all(sql, [], callback);
}

function deleteTestResult(id, callback) {
  const sql = `DELETE FROM test_results WHERE id = ?`;
  db.run(sql, [id], function (err) {
    callback(err, this ? { changes: this.changes } : null);
  });
}

function updateGoogleFormId(id, googleFormId, callback) {
  const sql = `UPDATE tests SET googleFormId = ? WHERE id = ?`;
  db.run(sql, [googleFormId, id], function(err) {
    callback(err, this ? { changes: this.changes } : null);
  });
}

module.exports = {
  initTestsTable,
  getAllTests,
  getTestById,
  createTest,
  deleteTest,
  updateTest,
  updateGoogleFormId,
  bulkInsertTestResults,
  getGradesOverviewData,
  deleteTestResult
};
