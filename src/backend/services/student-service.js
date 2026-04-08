// src/backend/services/student-service.js
// Business logic lives here. Calls model. Never writes SQL.

const studentModel = require('../models/student-model');

// Auto-generate a student ID like SMS-2024-001
function generateStudentId(callback) {
  studentModel.getAllStudents((err, students) => {
    if (err) return callback(err, null);
    const year = new Date().getFullYear();
    const count = students.length + 1;
    const paddedCount = String(count).padStart(3, '0');
    const studentId = `SMS-${year}-${paddedCount}`;
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
  if (!data.phone || !data.phone.trim()) {
    return callback(new Error('Phone number is required'), null);
  }

  generateStudentId((err, studentId) => {
    if (err) return callback(err, null);
    const studentData = { ...data, studentId };
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
