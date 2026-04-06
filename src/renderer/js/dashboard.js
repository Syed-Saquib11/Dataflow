// src/renderer/js/dashboard.js
// Dashboard module — live student stats + offline Indian holiday calendar.
// Follows router pattern: initDashboard() / destroyDashboard()
// No DOMContentLoaded, no inline onclick, no direct DB access.
'use strict';

// ── Indian National & Gazetted Holidays (year → array of {month, day, name})
// month is 0-indexed (JS Date convention). Add future years here as needed.
const INDIAN_HOLIDAYS = {
  2025: [
    { month: 0, day: 26, name: 'Republic Day' },
    { month: 1, day: 26, name: 'Maha Shivratri' },
    { month: 2, day: 14, name: 'Holi' },
    { month: 3, day: 14, name: 'Dr. Ambedkar Jayanti' },
    { month: 3, day: 18, name: 'Good Friday' },
    { month: 4, day: 12, name: 'Buddha Purnima' },
    { month: 7, day: 15, name: 'Independence Day' },
    { month: 9, day: 2, name: 'Gandhi Jayanti' },
    { month: 9, day: 2, name: 'Dussehra' },
    { month: 9, day: 20, name: 'Diwali' },
    { month: 10, day: 5, name: 'Guru Nanak Jayanti' },
    { month: 11, day: 25, name: 'Christmas Day' },
  ],
  2026: [
    { month: 0, day: 26, name: 'Republic Day' },
    { month: 1, day: 15, name: 'Maha Shivratri' },
    { month: 2, day: 3, name: 'Holi' },
    { month: 2, day: 31, name: 'Id-ul-Fitr (Eid)' },
    { month: 3, day: 3, name: 'Good Friday' },
    { month: 3, day: 14, name: 'Dr. Ambedkar Jayanti' },
    { month: 4, day: 31, name: 'Buddha Purnima' },
    { month: 5, day: 7, name: 'Id-ul-Adha (Bakrid)' },
    { month: 7, day: 15, name: 'Independence Day' },
    { month: 8, day: 5, name: 'Janmashtami' },
    { month: 9, day: 2, name: 'Gandhi Jayanti' },
    { month: 9, day: 20, name: 'Dussehra' },
    { month: 10, day: 8, name: 'Diwali' },
    { month: 10, day: 24, name: 'Guru Nanak Jayanti' },
    { month: 11, day: 25, name: 'Christmas Day' },
  ],
};

// ── Calendar state ───────────────────────────────────────────
let _calYear = 0;
let _calMonth = 0;
let _dashboardActive = false; // navigation guard — prevents stale async updates

// ── Init ─────────────────────────────────────────────────────
window.initDashboard = async function initDashboard() {
  _dashboardActive = true;

  // Load student data
  try {
    const students = await window.api.getAllStudents();

    // Guard: user may have navigated away while the IPC call was in flight
    if (!_dashboardActive) return;

    _renderDashStats(students);
    _renderFeeChart(students);
    _renderRecentStudents(students);
    const subtitle = document.getElementById('dash-subtitle');
    if (subtitle) {
      subtitle.textContent = `${students.length} student${students.length !== 1 ? 's' : ''} enrolled`;
    }
  } catch (err) {
    console.error('Dashboard data error:', err);
    if (!_dashboardActive) return; // don't show stale toasts
    if (typeof showToast === 'function') showToast('Dashboard failed to load: ' + err, 'error');
  }

  if (!_dashboardActive) return;

  // Quick action buttons
  _bindQuickActions();

  // Calendar — start on current month
  const now = new Date();
  _calYear = now.getFullYear();
  _calMonth = now.getMonth();
  _renderCalendar();

  document.getElementById('dash-cal-prev')?.addEventListener('click', _calPrev);
  document.getElementById('dash-cal-next')?.addEventListener('click', _calNext);
};

window.destroyDashboard = function destroyDashboard() {
  _dashboardActive = false; // stop any in-flight async updates immediately
  document.getElementById('dash-cal-prev')?.removeEventListener('click', _calPrev);
  document.getElementById('dash-cal-next')?.removeEventListener('click', _calNext);
};

