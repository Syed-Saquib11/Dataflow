// src/renderer/js/slots.js
// Slot Management module — add & delete time slots via IPC.
'use strict';

let allSlots = [];

window.initSlots = async function initSlots() {
  await loadSlots();
  bindAddSlotButton();
};

// ── Load & Render ────────────────────────────────────────
async function loadSlots() {
  try {
    allSlots = await window.api.getSlots();
    renderSlots(allSlots);
    updateSlotStats(allSlots);
  } catch (err) {
    showToast('Failed to load slots: ' + err, 'error');
  }
}

function renderSlots(slots) {
  const tbody   = document.getElementById('slots-tbody');
  const counter = document.getElementById('slots-count');
  const subtitle = document.getElementById('slots-subtitle');
  if (!tbody) return;

  if (counter) counter.textContent = `${slots.length} slot${slots.length !== 1 ? 's' : ''}`;
  if (subtitle) subtitle.textContent = `${slots.length} slot${slots.length !== 1 ? 's' : ''} scheduled`;

  if (slots.length === 0) {
    tbody.innerHTML = `
      <tr><td colspan="7">
        <div class="empty-state">
          <div class="empty-state-icon">📅</div>
          <h3>No slots yet</h3>
          <p>Click "Add Slot" to create your first time slot.</p>
        </div>
      </td></tr>
    `;
    return;
  }

  tbody.innerHTML = slots.map(s => `
    <tr data-id="${s.id}">
      <td><strong>${escS(s.name)}</strong></td>
      <td>${escS(s.days)}</td>
      <td>${escS(s.startTime)}</td>
      <td>${escS(s.endTime)}</td>
      <td>${escS(s.subject) || '—'}</td>
      <td style="font-size:12px; color:var(--text-secondary);">${formatDate(s.createdAt)}</td>
      <td>
        <div class="action-cell">
          <button class="btn btn-danger btn-sm" onclick="deleteSlotById(${s.id})">Delete</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function updateSlotStats(slots) {
  const el = document.getElementById('slots-stats');
  if (!el) return;

  // Count unique days mentioned across all slots
  const allDaysText = slots.map(s => s.days || '').join(' ');
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const activeDays = dayNames.filter(d => allDaysText.includes(d)).length;

  el.innerHTML = `
    <div class="stat-card">
      <div class="stat-label">Total Slots</div>
      <div class="stat-value accent">${slots.length}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Active Days</div>
      <div class="stat-value">${activeDays}</div>
    </div>
  `;
}

// ── Add Slot button ───────────────────────────────────────
function bindAddSlotButton() {
  document.getElementById('btn-add-slot')?.addEventListener('click', openAddSlotModal);
}

function openAddSlotModal() {
  const root = document.getElementById('modal-root');
  root.innerHTML = `
    <div class="modal-overlay" id="slot-modal-overlay">
      <div class="modal">
        <div class="modal-header">
          <h3 class="modal-title">Add New Slot</h3>
          <button class="modal-close" id="slot-modal-close">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-grid">
            <div class="form-group">
              <label class="form-label">Slot Name *</label>
              <input class="form-input" id="slot-name" type="text" placeholder="e.g. Morning Batch A" />
            </div>
            <div class="form-group">
              <label class="form-label">Days *</label>
              <input class="form-input" id="slot-days" type="text" placeholder="e.g. Mon, Wed, Fri" />
            </div>
            <div class="form-group">
              <label class="form-label">Start Time *</label>
              <input class="form-input" id="slot-start" type="time" />
            </div>
            <div class="form-group">
              <label class="form-label">End Time *</label>
              <input class="form-input" id="slot-end" type="time" />
            </div>
            <div class="form-group" style="grid-column: 1 / -1;">
              <label class="form-label">Subject / Course</label>
              <input class="form-input" id="slot-subject" type="text" placeholder="e.g. Mathematics" />
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" id="slot-modal-cancel">Cancel</button>
          <button class="btn btn-primary" id="slot-modal-save">Add Slot</button>
        </div>
      </div>
    </div>
  `;

  document.getElementById('slot-modal-close').addEventListener('click', closeSlotModal);
  document.getElementById('slot-modal-cancel').addEventListener('click', closeSlotModal);
  document.getElementById('slot-modal-overlay').addEventListener('click', e => {
    if (e.target === e.currentTarget) closeSlotModal();
  });
  document.getElementById('slot-modal-save').addEventListener('click', handleSaveSlot);
  setTimeout(() => document.getElementById('slot-name')?.focus(), 50);
}

async function handleSaveSlot() {
  const name    = document.getElementById('slot-name')?.value.trim();
  const days    = document.getElementById('slot-days')?.value.trim();
  const start   = document.getElementById('slot-start')?.value;
  const end     = document.getElementById('slot-end')?.value;
  const subject = document.getElementById('slot-subject')?.value.trim();

  if (!name)  { showToast('Slot name is required.', 'error'); return; }
  if (!days)  { showToast('Days are required.', 'error'); return; }
  if (!start) { showToast('Start time is required.', 'error'); return; }
  if (!end)   { showToast('End time is required.', 'error'); return; }

  const saveBtn = document.getElementById('slot-modal-save');
  saveBtn.disabled = true;
  saveBtn.textContent = 'Saving…';

  try {
    await window.api.addSlot({ name, days, startTime: start, endTime: end, subject });
    showToast('Slot added successfully.', 'success');
    closeSlotModal();
    await loadSlots();
  } catch (err) {
    showToast('Failed to add slot: ' + err, 'error');
    saveBtn.disabled = false;
    saveBtn.textContent = 'Add Slot';
  }
}

function closeSlotModal() {
  document.getElementById('modal-root').innerHTML = '';
}

// ── Delete ────────────────────────────────────────────────
window.deleteSlotById = async function (id) {
  if (!confirm('Delete this slot? This cannot be undone.')) return;
  try {
    await window.api.deleteSlot(id);
    showToast('Slot deleted.', 'success');
    await loadSlots();
  } catch (err) {
    showToast('Failed to delete slot: ' + err, 'error');
  }
};

// ── Helpers ───────────────────────────────────────────────
function escS(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDate(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch { return iso; }
}
