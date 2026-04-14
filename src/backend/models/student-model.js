// src/backend/models/student-model.js
// ALL student SQL queries live here. Nothing else.

const db = require('../database/db');
const feeModel = require('./fee-model');

// Create students table if it doesn't exist
function initStudentsTable() {
  db.run(`
    CREATE TABLE IF NOT EXISTS students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      studentId TEXT UNIQUE NOT NULL,
      firstName TEXT NOT NULL,
      lastName TEXT NOT NULL,
      class TEXT,
      rollNumber TEXT,
      courseId INTEGER,
      slotId TEXT,
      feeStatus TEXT DEFAULT 'pending',
      feeAmount INTEGER,
      phone TEXT,
      parentName TEXT,
      parentPhone TEXT,
      address TEXT,
      status TEXT DEFAULT 'Active',
      admissionDate TEXT,
      createdAt TEXT DEFAULT (datetime('now'))
    )
  `, (err) => {
    if (err) {
      console.error('Error creating students table:', err.message);
    } else {
      console.log('Students table ready.');
      // Patch existing tables (ignore errors if columns already exist)
      db.run(`ALTER TABLE students ADD COLUMN parentName TEXT`, () => {});
      db.run(`ALTER TABLE students ADD COLUMN parentPhone TEXT`, () => {});
      db.run(`ALTER TABLE students ADD COLUMN address TEXT`, () => {});
      db.run(`ALTER TABLE students ADD COLUMN status TEXT DEFAULT 'Active'`, () => {});
      db.run(`ALTER TABLE students ADD COLUMN feeAmount INTEGER`, () => {});
      db.run(`ALTER TABLE students ADD COLUMN admissionDate TEXT`, () => {});
      
      // Initialize the new fees tables
      feeModel.initFeesTable();

      // MIGRATION: Fix duplicate roll numbers for active students
      db.all(`SELECT id, rollNumber FROM students WHERE status = 'Active' AND rollNumber IS NOT NULL AND rollNumber != '' ORDER BY id ASC`, [], (err, rows) => {
        if (!err && rows && rows.length > 0) {
          const seen = new Set();
          let maxRoll = 0;
          
          rows.forEach(r => {
             const val = parseInt(r.rollNumber, 10);
             if (!isNaN(val) && val > maxRoll) {
               maxRoll = val;
             }
          });

          let nextRoll = maxRoll + 1;
          const updates = [];
          rows.forEach(r => {
            if (seen.has(r.rollNumber)) {
               updates.push({ id: r.id, newRoll: String(nextRoll++) });
            } else {
               seen.add(r.rollNumber);
            }
          });

          const createIndexAndMigrateFees = () => {
             db.run(`CREATE UNIQUE INDEX IF NOT EXISTS idx_roll_active ON students(rollNumber) WHERE status = 'Active' AND rollNumber IS NOT NULL AND rollNumber != '';`, () => {});
             migrateOldFees();
          };

          if (updates.length > 0) {
            const stmt = db.prepare(`UPDATE students SET rollNumber = ? WHERE id = ?`);
            updates.forEach(u => stmt.run([u.newRoll, u.id]));
            stmt.finalize(() => {
               createIndexAndMigrateFees();
            });
          } else {
             createIndexAndMigrateFees();
          }
        } else {
           db.run(`CREATE UNIQUE INDEX IF NOT EXISTS idx_roll_active ON students(rollNumber) WHERE status = 'Active' AND rollNumber IS NOT NULL AND rollNumber != '';`, () => {});
           migrateOldFees();
        }
      });
      
      function migrateOldFees() {
        setTimeout(() => {
          db.all('SELECT id, feeAmount, feeStatus, admissionDate FROM students', [], (err, rows) => {
            if(!err && rows) {
              rows.forEach(r => {
                feeModel.ensureFeeRecord(r.id, r.feeAmount || 0, r.admissionDate || new Date().toISOString().slice(0, 10), r.feeStatus, () => {});
              });
            }
          });
        }, 1000);
      }
    }
  });
}

