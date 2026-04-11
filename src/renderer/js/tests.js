// src/renderer/js/tests.js
// Tests & Grades module

'use strict';

const TESTS_STORAGE_KEY = 'dataflow-tests-v2';
const GRADES_STORAGE_KEY = 'dataflow-grades-v2';

let testsData = [];
let gradesData = [];
let currentFilter = 'all';

const defaultTests = [
  {
    id: 1,
    title: 'Mid-Term Calculus',
    course: 'Advanced Mathematics',
    color: 'blue',
    status: 'PUBLISHED',
    marks: 100,
    submissions: 3,
    average: 51,
    date: '2025-03-15',
    duration: 90,
    questions: [
      {
        type: 'mcq',
        text: 'What is the derivative of x²?',
        marks: 10,
        options: [
          { text: '2x', isCorrect: true },
          { text: 'x²', isCorrect: false },
          { text: '2', isCorrect: false },
          { text: 'x', isCorrect: false }
        ]
      },
      {
        type: 'mcq',
        text: 'What is ∫2x dx?',
        marks: 10,
        options: [
          { text: 'x² + C', isCorrect: true },
          { text: '2', isCorrect: false },
          { text: 'x', isCorrect: false },
          { text: '2x', isCorrect: false }
        ]
      }
    ]
  },
  {
    id: 2,
    title: 'Physics Quiz 1',
    course: 'Physics Fundamentals',
    color: 'green',
    status: 'PUBLISHED',
    marks: 50,
    submissions: 3,
    average: 47,
    date: '2025-03-20',
    duration: 45
  },
  {
    id: 3,
    title: 'Essay Writing',
    course: 'English Literature',
    color: 'orange',
    status: 'DRAFT',
    marks: 100,
    submissions: 3,
    average: 83,
    date: '2025-04-01',
    duration: 120
  }
];

const defaultGrades = [
  { student: 'Sneha Reddy', studentId: 'MATH2104', course: 'MATH101', test1: 95, test2: 98, assignment: 96, final: 96, grade: 'A+', status: 'Excellent' },
  { student: 'Priya Patel', studentId: 'MATH2102', course: 'MATH101', test1: 88, test2: 90, assignment: 85, final: 88, grade: 'A', status: 'Excellent' },
  { student: 'Aarav Sharma', studentId: 'CS2101', course: 'CS301', test1: 82, test2: 79, assignment: 88, final: 83, grade: 'B+', status: 'Pass' },
  { student: 'Pooja Iyer', studentId: 'CHEM2108', course: 'CHEM102', test1: 87, test2: 92, assignment: 89, final: 89, grade: 'A', status: 'Excellent' },
  { student: 'Karan Singh', studentId: 'CS2105', course: 'CS301', test1: 74, test2: 76, assignment: 80, final: 77, grade: 'B', status: 'Pass' }
];

window.initTests = async function initTests() {
  // Clear old conflicting version if any
  localStorage.removeItem('dataflow-tests');

  testsData = loadData(TESTS_STORAGE_KEY, defaultTests);
  gradesData = loadData(GRADES_STORAGE_KEY, defaultGrades);

  renderDashboard();
  bindEvents();
};

function loadData(key, defaultData) {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch (e) { console.error(e); }
  return defaultData;
}

function saveData(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {}
}

