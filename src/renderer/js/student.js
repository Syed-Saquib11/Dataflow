// src/renderer/js/student.js
// All UI logic for the Students page.
// Talks to backend ONLY via window.api (preload bridge). Never directly.

'use strict';

// ── State ─────────────────────────────────────────────
let allStudents   = [];   // full list from DB
let editingId     = null; // null = adding new, number = editing existing

// ── Init (called by renderer.js after injecting the page HTML) ─
window.initStudentPage = async function () {
  await loadStudents();
  bindSearchAndFilter();
  bindAddButton();
};

// New single-shell entrypoint (router.js expects this).
window.initStudents = window.initStudentPage;

// ── Load & Render Students ────────────────────────────
async function loadStudents() {
  try {
    allStudents = await window.api.getAllStudents();
    renderTable(allStudents);
    renderStats(allStudents);
    updateSubtitle(allStudents.length);
  } catch (err) {
    showToast('Failed to load students: ' + err, 'error');
  }
}

function renderTable(students) {
  const tbody   = document.getElementById('students-tbody');
  const counter = document.getElementById('table-count');
  if (!tbody) return;

  counter.textContent = `${students.length} student${students.length !== 1 ? 's' : ''}`;

  if (students.length === 0) {
    tbody.innerHTML = `
      <tr><td colspan="7">
        <div class="empty-state">
          <div class="empty-state-icon">👤</div>
          <h3>No students found</h3>
          <p>Click "Add Student" to get started.</p>
        </div>
      </td></tr>
    `;
    return;
  }

  tbody.innerHTML = students.map(s => `
    <tr data-id="${s.id}">
      <td><span class="student-id-badge">${esc(s.studentId)}</span></td>
      <td class="student-name">${esc(s.firstName)} ${esc(s.lastName)}</td>
      <td>${esc(s.class) || '—'}</td>
      <td>${esc(s.rollNumber) || '—'}</td>
      <td>${esc(s.phone) || '—'}</td>
      <td>${feeBadge(s.feeStatus)}</td>
      <td>
        <div class="action-cell">
          <button class="btn btn-ghost btn-sm" onclick="openEditModal(${s.id})">Edit</button>
          <button class="btn btn-danger btn-sm" onclick="openDeleteConfirm(${s.id}, '${esc(s.firstName)} ${esc(s.lastName)}')">Delete</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function renderStats(students) {
  const el = document.getElementById('student-stats');
  if (!el) return;

  const total   = students.length;
  const paid    = students.filter(s => s.feeStatus === 'paid').length;
  const pending = students.filter(s => s.feeStatus === 'pending').length;

  el.innerHTML = `
    <div class="stat-card">
      <div class="stat-label">Total Students</div>
      <div class="stat-value accent">${total}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Fee Paid</div>
      <div class="stat-value success">${paid}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Fee Pending</div>
      <div class="stat-value warning">${pending}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Collection Rate</div>
      <div class="stat-value">${total > 0 ? Math.round((paid / total) * 100) : 0}%</div>
    </div>
  `;
}

function updateSubtitle(count) {
  const el = document.getElementById('students-subtitle');
  if (el) el.textContent = `${count} student${count !== 1 ? 's' : ''} enrolled`;
}

// ── Search & Filter ───────────────────────────────────
function bindSearchAndFilter() {
  const searchInput = document.getElementById('search-input');
  const feeFilter   = document.getElementById('filter-fee');

  function applyFilters() {
    const query  = (searchInput?.value || '').toLowerCase().trim();
    const fee    = feeFilter?.value || '';

    let results = allStudents;

    if (query) {
      results = results.filter(s =>
        s.firstName.toLowerCase().includes(query)  ||
        s.lastName.toLowerCase().includes(query)   ||
        (s.rollNumber || '').toLowerCase().includes(query) ||
        s.studentId.toLowerCase().includes(query)
      );
    }

    if (fee) {
      results = results.filter(s => s.feeStatus === fee);
    }

    renderTable(results);
  }

  searchInput?.addEventListener('input', applyFilters);
  feeFilter?.addEventListener('change', applyFilters);
}

// ── ADD Button ────────────────────────────────────────
function bindAddButton() {
  document.getElementById('btn-add-student')?.addEventListener('click', () => {
    openStudentModal(null);
  });
}

// ── Add / Edit Modal ──────────────────────────────────
window.openEditModal = async function (id) {
  try {
    const student = await window.api.getStudentById(id);
    openStudentModal(student);
  } catch (err) {
    showToast('Could not load student data.', 'error');
  }
};

function openStudentModal(student) {
  editingId = student ? student.id : null;
  const isEdit = editingId !== null;

  const modalHtml = `
    <div class="modal-overlay" id="student-modal-overlay">
      <div class="modal">
        <div class="modal-header">
          <h3 class="modal-title">${isEdit ? 'Edit Student' : 'Add New Student'}</h3>
          <button class="modal-close" id="modal-close-btn">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-grid">
            <div class="form-group">
              <label class="form-label">First Name *</label>
              <input class="form-input" id="inp-firstName" type="text" placeholder="Ravi" value="${esc(student?.firstName || '')}" />
            </div>
            <div class="form-group">
              <label class="form-label">Last Name *</label>
              <input class="form-input" id="inp-lastName" type="text" placeholder="Kumar" value="${esc(student?.lastName || '')}" />
            </div>
            <div class="form-group">
              <label class="form-label">Class / Grade</label>
              <input class="form-input" id="inp-class" type="text" placeholder="e.g. 10th, B.Tech" value="${esc(student?.class || '')}" />
            </div>
            <div class="form-group">
              <label class="form-label">Roll Number</label>
              <input class="form-input" id="inp-roll" type="text" placeholder="e.g. 42" value="${esc(student?.rollNumber || '')}" />
            </div>
            <div class="form-group">
              <label class="form-label">Phone *</label>
              <input class="form-input" id="inp-phone" type="tel" placeholder="9876543210" value="${esc(student?.phone || '')}" />
            </div>
            <div class="form-group">
              <label class="form-label">Fee Status</label>
              <select class="form-select" id="inp-fee">
                <option value="pending" ${(!student || student.feeStatus === 'pending') ? 'selected' : ''}>Pending</option>
                <option value="paid"    ${student?.feeStatus === 'paid'    ? 'selected' : ''}>Paid</option>
              </select>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" id="modal-cancel-btn">Cancel</button>
          <button class="btn btn-primary" id="modal-save-btn">
            ${isEdit ? 'Save Changes' : 'Add Student'}
          </button>
        </div>
      </div>
    </div>
  `;

  const root = document.getElementById('modal-root');
  root.innerHTML = modalHtml;

  // Close handlers
  document.getElementById('modal-close-btn').addEventListener('click', closeModal);
  document.getElementById('modal-cancel-btn').addEventListener('click', closeModal);
  document.getElementById('student-modal-overlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeModal();
  });

  // Save handler
  document.getElementById('modal-save-btn').addEventListener('click', handleSaveStudent);

  // Focus first input
  setTimeout(() => document.getElementById('inp-firstName')?.focus(), 50);
}

async function handleSaveStudent() {
  const data = {
    firstName:  document.getElementById('inp-firstName')?.value.trim(),
    lastName:   document.getElementById('inp-lastName')?.value.trim(),
    class:      document.getElementById('inp-class')?.value.trim(),
    rollNumber: document.getElementById('inp-roll')?.value.trim(),
    phone:      document.getElementById('inp-phone')?.value.trim(),
    feeStatus:  document.getElementById('inp-fee')?.value,
  };

  const saveBtn = document.getElementById('modal-save-btn');
  saveBtn.disabled = true;
  saveBtn.textContent = 'Saving…';

  try {
    if (editingId) {
      await window.api.updateStudent(editingId, data);
      showToast('Student updated successfully.', 'success');
    } else {
      await window.api.addStudent(data);
      showToast('Student added successfully.', 'success');
    }
    closeModal();
    await loadStudents();
  } catch (err) {
    showToast(err || 'Something went wrong.', 'error');
    saveBtn.disabled = false;
    saveBtn.textContent = editingId ? 'Save Changes' : 'Add Student';
  }
}

// ── Delete Confirm ────────────────────────────────────
window.openDeleteConfirm = function (id, name) {
  const root = document.getElementById('modal-root');
  root.innerHTML = `
    <div class="modal-overlay" id="delete-modal-overlay">
      <div class="modal" style="width:420px">
        <div class="modal-header">
          <h3 class="modal-title">Delete Student</h3>
          <button class="modal-close" id="del-close-btn">✕</button>
        </div>
        <div class="modal-body">
          <p class="confirm-text">
            Are you sure you want to delete
            <span class="confirm-name">${esc(name)}</span>?
            This action cannot be undone.
          </p>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" id="del-cancel-btn">Cancel</button>
          <button class="btn btn-danger" id="del-confirm-btn">Yes, Delete</button>
        </div>
      </div>
    </div>
  `;

  document.getElementById('del-close-btn').addEventListener('click', closeModal);
  document.getElementById('del-cancel-btn').addEventListener('click', closeModal);
  document.getElementById('delete-modal-overlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeModal();
  });

  document.getElementById('del-confirm-btn').addEventListener('click', async () => {
    const btn = document.getElementById('del-confirm-btn');
    btn.disabled = true;
    btn.textContent = 'Deleting…';
    try {
      await window.api.deleteStudent(id);
      showToast('Student deleted.', 'success');
      closeModal();
      await loadStudents();
    } catch (err) {
      showToast('Delete failed: ' + err, 'error');
      btn.disabled = false;
      btn.textContent = 'Yes, Delete';
    }
  });
};

// ── Helpers ───────────────────────────────────────────
function closeModal() {
  document.getElementById('modal-root').innerHTML = '';
  editingId = null;
}

function feeBadge(status) {
  if (status === 'paid')    return '<span class="badge badge-success">Paid</span>';
  if (status === 'pending') return '<span class="badge badge-warning">Pending</span>';
  return `<span class="badge">${esc(status)}</span>`;
}

// Escape HTML to prevent XSS from DB values
function esc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
