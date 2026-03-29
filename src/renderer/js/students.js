// renderer/js/students.js
// Students module entrypoint for the single-shell router.

'use strict';

// Keep existing implementation by loading the old file logic via copy/paste (next patch will replace).
// This stub exists only to satisfy script loading order during refactor.
window.initStudents = async function initStudents() {
  if (typeof window.initStudentPage === 'function') {
    await window.initStudentPage();
  }
};