function bindEvents() {
  document.getElementById('btn-add-test')?.addEventListener('click', openTestModal);

  // Tabs
  document.querySelectorAll('.tests-tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.tests-tab-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      currentFilter = e.target.dataset.filter;
      renderTestGrid();
    });
  });

  // Search
  document.getElementById('tests-search')?.addEventListener('input', () => {
    renderTestGrid();
  });

  // Editor Bindings
  document.getElementById('btn-close-editor')?.addEventListener('click', () => {
    document.getElementById('test-editor-overlay').classList.add('hidden');
  });
  
  document.getElementById('btn-export-pdf')?.addEventListener('click', async () => {
    if (!editorWorkingTest) return;
    const btn = document.getElementById('btn-export-pdf');
    const ogText = btn.textContent;
    btn.textContent = "WAIT...";
    try {
      const res = await window.api.exportPDF({ filename: editorWorkingTest.title });
      if (res.ok) {
        if (typeof window.showToast === 'function') window.showToast('PDF saved successfully!', 'success');
        else alert('PDF saved successfully!');
      } else {
        if (res.error !== 'Download canceled') {
          if (typeof window.showToast === 'function') window.showToast('Error: ' + res.error, 'error');
          else alert('Error: ' + res.error);
        }
      }
    } catch(err) {
      console.error(err);
    } finally {
      btn.textContent = ogText;
    }
  });

  document.getElementById('btn-ed-mcq')?.addEventListener('click', () => addEditorQuestion('mcq'));
  document.getElementById('btn-ed-short')?.addEventListener('click', () => addEditorQuestion('short'));
  document.getElementById('btn-ed-long')?.addEventListener('click', () => addEditorQuestion('long'));

  document.getElementById('editor-top-title')?.addEventListener('input', (e) => {
    document.getElementById('paper-title').textContent = e.target.value;
  });
  
  document.getElementById('btn-save-editor')?.addEventListener('click', saveTestEditor);
}

function renderDashboard() {
  renderStats();
  renderTestGrid();
  renderGradesTable();
}

// ── Stats rendering ──────────────────────────────────────
function renderStats() {
  const container = document.getElementById('tests-stats-container');
  if (!container) return;

  const total = testsData.length;
  const published = testsData.filter(t => t.status === 'PUBLISHED').length;
  const totalSub = testsData.reduce((sum, t) => sum + t.submissions, 0);
  const avg = total > 0 ? Math.round(testsData.reduce((sum, t) => sum + t.average, 0) / total) : 0;

  container.innerHTML = `
    <div class="stat-card-elegant">
      <div class="stat-info">
        <span class="stat-title">TOTAL TESTS</span>
        <span class="stat-value">${total}</span>
      </div>
      <div class="stat-icon-wrapper stat-icon-blue">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
      </div>
    </div>
    <div class="stat-card-elegant">
      <div class="stat-info">
        <span class="stat-title">PUBLISHED</span>
        <span class="stat-value">${published}</span>
      </div>
      <div class="stat-icon-wrapper stat-icon-green">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg>
      </div>
    </div>
    <div class="stat-card-elegant">
      <div class="stat-info">
        <span class="stat-title">CLASS AVERAGE</span>
        <span class="stat-value">${avg}</span>
      </div>
      <div class="stat-icon-wrapper stat-icon-purple">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 15l-3 4-4-1 1-4-3-4 4-2 2-4 3 4 4 2-3 4z"/></svg>
      </div>
    </div>
    <div class="stat-card-elegant">
      <div class="stat-info">
        <span class="stat-title">SUBMISSIONS</span>
        <span class="stat-value">${totalSub}</span>
      </div>
      <div class="stat-icon-wrapper stat-icon-yellow">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
      </div>
    </div>
  `;
}