// ── Stats row ─────────────────────────────────────────────────
function _renderDashStats(students) {
  const el = document.getElementById('dash-stats');
  if (!el) return;

  const total = students.length;
  const paid = students.filter(s => s.feeStatus === 'paid').length;
  const pending = students.filter(s => s.feeStatus === 'pending').length;
  const rate = total > 0 ? Math.round((paid / total) * 100) : 0;

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
      <div class="stat-label">Fee Unpaid</div>
      <div class="stat-value warning">${pending}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Collection Rate</div>
      <div class="stat-value">${rate}%</div>
    </div>
  `;
}

// ── Fee status bars ───────────────────────────────────────────
function _renderFeeChart(students) {
  const el = document.getElementById('dash-fee-chart');
  if (!el) return;

  const total = students.length;
  const paid = students.filter(s => s.feeStatus === 'paid').length;
  const pending = total - paid;

  function bar(label, count, color) {
    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
    return `
      <div class="dash-fee-row">
        <div class="dash-fee-meta">
          <span>${label}</span>
          <strong>${count} <span style="font-weight:400;">(${pct}%)</span></strong>
        </div>
        <div class="dash-fee-track">
          <div class="dash-fee-fill" style="width:${pct}%; background:${color};"></div>
        </div>
      </div>
    `;
  }

  el.innerHTML = `
    ${bar('Paid', paid, 'var(--success)')}
    ${bar('Unpaid', pending, 'var(--warning)')}
  `;
}

// ── Recent students table ─────────────────────────────────────
function _renderRecentStudents(students) {
  const tbody = document.getElementById('dash-recent-tbody');
  if (!tbody) return;

  const recent = students.slice(0, 8); // sorted by createdAt DESC from backend

  if (recent.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5">
          <div class="empty-state" style="padding:16px 0;">
            <div class="empty-state-icon">👤</div>
            <h3>No students yet</h3>
          </div>
        </td>
      </tr>`;
    return;
  }

  tbody.innerHTML = recent.map(s => `
    <tr>
      <td><span class="student-id-badge">${_esc(s.studentId)}</span></td>
      <td class="student-name">${_esc(s.firstName)} ${_esc(s.lastName)}</td>
      <td>${_esc(s.class) || '—'}</td>
      <td>${_esc(s.phone) || '—'}</td>
      <td>${_feeBadge(s.feeStatus)}</td>
    </tr>
  `).join('');
}

// ── Quick actions ─────────────────────────────────────────────
function _bindQuickActions() {
  function navTo(page) {
    document.querySelector(`.nav-item[data-page="${page}"]`)
      ?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
  }

  document.getElementById('dash-add-student-btn')?.addEventListener('click', () => {
    navTo('students');
    setTimeout(() => {
      if (typeof window.openStudentModal === 'function') window.openStudentModal(null);
    }, 400);
  });

  document.getElementById('dash-go-courses-btn')?.addEventListener('click', () => navTo('courses'));
  document.getElementById('dash-go-fees-btn')?.addEventListener('click', () => navTo('fees'));
  document.getElementById('dash-go-slots-btn')?.addEventListener('click', () => navTo('slots'));
}

// ── Calendar ──────────────────────────────────────────────────
function _calPrev() {
  _calMonth--;
  if (_calMonth < 0) { _calMonth = 11; _calYear--; }
  _renderCalendar();
}

function _calNext() {
  _calMonth++;
  if (_calMonth > 11) { _calMonth = 0; _calYear++; }
  _renderCalendar();
}

function _renderCalendar() {
  const titleEl = document.getElementById('dash-cal-title');
  const gridEl = document.getElementById('dash-cal-grid');
  const infoEl = document.getElementById('dash-cal-holiday-info');
  if (!titleEl || !gridEl) return;

  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

  titleEl.textContent = `${MONTHS[_calMonth]} ${_calYear}`;

  const today = new Date();
  const todayY = today.getFullYear();
  const todayM = today.getMonth();
  const todayD = today.getDate();

  // Build a map of holiday days for this month/year
  const yearHolidays = INDIAN_HOLIDAYS[_calYear] || [];
  const holidayMap = {};  // day → name
  yearHolidays
    .filter(h => h.month === _calMonth)
    .forEach(h => { holidayMap[h.day] = h.name; });

  const firstDay = new Date(_calYear, _calMonth, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(_calYear, _calMonth + 1, 0).getDate();

  let html = '';

  // Leading empty cells
  for (let i = 0; i < firstDay; i++) {
    html += `<div class="dash-cal-day empty"></div>`;
  }

  // Day cells
  for (let d = 1; d <= daysInMonth; d++) {
    const isToday = (d === todayD && _calMonth === todayM && _calYear === todayY);
    const isHoliday = !!holidayMap[d];
    let cls = 'dash-cal-day';
    if (isToday) cls += ' today';
    if (isHoliday) cls += ' holiday';

    const title = isHoliday ? `title="${_esc(holidayMap[d])}"` : '';
    html += `<div class="${cls}" data-day="${d}" ${title}>${d}</div>`;
  }

  gridEl.innerHTML = html;
  if (infoEl) infoEl.textContent = '';

  // Show holiday name on hover/click
  gridEl.querySelectorAll('.dash-cal-day.holiday').forEach(cell => {
    cell.addEventListener('mouseenter', () => {
      if (infoEl) infoEl.textContent = '🗓 ' + holidayMap[+cell.dataset.day];
    });
    cell.addEventListener('mouseleave', () => {
      if (infoEl) infoEl.textContent = '';
    });
  });

  // Auto-show today's holiday if it's in this month
  if (_calMonth === todayM && _calYear === todayY && holidayMap[todayD]) {
    if (infoEl) infoEl.textContent = '🗓 Today: ' + holidayMap[todayD];
  }
}

// ── Helpers ───────────────────────────────────────────────────
function _feeBadge(status) {
  if (status === 'paid') return '<span class="badge badge-success">Paid</span>';
  if (status === 'pending') return '<span class="badge badge-warning">Unpaid</span>';
  return `<span class="badge">${_esc(status)}</span>`;
}

function _esc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}