// src/renderer/js/fees.js
// Fees module — shows all students with fee status; allows toggling paid/pending.
'use strict';

let allFeesStudents = [];

window.initFees = async function initFees() {
  await loadFeesStudents();
  bindFeesFilters();
};

async function loadFeesStudents() {
  try {
    allFeesStudents = await window.api.getAllStudents();
    renderFeesTable(allFeesStudents);
    renderFeesStats(allFeesStudents);
    const subtitle = document.getElementById('fees-subtitle');
    if (subtitle) subtitle.textContent = `${allFeesStudents.length} student${allFeesStudents.length !== 1 ? 's' : ''}`;
  } catch (err) {
    showToast('Failed to load fee records: ' + err, 'error');
  }
}

function renderFeesStats(students) {
  const el = document.getElementById('fees-stats');
  if (!el) return;

  const total   = students.length;
  const paid    = students.filter(s => s.feeStatus === 'paid').length;
  const pending = total - paid;
  const rate    = total > 0 ? Math.round((paid / total) * 100) : 0;

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
      <div class="stat-value">${rate}%</div>
    </div>
  `;
}

function renderFeesTable(students) {
  const tbody   = document.getElementById('fees-tbody');
  const counter = document.getElementById('fees-count');
  if (!tbody) return;

  if (counter) counter.textContent = `${students.length} student${students.length !== 1 ? 's' : ''}`;

  if (students.length === 0) {
    tbody.innerHTML = `
      <tr><td colspan="6">
        <div class="empty-state">
          <div class="empty-state-icon">💳</div>
          <h3>No students found</h3>
        </div>
      </td></tr>
    `;
    return;
  }

  tbody.innerHTML = students.map(s => {
    const isPaid = s.feeStatus === 'paid';
    return `
      <tr data-id="${s.id}">
        <td><span class="student-id-badge">${escF(s.studentId)}</span></td>
        <td class="student-name">${escF(s.firstName)} ${escF(s.lastName)}</td>
        <td>${escF(s.class) || '—'}</td>
        <td>${escF(s.phone) || '—'}</td>
        <td>${feeBadge(s.feeStatus)}</td>
        <td>
          <button class="btn btn-sm ${isPaid ? 'btn-ghost' : 'btn-primary'}"
            onclick="toggleFeeStatus(${s.id}, '${isPaid ? 'pending' : 'paid'}', this)">
            ${isPaid ? 'Mark Pending' : 'Mark Paid'}
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

window.toggleFeeStatus = async function (id, newStatus, btn) {
  btn.disabled = true;
  btn.textContent = 'Saving…';

  const student = allFeesStudents.find(s => s.id === id);
  if (!student) { showToast('Student not found.', 'error'); return; }

  try {
    await window.api.updateStudent(id, { ...student, feeStatus: newStatus });
    showToast(`Fee status updated to "${newStatus}".`, 'success');
    await loadFeesStudents();
  } catch (err) {
    showToast('Failed to update fee status: ' + err, 'error');
    btn.disabled = false;
  }
};

function bindFeesFilters() {
  const search    = document.getElementById('fees-search');
  const feeFilter = document.getElementById('fees-filter');

  function apply() {
    const q   = (search?.value || '').toLowerCase().trim();
    const fee = feeFilter?.value || '';

    let results = allFeesStudents;
    if (q) results = results.filter(s =>
      s.firstName.toLowerCase().includes(q) ||
      s.lastName.toLowerCase().includes(q)  ||
      s.studentId.toLowerCase().includes(q)
    );
    if (fee) results = results.filter(s => s.feeStatus === fee);
    renderFeesTable(results);
  }

  search?.addEventListener('input', apply);
  feeFilter?.addEventListener('change', apply);
}

// ── Helpers ───────────────────────────────────────────────
function feeBadge(status) {
  if (status === 'paid')    return '<span class="badge badge-success">Paid</span>';
  if (status === 'pending') return '<span class="badge badge-warning">Pending</span>';
  return `<span class="badge">${escF(status)}</span>`;
}

function escF(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
