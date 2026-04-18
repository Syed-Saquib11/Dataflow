// src/backend/services/test-service.js
const testModel = require('../models/test-model');

function getAllTests(callback) {
  testModel.getAllTests((err, rows) => {
    if (err) return callback(err);
    
    // Parse JSON string for questions
    const mappedRows = rows.map(row => {
      try {
        row.questions = row.questions ? JSON.parse(row.questions) : [];
      } catch (e) {
        row.questions = [];
      }
      return row;
    });
    
    callback(null, mappedRows);
  });
}

function getTestById(id, callback) {
  testModel.getTestById(id, (err, row) => {
    if (err) return callback(err);
    if (!row) return callback(new Error('Test not found'));

    try {
      row.questions = row.questions ? JSON.parse(row.questions) : [];
    } catch (e) {
      row.questions = [];
    }
    callback(null, row);
  });
}

function createTest(data, callback) {
  // Stringify questions array before saving
  let questionsStr = '[]';
  try {
    questionsStr = data.questions ? JSON.stringify(data.questions) : '[]';
  } catch (e) {
    questionsStr = '[]';
  }

  const testPayload = {
    courseId: data.courseId,
    title: data.title,
    description: data.description,
    questions: questionsStr,
    duration: data.duration,
    color: data.color,
    status: data.status
  };

  testModel.createTest(testPayload, (err, result) => {
    if (err) return callback(err);
    callback(null, result);
  });
}

function deleteTest(id, callback) {
  testModel.deleteTest(id, (err, result) => {
    if (err) return callback(err);
    callback(null, result);
  });
}

function updateTest(id, data, callback) {
  let questionsStr = '[]';
  try {
    questionsStr = data.questions ? JSON.stringify(data.questions) : '[]';
  } catch (e) {
    questionsStr = '[]';
  }

  const testPayload = {
    title: data.title,
    questions: questionsStr,
    status: data.status
  };

  testModel.updateTest(id, testPayload, (err, result) => {
    if (err) return callback(err);
    callback(null, result);
  });
}

function getGradesOverview(callback) {
  testModel.getGradesOverviewData((err, rows) => {
    if (err) return callback(err);

    // Group rows by student to format nicely 
    // Return structure: { studentDbId: ..., firstName, lastName, studentId, courseName, tests: [{testId, testTitle, score, submittedAt}] }
    
    let grouped = {};
    rows.forEach(r => {
      if (!grouped[r.studentDbId]) {
        grouped[r.studentDbId] = {
          studentDbId: r.studentDbId,
          firstName: r.firstName,
          lastName: r.lastName,
          studentId: r.studentId, // SMS ID
          rollNumber: r.rollNumber,
          courseName: r.courseName,
          resultId: r.resultId, // Default/Most recent resultId for the student row
          tests: []
        };
      }
      if (r.testId) {
        grouped[r.studentDbId].tests.push({
          resultId: r.resultId,
          testId: r.testId,
          testTitle: r.testTitle,
          score: r.score,
          submittedAt: r.submittedAt
        });
        // Keep the most recent resultId at the top level for the summary row
        grouped[r.studentDbId].resultId = r.resultId;
      }
    });

    const resultList = Object.values(grouped);
    callback(null, resultList);
  });
}

function deleteTestResult(id, callback) {
  testModel.deleteTestResult(id, callback);
}

function executeFormImport(results, callback) {
  testModel.bulkInsertTestResults(results, callback);
}

module.exports = {
  getAllTests,
  getTestById,
  createTest,
  deleteTest,
  updateTest,
  getGradesOverview,
  executeFormImport,
  deleteTestResult
};