// ── Test Grid rendering ──────────────────────────────────
function renderTestGrid() {
  const container = document.getElementById('tests-grid');
  const searchEl = document.getElementById('tests-search');
  if (!container) return;

  let query = '';
  if (searchEl) query = searchEl.value.toLowerCase().trim();

  let filtered = testsData;
  if (currentFilter !== 'all') {
    filtered = filtered.filter(t => t.status.toLowerCase() === currentFilter);
  }
  if (query) {
    filtered = filtered.filter(t => t.title.toLowerCase().includes(query) || t.course.toLowerCase().includes(query));
  }

  if (filtered.length === 0) {
    container.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--text-muted)">No tests found matching criteria.</div>`;
    return;
  }

  container.innerHTML = filtered.map(t => {
    const isDraft = t.status === 'DRAFT';
    return `
      <div class="test-card">
        <div class="test-header theme-${t.color}">
          <div class="test-title-row">
            <div class="test-title">${esc(t.title)}</div>
            <div class="test-badge">${t.status}</div>
          </div>
          <div class="test-course">${esc(t.course)}</div>
        </div>
        
        <div class="test-stats-grid">
          <div class="test-stat-col">
            <span class="test-stat-val">${t.marks}</span>
            <span class="test-stat-lbl">Marks</span>
          </div>
          <div class="test-stat-col">
            <span class="test-stat-val">${t.submissions}</span>
            <span class="test-stat-lbl">Submissions</span>
          </div>
          <div class="test-stat-col">
            <span class="test-stat-val">${t.average}</span>
            <span class="test-stat-lbl">Average</span>
          </div>
        </div>

        <div class="test-meta">
          <div class="test-meta-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="14" height="14" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            ${esc(t.date)}
          </div>
          <div class="test-meta-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="14" height="14" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            ${t.duration} minutes
          </div>
        </div>

        <div class="test-actions">
          <button class="btn-view" onclick="openTestEditor(${t.id})">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="15" height="15" stroke-width="2.5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            View
          </button>
          <button class="btn-icon-sq" title="Download" onclick="downloadTestPDF(${t.id})">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="14" height="14" stroke-width="2.2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          </button>
          <button class="btn-icon-sq" title="Share">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="14" height="14" stroke-width="2.2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
          </button>
          <button class="btn-icon-sq" title="Delete" onclick="deleteTest(${t.id})">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="14" height="14" stroke-width="2.2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </div>
      </div>
    `;
  }).join('');
}

window.deleteTest = function(id) {
  const root = document.getElementById('modal-root');
  if (!root) return;

  root.innerHTML = `
    <div class="modal-overlay" id="del-overlay">
      <div class="modal" style="width: 400px; padding: 24px;">
        <div style="display:flex; flex-direction:column; gap:8px;">
          <h3 style="font-family:var(--font-display); font-size:18px; font-weight:800; color:var(--danger);">Delete Test</h3>
          <p style="font-size:14px; color:var(--text-secondary); line-height:1.5;">
            Are you sure you want to delete this test? This action cannot be undone and will remove all student submissions.
          </p>
        </div>
        <div style="display:flex; justify-content:flex-end; gap:12px; margin-top:32px;">
          <button class="btn btn-ghost" id="del-cancel">Cancel</button>
          <button class="btn btn-primary" id="del-confirm" style="background:var(--danger); border-color:var(--danger);">Delete</button>
        </div>
      </div>
    </div>
  `;

  const closeFn = () => { root.innerHTML = ''; };
  document.getElementById('del-cancel').addEventListener('click', closeFn);
  document.getElementById('del-overlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeFn();
  });

  document.getElementById('del-confirm').addEventListener('click', () => {
    testsData = testsData.filter(t => t.id !== id);
    saveData(TESTS_STORAGE_KEY, testsData);
    renderDashboard();
    closeFn();
    showToast('Test deleted successfully.', 'success');
  });
};

// ── Grades rendering ─────────────────────────────────────
function renderGradesTable() {
  const tbody = document.getElementById('grades-tbody');
  if (!tbody) return;

  const scoreClass = val => {
    if (val >= 90) return 'score-green';
    if (val >= 80) return 'score-green';
    if (val >= 70) return 'score-blue';
    return 'score-red';
  };

  tbody.innerHTML = gradesData.map(g => {
    const isPass = g.status.toLowerCase() !== 'fail';
    const statusClass = g.status.toLowerCase() === 'excellent' ? 'status-excellent' : 
                        (g.status.toLowerCase() === 'pass' ? 'status-pass' : 'status-fail');

    return `
      <tr>
        <td>
          <div class="student-info">
            <strong>${esc(g.student)}</strong>
            <span>${esc(g.studentId)}</span>
          </div>
        </td>
        <td><span class="course-pill">${esc(g.course)}</span></td>
        <td class="table-grade-text ${scoreClass(g.test1)}">${g.test1}</td>
        <td class="table-grade-text ${scoreClass(g.test2)}">${g.test2}</td>
        <td class="table-grade-text ${scoreClass(g.assignment)}">${g.assignment}</td>
        <td class="table-grade-text" style="color:var(--text-primary);">${g.final}</td>
        <td class="table-grade-text grade-purple">${g.grade}</td>
        <td><span class="status-pill ${statusClass}">${g.status}</span></td>
      </tr>
    `;
  }).join('');
}

