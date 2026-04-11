// src/backend/services/student-service.js
// Business logic lives here. Calls model. Never writes SQL.

const studentModel = require('../models/student-model');
const activityModel = require('../models/activity-model');

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
    studentModel.addStudent(studentData, (err, res) => {
      if (err) return callback(err, null);
      activityModel.logActivity(
        'enrollment',
        `New student enrolled — <span class="act-name">${data.firstName} ${data.lastName}</span>`,
        `${data.class || ''} · Student ID: ${studentId}`,
        'ai-gr'
      );
      callback(null, res);
    });
  });
}

function getAllStudents(callback) {
  studentModel.getAllStudents(callback);
}

function getStudentById(id, callback) {
  studentModel.getStudentById(id, callback);
}

function updateStudent(id, data, callback) {
  studentModel.getStudentById(id, (err, oldData) => {
    if (err || !oldData) {
      // Fallback: if we can't find old data, require firstName
      if (!data.firstName || !data.firstName.trim()) {
        return callback(new Error('First name is required'));
      }
      return studentModel.updateStudent(id, data, callback);
    }
    
    // Merge: incoming data overlays on top of existing record
    // This allows partial updates (e.g. only slotId) without wiping other fields
    const merged = {
      firstName:     data.firstName     ?? oldData.firstName,
      lastName:      data.lastName      ?? oldData.lastName,
      class:         data.class         ?? oldData.class,
      rollNumber:    data.rollNumber    ?? oldData.rollNumber,
      courseId:       data.courseId      !== undefined ? data.courseId : oldData.courseId,
      slotId:        data.slotId        !== undefined ? data.slotId  : oldData.slotId,
      feeStatus:     data.feeStatus     ?? oldData.feeStatus,
      feeAmount:     data.feeAmount     !== undefined ? data.feeAmount : oldData.feeAmount,
      phone:         data.phone         ?? oldData.phone,
      parentName:    data.parentName    ?? oldData.parentName,
      parentPhone:   data.parentPhone   ?? oldData.parentPhone,
      address:       data.address       ?? oldData.address,
      status:        data.status        ?? oldData.status,
      admissionDate: data.admissionDate !== undefined ? data.admissionDate : oldData.admissionDate,
    };

    if (!merged.firstName || !merged.firstName.trim()) {
      return callback(new Error('First name is required'));
    }
    
    studentModel.updateStudent(id, merged, (updErr, res) => {
      if (updErr) return callback(updErr, null);
      
      const isFeeUpdate = oldData.feeStatus !== data.feeStatus;
      const isStatusUpdate = oldData.status !== data.status;
      
      if (isFeeUpdate) {
        const isPaid = data.feeStatus === 'paid';
        activityModel.logActivity(
          isPaid ? 'fee_paid' : 'fee_pending',
          isPaid ? `Fee payment received — <span class="act-name">${data.firstName} ${data.lastName}</span>` : `Fee status marked pending — <span class="act-name">${data.firstName} ${data.lastName}</span>`,
          `${data.class || ''} · ${isPaid ? 'Payment collected' : 'Fee modified'}`,
          isPaid ? 'ai-tl' : 'ai-or' // Teal for paid, Orange for pending
        );
      } else if (isStatusUpdate) {
        const isAct = data.status === 'Active';
        activityModel.logActivity(
          'status_update',
          `Student marked ${isAct ? 'Active' : 'Inactive'} — <span class="act-name">${data.firstName} ${data.lastName}</span>`,
          `${data.class || ''} · Status changed to ${isAct ? 'Active' : 'Inactive'}`,
          isAct ? 'ai-tl' : 'ai-or'
        );
      } else {
        activityModel.logActivity(
          'profile_update',
          `Student profile updated — <span class="act-name">${data.firstName} ${data.lastName}</span>`,
          `${data.class || ''} · Record modified`,
          'ai-pk' // Pink icon
        );
      }
      callback(null, res);
    });
  });
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
