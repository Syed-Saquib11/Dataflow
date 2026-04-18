const db = require('../database/db');

const DEFAULT_FORMS = [
  {
    title: 'Student Registration',
    description: 'New student enrollment and registration form.',
    category: 'Registration',
    fields: ['Full Name', 'Date of Birth', 'Email', 'Phone', 'Address', 'Guardian Name', 'Previous School'],
    sourceType: 'students',
    isSystem: 1
  },
  {
    title: 'Leave Application',
    description: 'Student leave request application form.',
    category: 'Leave',
    fields: ['Student Name', 'Student ID', 'Leave From', 'Leave To', 'Reason', 'Class Teacher Approval'],
    sourceType: 'manual',
    isSystem: 1
  },
  {
    title: 'Feedback Form',
    description: 'Course and teacher feedback form.',
    category: 'Feedback',
    fields: ['Course Rating', 'Teaching Quality', 'Study Material', 'Suggestions', 'Overall Experience'],
    sourceType: 'test_results',
    isSystem: 1
  },
  {
    title: 'Exam Hall Ticket Request',
    description: 'Request form for exam hall ticket issuance.',
    category: 'Exam',
    fields: ['Student Name', 'Roll Number', 'Exam Name', 'Course'],
    sourceType: 'manual',
    isSystem: 1
  }
];

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve(this);
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

async function initFormsTables() {
  await run(`
    CREATE TABLE IF NOT EXISTS forms_catalog (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      category TEXT DEFAULT 'General',
      fieldsJson TEXT,
      sourceType TEXT DEFAULT 'manual',
      isSystem INTEGER DEFAULT 0,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS form_submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      formId INTEGER NOT NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      payloadJson TEXT,
      FOREIGN KEY(formId) REFERENCES forms_catalog(id) ON DELETE CASCADE
    )
  `);

  const countRow = await get('SELECT COUNT(*) AS total FROM forms_catalog');
  if (!countRow || countRow.total === 0) {
    for (const form of DEFAULT_FORMS) {
      await run(
        `INSERT INTO forms_catalog (title, description, category, fieldsJson, sourceType, isSystem) VALUES (?, ?, ?, ?, ?, ?)`,
        [form.title, form.description, form.category, JSON.stringify(form.fields), form.sourceType, form.isSystem]
      );
    }
  }
}

async function getFormsWithSubmissions() {
  const forms = await all('SELECT * FROM forms_catalog ORDER BY createdAt DESC');
  if (!forms.length) return [];

  const studentsCountRow = await get('SELECT COUNT(*) AS total FROM students');
  const testsCountRow = await get('SELECT COUNT(*) AS total FROM test_results');
  const manualRows = await all(`
    SELECT formId, COUNT(*) AS total
    FROM form_submissions
    GROUP BY formId
  `);
  const manualCounts = new Map(manualRows.map((row) => [row.formId, row.total]));

  return forms.map((form) => {
    let submissionCount = 0;
    if (form.sourceType === 'students') submissionCount = studentsCountRow?.total || 0;
    else if (form.sourceType === 'test_results') submissionCount = testsCountRow?.total || 0;
    else submissionCount = manualCounts.get(form.id) || 0;

    return {
      id: form.id,
      title: form.title,
      description: form.description || '',
      category: form.category || 'General',
      fields: safeParseArray(form.fieldsJson),
      sourceType: form.sourceType || 'manual',
      isSystem: Boolean(form.isSystem),
      createdAt: form.createdAt,
      submissionCount
    };
  });
}

function safeParseArray(value) {
  try {
    const parsed = JSON.parse(value || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) {
    return [];
  }
}

async function deleteForm(id) {
  const form = await get('SELECT id, isSystem FROM forms_catalog WHERE id = ?', [id]);
  if (!form) return { success: false, error: 'Form not found' };
  if (form.isSystem) return { success: false, error: 'System forms cannot be deleted' };

  await run('DELETE FROM forms_catalog WHERE id = ?', [id]);
  return { success: true };
}

async function getStats(todayDateString, uploadedDocsCount = 0) {
  const forms = await getFormsWithSubmissions();
  const totalForms = forms.length + Number(uploadedDocsCount || 0);
  const totalSubmissions = forms.reduce((sum, form) => sum + Number(form.submissionCount || 0), 0);

  const admissionsRow = await get(
    `SELECT COUNT(*) AS total
     FROM students
     WHERE date(joinedAt) = date(?)`,
    [todayDateString]
  );

  return {
    totalForms,
    totalSubmissions,
    admissionFormsToday: admissionsRow?.total || 0
  };
}

module.exports = {
  initFormsTables,
  getFormsWithSubmissions,
  deleteForm,
  getStats
};