// ── Modal Logic ──────────────────────────────────────────
function openTestModal() {
  const root = document.getElementById('modal-root');
  root.innerHTML = `
    <div class="modal-overlay active" id="tm-overlay">
      <div class="modal">
        <div class="modal-header">
          <div>
            <h3 class="modal-title">Create New Test</h3>
            <p style="font-size:13px;color:var(--text-secondary);margin-top:2px;">Fill in the details and add questions below</p>
          </div>
          <button class="modal-close" id="tm-close">✕</button>
        </div>
        
        <div class="modal-body" style="padding-bottom: 0;">
          <span class="section-label" style="margin-top:0;">TEST DETAILS</span>
          
          <div class="form-grid">
            <div class="form-group">
              <label class="form-label">Test Title <span style="color:#ef4444">*</span></label>
              <input class="form-input" id="tm-title" type="text" placeholder="e.g. Mid-Term Calculus" />
            </div>
            <div class="form-group">
              <label class="form-label">Course <span style="color:#ef4444">*</span></label>
              <input class="form-input" id="tm-course" type="text" placeholder="e.g. Advanced Mathematics" />
            </div>
            
            <div class="form-group">
              <label class="form-label">Date <span style="color:#ef4444">*</span></label>
              <input class="form-input" id="tm-date" type="date" />
            </div>
            <div class="form-group">
              <label class="form-label">Duration (minutes) <span style="color:#ef4444">*</span></label>
              <input class="form-input" id="tm-duration" type="number" placeholder="e.g. 90" />
            </div>

            <div class="form-group">
              <label class="form-label">Card Color</label>
              <div class="color-picker" id="tm-colors">
                <div class="color-option bg-blue selected" data-color="blue"></div>
                <div class="color-option bg-green" data-color="green"></div>
                <div class="color-option bg-orange" data-color="orange"></div>
                <div class="color-option bg-purple" data-color="purple"></div>
                <div class="color-option bg-teal" data-color="teal"></div>
                <div class="color-option bg-pink" data-color="pink"></div>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Status</label>
              <div class="form-select-wrapper">
                <select class="form-select" id="tm-status">
                  <option value="DRAFT">Draft</option>
                  <option value="PUBLISHED">Published</option>
                </select>
              </div>
            </div>
          </div>

          <div class="questions-header">
            <span class="section-label">QUESTIONS</span>
            <div class="question-buttons">
              <button class="q-btn" id="btnAddMCQ">+ MCQ</button>
              <button class="q-btn" id="btnAddShort">+ Short Answer</button>
              <button class="q-btn" id="btnAddLong">+ Long Answer</button>
            </div>
          </div>
          
          <div id="tm-questions-container">
            <div class="questions-empty-state" id="tm-empty-state">
              <div class="icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              </div>
              <p>No questions yet. Add questions using the buttons above.</p>
            </div>
            <div class="questions-list" id="tm-q-list" style="display:none;"></div>
          </div>

          <div class="total-marks-row">
            <span>Total Marks: <strong id="tm-total">0</strong></span>
          </div>
        </div>

        <div class="modal-footer" style="border-top: none;">
          <button class="btn btn-ghost" id="tm-cancel">Cancel</button>
          <button class="btn btn-primary" id="tm-save" style="background:var(--accent); border-color:var(--accent);">Save Test</button>
        </div>
      </div>
    </div>
  `;

  // Bind color picker
  document.querySelectorAll('.color-option').forEach(el => {
    el.addEventListener('click', (e) => {
      document.querySelectorAll('.color-option').forEach(c => c.classList.remove('selected'));
      e.target.classList.add('selected');
    });
  });

  // Modal actions
  const closeFn = () => { root.innerHTML = ''; };
  document.getElementById('tm-close').addEventListener('click', closeFn);
  document.getElementById('tm-cancel').addEventListener('click', closeFn);
  document.getElementById('tm-overlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeFn();
  });
  
  // Dynamic question adder
  let totalMarks = 0;
  let qCount = 0;
  const listEl = document.getElementById('tm-q-list');
  const emptyEl = document.getElementById('tm-empty-state');
  const totalEl = document.getElementById('tm-total');

  const addQuestion = (type, defaultMarks) => {
    qCount++;
    totalMarks += defaultMarks;
    totalEl.textContent = totalMarks;
    
    emptyEl.style.display = 'none';
    listEl.style.display = 'flex';
    
    let typeLabel = '';
    if (type === 'mcq') typeLabel = 'Multiple Choice';
    if (type === 'short') typeLabel = 'Short Answer';
    if (type === 'long') typeLabel = 'Long Answer';

    const div = document.createElement('div');
    div.className = 'question-item';

    let optionsHtml = '';
    if (type === 'mcq') {
      optionsHtml = `
        <div class="options-container">
          <label>Options <span>(select correct answer)</span></label>
          <div class="option-row">
            <span class="option-letter">A</span>
            <input class="form-input" style="background:#fff; flex:1;" type="text" value="Option A" />
            <label class="option-radio">
              <input type="radio" name="q${qCount}" checked />
              Correct
            </label>
          </div>
          <div class="option-row">
            <span class="option-letter">B</span>
            <input class="form-input" style="background:#fff; flex:1;" type="text" value="Option B" />
            <label class="option-radio">
              <input type="radio" name="q${qCount}" />
              Correct
            </label>
          </div>
          <div class="option-row">
            <span class="option-letter">C</span>
            <input class="form-input" style="background:#fff; flex:1;" type="text" value="Option C" />
            <label class="option-radio">
              <input type="radio" name="q${qCount}" />
              Correct
            </label>
          </div>
          <div class="option-row">
            <span class="option-letter">D</span>
            <input class="form-input" style="background:#fff; flex:1;" type="text" value="Option D" />
            <label class="option-radio">
              <input type="radio" name="q${qCount}" />
              Correct
            </label>
          </div>
        </div>
      `;
    }

    div.innerHTML = `
      <div class="question-header-row">
        <h4>Q${qCount} — ${typeLabel}</h4>
        <button class="remove-btn" title="Remove question">✕</button>
      </div>
      <div class="question-field">
        <label>Question</label>
        <textarea class="form-input" style="background:#fff;" placeholder=""></textarea>
      </div>
      <div class="question-marks-row">
        <label>Marks:</label>
        <input class="form-input" style="background:#fff;" type="number" value="${defaultMarks}" />
      </div>
      ${optionsHtml}
    `;

    div.querySelector('.remove-btn').addEventListener('click', () => {
      div.remove();
      const currentVal = parseInt(div.querySelector('.question-marks-row input').value) || 0;
      totalMarks = Math.max(0, totalMarks - currentVal);
      totalEl.textContent = totalMarks;
      if (listEl.children.length === 0) {
        listEl.style.display = 'none';
        emptyEl.style.display = 'flex';
      }
    });

    listEl.appendChild(div);
    listEl.scrollTop = listEl.scrollHeight;
  };

  document.getElementById('btnAddMCQ').addEventListener('click', () => addQuestion('mcq', 10));
  document.getElementById('btnAddShort').addEventListener('click', () => addQuestion('short', 10));
  document.getElementById('btnAddLong').addEventListener('click', () => addQuestion('long', 20));

  // Save handler
  document.getElementById('tm-save').addEventListener('click', () => {
    const title = document.getElementById('tm-title').value.trim();
    const course = document.getElementById('tm-course').value.trim();
    const date = document.getElementById('tm-date').value;
    const duration = document.getElementById('tm-duration').value;
    const status = document.getElementById('tm-status').value;
    const color = document.querySelector('.color-option.selected')?.dataset.color || 'blue';

    if (!title || !course || !date || !duration) {
      showToast('Please fill all required fields.', 'error');
      return;
    }

    const newTest = {
      id: Date.now(),
      title,
      course,
      color,
      status,
      marks: totalMarks || 0,
      submissions: 0,
      average: 0,
      date,
      duration: parseInt(duration, 10)
    };

    testsData.unshift(newTest);
    saveData(TESTS_STORAGE_KEY, testsData);
    renderDashboard();
    closeFn();
    showToast('Test created successfully.', 'success');
  });
}

