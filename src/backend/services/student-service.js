// src/backend/services/student-service.js
// Business logic lives here. Calls model. Never writes SQL.

const studentModel = require('../models/student-model');

// Auto-generate a student ID like SMS-2026-001
// Uses the HIGHEST existing suffix for this year (not count) so that
// deleting students never causes a UNIQUE constraint collision.
function generateStudentId(callback) {
  studentModel.getAllStudents((err, students) => {
    if (err) return callback(err, null);
    const year = new Date().getFullYear();
    const prefix = `SMS-${year}-`;

    let maxNum = 0;
    (students || []).forEach(s => {
      if (s.studentId && s.studentId.startsWith(prefix)) {
        const num = parseInt(s.studentId.slice(prefix.length), 10);
        if (!isNaN(num) && num > maxNum) maxNum = num;
      }
    });

    const studentId = `${prefix}${String(maxNum + 1).padStart(3, '0')}`;
    callback(null, studentId);
  });
}

// Add a new student (validates + generates ID)
function addStudent(data, callback) {
  // Basic validation
  if (!data.firstName || !data.firstName.trim()) {
    return callback(new Error('First name is required'), null);
  }
  if (!data.lastName || !data.lastName.trim()) {
    return callback(new Error('Last name is required'), null);
  }
  // Phone number is optional for student records.
  const phone = data.phone ? data.phone.trim() : '';

  generateStudentId((err, studentId) => {
    if (err) return callback(err, null);
    const studentData = { ...data, phone, studentId };
    studentModel.addStudent(studentData, callback);
  });
}

function getAllStudents(callback) {
  studentModel.getAllStudents(callback);
}

function getStudentById(id, callback) {
  studentModel.getStudentById(id, callback);
}

function updateStudent(id, data, callback) {
  if (!data.firstName || !data.firstName.trim()) {
    return callback(new Error('First name is required'));
  }
  studentModel.updateStudent(id, data, callback);
}

function deleteStudent(id, callback) {
  studentModel.deleteStudent(id, callback);
}

function searchStudents(query, callback) {
  if (!query || !query.trim()) {
    return studentModel.getAllStudents(callback);
  }
  studentModel.searchStudents(query.trim(), callback);
}

module.exports = {
  addStudent,
  getAllStudents,
  getStudentById,
  updateStudent,
  deleteStudent,
  searchStudents
};