// INSERT a new student
function addStudent(student, callback) {
  const {
    studentId, firstName, lastName,
    class: studentClass, rollNumber,
    courseId, slotId, feeStatus, feeAmount, phone,
    parentName, parentPhone, address, status, admissionDate
  } = student;

  const sql = `
    INSERT INTO students
      (studentId, firstName, lastName, class, rollNumber, courseId, slotId, feeStatus, feeAmount, phone, parentName, parentPhone, address, status, admissionDate)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.run(sql, [
    studentId, firstName, lastName,
    studentClass, rollNumber,
    courseId != null ? courseId : null, slotId != null && slotId !== '' ? slotId : null,
    feeStatus || 'pending', feeAmount || 0, phone,
    parentName, parentPhone, address, status || 'Active', admissionDate
  ], function (err) {
    if (err) return callback(err, null);
    const newStudentId = this.lastID;
    
    // Create the fee track for the new student
    feeModel.ensureFeeRecord(newStudentId, feeAmount || 0, admissionDate, (feeErr) => {
      // Even if fee creation errors out (rare), return student ID so UI continues
      callback(null, { id: newStudentId, studentId });
    });
  });
}

// SELECT all students
function getAllStudents(callback) {
  const sql = `
    SELECT s.*, f.totalAmount as trueFeeAmount, f.status as trueFeeStatus
    FROM students s
    LEFT JOIN fees f ON s.id = f.studentId
    ORDER BY s.createdAt DESC
  `;
  db.all(sql, [], (err, rows) => {
    if (err) return callback(err, null);
    // Replace legacy fee columns with normalized table values if present
    const mappedRows = rows.map(r => {
      if (r.trueFeeAmount != null) r.feeAmount = r.trueFeeAmount;
      if (r.trueFeeStatus != null) r.feeStatus = r.trueFeeStatus;
      delete r.trueFeeAmount;
      delete r.trueFeeStatus;
      return r;
    });
    callback(null, mappedRows);
  });
}

// SELECT one student by ID
function getStudentById(id, callback) {
  const sql = `
    SELECT s.*, f.totalAmount as trueFeeAmount, f.status as trueFeeStatus
    FROM students s
    LEFT JOIN fees f ON s.id = f.studentId
    WHERE s.id = ?
  `;
  db.get(sql, [id], (err, row) => {
    if (err) return callback(err, null);
    if (row && row.trueFeeAmount != null) {
      row.feeAmount = row.trueFeeAmount;
      row.feeStatus = row.trueFeeStatus;
      delete row.trueFeeAmount;
      delete row.trueFeeStatus;
    }
    callback(null, row);
  });
}

// UPDATE a student
function updateStudent(id, student, callback) {
  const {
    firstName, lastName,
    class: studentClass, rollNumber,
    courseId, slotId, feeStatus, feeAmount, phone,
    parentName, parentPhone, address, status, admissionDate
  } = student;

  const sql = `
    UPDATE students
    SET firstName = ?, lastName = ?, class = ?, rollNumber = ?,
        courseId = ?, slotId = ?, feeStatus = ?, feeAmount = ?, phone = ?,
        parentName = ?, parentPhone = ?, address = ?, status = ?, admissionDate = ?
    WHERE id = ?
  `;

  db.run(sql, [
    firstName, lastName,
    studentClass, rollNumber,
    courseId != null ? courseId : null, slotId != null && slotId !== '' ? slotId : null,
    feeStatus, feeAmount || 0, phone,
    parentName, parentPhone, address, status, admissionDate,
    id
  ], function (err) {
    if (err) return callback(err);
    
    // Also update basic corresponding info in fee model via ensure or update
    feeModel.ensureFeeRecord(id, feeAmount || 0, admissionDate, (feeErr, feeRow) => {
       // Only update if it exists
       if(!feeErr && feeRow) {
          feeModel.updateFeeRecord(id, { totalAmount: feeAmount || 0, dueDate: admissionDate, notes: feeRow.notes }, () => {
             callback(null, { changes: this.changes });
          });
       } else {
         callback(null, { changes: this.changes });
       }
    });
  });
}

// DELETE a student
function deleteStudent(id, callback) {
  const sql = `DELETE FROM students WHERE id = ?`;
  db.run(sql, [id], function (err) {
    if (err) return callback(err);
    callback(null, { changes: this.changes });
  });
}

// SEARCH students by name or roll number
function searchStudents(query, callback) {
  const like = `%${query}%`;
  const sql = `
    SELECT s.*, f.totalAmount as trueFeeAmount, f.status as trueFeeStatus
    FROM students s
    LEFT JOIN fees f ON s.id = f.studentId
    WHERE s.firstName LIKE ?
       OR s.lastName LIKE ?
       OR s.rollNumber LIKE ?
       OR s.studentId LIKE ?
    ORDER BY s.firstName ASC
  `;
  db.all(sql, [like, like, like, like], (err, rows) => {
    if (err) return callback(err, null);
    const mappedRows = rows.map(r => {
      if (r.trueFeeAmount != null) r.feeAmount = r.trueFeeAmount;
      if (r.trueFeeStatus != null) r.feeStatus = r.trueFeeStatus;
      delete r.trueFeeAmount;
      delete r.trueFeeStatus;
      return r;
    });
    callback(null, mappedRows);
  });
}

function checkRollNumberExists(rollNumber, excludeId, callback) {
  const sql = `SELECT id, firstName, lastName FROM students WHERE rollNumber = ? AND status = 'Active' AND id != ? LIMIT 1`;
  db.get(sql, [rollNumber, excludeId || -1], (err, row) => {
    callback(err, row);
  });
}

module.exports = {
  initStudentsTable,
  addStudent,
  getAllStudents,
  getStudentById,
  updateStudent,
  deleteStudent,
  searchStudents,
  checkRollNumberExists
};