// ── Advanced Test Editor Logic ───────────────────────────
let editorWorkingTest = null;

window.openTestEditor = function(id) {
  const test = testsData.find(t => t.id === id);
  if (!test) return;
  
  editorWorkingTest = JSON.parse(JSON.stringify(test)); // Deep clone
  if (!editorWorkingTest.questions) editorWorkingTest.questions = [];

  // Update Top Nav
  document.getElementById('editor-top-title').value = editorWorkingTest.title;
  
  // Update Paper
  document.getElementById('paper-title').textContent = editorWorkingTest.title;
  document.getElementById('paper-course').textContent = editorWorkingTest.course;
  document.getElementById('paper-date').textContent = editorWorkingTest.date;
  document.getElementById('paper-duration').textContent = editorWorkingTest.duration + " minutes";

  renderEditorQuestions();
  document.getElementById('test-editor-overlay').classList.remove('hidden');
};

function renderEditorQuestions() {
  const listEl = document.getElementById('editor-q-list');
  listEl.innerHTML = editorWorkingTest.questions.map((q, idx) => {
    let typeLabel = '';
    if (q.type === 'mcq') typeLabel = 'MCQ';
    else if (q.type === 'short') typeLabel = 'Short Answer';
    else if (q.type === 'long') typeLabel = 'Long Answer';

    let optionsHtml = '';
    if (q.type === 'mcq') {
       optionsHtml = `<div class="editor-opt-list">` + 
         (q.options || []).map((opt, oIdx) => `
           <div class="editor-opt-row ${opt.isCorrect ? 'correct-opt' : ''}">
             <span class="opt-letter">${String.fromCharCode(65+oIdx)}.</span>
             <input type="text" class="opt-input" value="${esc(opt.text)}" placeholder="Option text" />
             <button class="btn-mark-correct" onclick="toggleOptionCorrect(this)">Mark correct</button>
           </div>
         `).join('')
       + `</div>`;
    }

    return `
      <div class="editor-q-item" data-type="${q.type}">
        <div class="editor-q-header">
          <div class="q-label">
            QUESTION <span class="q-index-num">${idx + 1}</span>
            <span class="q-badge">${typeLabel}</span>
          </div>
          <div class="q-marks-wrap">
            Marks: <input type="number" class="q-marks-input" value="${q.marks}" onchange="updateEditorTotals()" />
            <button class="btn-remove-q" onclick="removeEditorQuestion(this)">✕</button>
          </div>
        </div>
        <textarea class="editor-q-text" placeholder="Enter question text...">${esc(q.text)}</textarea>
        ${optionsHtml}
        ${q.type === 'short' ? `<div class="short-ans-box">Student short answer space</div>` : ''}
        ${q.type === 'long' ? `<div class="short-ans-box long-ans-box">Student long answer space</div>` : ''}
      </div>
    `;
  }).join('');
  updateEditorTotals();
}

