// src/backend/services/course-service.js
const courseModel = require('../models/course-model');
const activityModel = require('../models/activity-model');

async function bulkSaveCourses(courses) {
  // We need to compare with old courses to see what was added/removed for logging
  try {
    const oldCourses = await courseModel.getAllCourses();
    const result = await courseModel.bulkSaveCourses(courses);

    // Logging Logic
    if (courses.length > oldCourses.length) {
      // Something was added
      const lastAdded = courses[courses.length - 1];
      activityModel.logActivity(
        'system',
        'Course Added',
        `New course "${lastAdded.name}" (${lastAdded.code}) registered`,
        'assignment'
      );
    } else if (courses.length < oldCourses.length) {
      // Something was removed
      activityModel.logActivity(
        'system',
        'Course Removed',
        'A course module was removed from the syllabus',
        'delete'
      );
    }

    return result;
  } catch (err) {
    throw err;
  }
}

module.exports = {
  getAllCourses: courseModel.getAllCourses,
  bulkSaveCourses
};