window.addEditorQuestion = function(type) {
  if (!editorWorkingTest) return;
  const newQ = {
    type: type,
    text: '',
    marks: type === 'long' ? 20 : 10
  };
  
  if (type === 'mcq') {
    newQ.options = [
      { text: 'Option A', isCorrect: true },
      { text: 'Option B', isCorrect: false },
      { text: 'Option C', isCorrect: false },
      { text: 'Option D', isCorrect: false }
    ];
  }
  
  editorWorkingTest.questions.push(newQ);
  renderEditorQuestions();
  
  // Scroll to bottom
  const canvas = document.querySelector('.editor-canvas');
  if (canvas) {
    setTimeout(() => canvas.scrollTo({ top: canvas.scrollHeight, behavior: 'smooth' }), 50);
  }
};

window.removeEditorQuestion = function(btn) {
  btn.closest('.editor-q-item').remove();
  
  // Re-number
  document.querySelectorAll('.editor-q-item').forEach((el, idx) => {
     const textSpan = el.querySelector('.q-index-num');
     if (textSpan) textSpan.textContent = idx + 1;
  });
  updateEditorTotals();
};

window.toggleOptionCorrect = function(btn) {
  const row = btn.closest('.editor-opt-row');
  row.classList.toggle('correct-opt');
};

window.updateEditorTotals = function() {
  const qItems = document.querySelectorAll('.editor-q-item');
  let total = 0;
  qItems.forEach(el => {
    total += parseInt(el.querySelector('.q-marks-input').value) || 0;
  });
  const count = qItems.length;
  document.getElementById('editor-top-meta').textContent = `${count} questions • ${total} marks`;
  document.getElementById('paper-qcount').textContent = `${count} questions`;
  document.getElementById('paper-marks').textContent = total;
};

window.saveTestEditor = function() {
  if (!editorWorkingTest) return;
  
  editorWorkingTest.title = document.getElementById('editor-top-title').value;
  
  // Scrape DOM for questions state
  const qItems = document.querySelectorAll('.editor-q-item');
  let newQuestions = [];
  let totalMarks = 0;

  qItems.forEach((el) => {
      const textStr = el.querySelector('.editor-q-text').value;
      const marksStr = el.querySelector('.q-marks-input').value;
      const typeStr = el.dataset.type;
      const marks = parseInt(marksStr) || 0;
      totalMarks += marks;

      let options = [];
      if (typeStr === 'mcq') {
         const optRows = el.querySelectorAll('.editor-opt-row');
         optRows.forEach(optRow => {
             options.push({
                 text: optRow.querySelector('.opt-input').value,
                 isCorrect: optRow.classList.contains('correct-opt')
             });
         });
      }
      
      newQuestions.push({
          type: typeStr,
          text: textStr,
          marks: marks,
          options: options
      });
  });

  editorWorkingTest.questions = newQuestions;
  editorWorkingTest.marks = totalMarks;

  // Persist
  const index = testsData.findIndex(t => t.id === editorWorkingTest.id);
  if (index !== -1) testsData[index] = editorWorkingTest;
  saveData(TESTS_STORAGE_KEY, testsData);
  
  renderDashboard(); // Refreshes grid details
  document.getElementById('test-editor-overlay').classList.add('hidden');
  if (typeof window.showToast === 'function') {
     window.showToast('Test updated successfully', 'success');
  } else {
     alert('Test updated successfully');
  }
};

function esc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

window.downloadTestPDF = function(id) {
  openTestEditor(id);
  setTimeout(async () => {
    const test = testsData.find(t => t.id === id);
    if (!test) return;
    try {
      const res = await window.api.exportPDF({ filename: test.title });
      if (res.ok) {
        if (typeof window.showToast === 'function') window.showToast('PDF saved successfully!', 'success');
        else alert('PDF saved successfully!');
      } else {
        if (res.error !== 'Download canceled') {
          if (typeof window.showToast === 'function') window.showToast('Error: ' + res.error, 'error');
          else alert('Error: ' + res.error);
        }
      }
    } catch(err) {
      console.error(err);
    } finally {
      document.getElementById('test-editor-overlay').classList.add('hidden');
    }
  }, 350);
};
