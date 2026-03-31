// src/renderer/js/forms.js
// Forms & Documents module — generates printable HTML stubs for student documents.
'use strict';

let allFormsStudents = [];
let activeFormType   = null;

window.initForms = async function initForms() {
  try {
    allFormsStudents = await window.api.getAllStudents();
  } catch (e) {
    allFormsStudents = [];
  }
  bindFormCards();
};

function bindFormCards() {
  document.getElementById('btn-gen-admission')?.addEventListener('click', () => openPicker('admission'));
  document.getElementById('btn-gen-idcard')?.addEventListener('click', () => openPicker('idcard'));
  document.getElementById('btn-gen-receipt')?.addEventListener('click', () => openPicker('receipt'));
  document.getElementById('btn-export-report')?.addEventListener('click', exportCSV);
  document.getElementById('forms-picker-cancel')?.addEventListener('click', closePicker);
}

// ── Student Picker ────────────────────────────────────────
function openPicker(formType) {
  activeFormType = formType;
  const titles = {
    admission: 'Select student for Admission Form',
    idcard:    'Select student for ID Card',
    receipt:   'Select student for Fee Receipt',
  };
  const picker = document.getElementById('forms-student-picker');
  const titleEl = document.getElementById('forms-picker-title');
  if (picker)  picker.style.display = 'block';
  if (titleEl) titleEl.textContent = titles[formType] || 'Select student';

  renderPickerList(allFormsStudents);

  document.getElementById('forms-picker-search')?.addEventListener('input', function () {
    const q = this.value.toLowerCase().trim();
    const filtered = q
      ? allFormsStudents.filter(s =>
          s.firstName.toLowerCase().includes(q) ||
          s.lastName.toLowerCase().includes(q)  ||
          s.studentId.toLowerCase().includes(q))
      : allFormsStudents;
    renderPickerList(filtered);
  });
}

function closePicker() {
  const picker = document.getElementById('forms-student-picker');
  if (picker) picker.style.display = 'none';
  activeFormType = null;
  const search = document.getElementById('forms-picker-search');
  if (search) search.value = '';
}

function renderPickerList(students) {
  const tbody = document.getElementById('forms-picker-tbody');
  if (!tbody) return;

  if (students.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state" style="padding:12px 0;"><div class="empty-state-icon">👤</div><h3>No students found</h3></div></td></tr>`;
    return;
  }

  tbody.innerHTML = students.map(s => `
    <tr>
      <td><span class="student-id-badge">${escFo(s.studentId)}</span></td>
      <td class="student-name">${escFo(s.firstName)} ${escFo(s.lastName)}</td>
      <td>${escFo(s.class) || '—'}</td>
      <td>${escFo(s.phone) || '—'}</td>
      <td>
        <button class="btn btn-primary btn-sm" onclick="generateFormForStudent(${s.id})">
          Generate
        </button>
      </td>
    </tr>
  `).join('');
}

window.generateFormForStudent = function (id) {
  const student = allFormsStudents.find(s => s.id === id);
  if (!student) { showToast('Student not found.', 'error'); return; }

  let html = '';
  if (activeFormType === 'admission') html = buildAdmissionForm(student);
  if (activeFormType === 'idcard')    html = buildIdCard(student);
  if (activeFormType === 'receipt')   html = buildFeeReceipt(student);

  if (!html) return;

  // Use Electron export dialog to save the HTML file
  window.api.exportHTML(html).then(result => {
    if (result?.ok) {
      showToast('Form saved successfully!', 'success');
    } else if (result?.ok === false && result?.error) {
      showToast('Export failed: ' + result.error, 'error');
    }
    // ok:false and no error means user cancelled — no toast needed
  }).catch(err => showToast('Export error: ' + err, 'error'));

  closePicker();
};

// ── Export CSV ─────────────────────────────────────────────
function exportCSV() {
  if (allFormsStudents.length === 0) {
    showToast('No students to export.', 'info');
    return;
  }
  const header = ['Student ID', 'First Name', 'Last Name', 'Class', 'Roll Number', 'Phone', 'Fee Status', 'Created At'];
  const rows = allFormsStudents.map(s => [
    s.studentId, s.firstName, s.lastName, s.class || '', s.rollNumber || '', s.phone || '', s.feeStatus, s.createdAt || ''
  ]);
  const csv = [header, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = 'students.csv'; a.click();
  URL.revokeObjectURL(url);
  showToast('CSV exported.', 'success');
}

// ── Document Builders ──────────────────────────────────────
function buildAdmissionForm(s) {
  const date = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Admission Form</title>
  <style>body{font-family:Arial,sans-serif;max-width:700px;margin:40px auto;color:#111;}
  h1{text-align:center;color:#e11d48;}table{width:100%;border-collapse:collapse;margin-top:20px;}
  td{padding:8px 12px;border:1px solid #ccc;vertical-align:top;}
  .label{font-weight:bold;background:#f5f5f5;width:35%;}
  .sig{margin-top:60px;display:flex;justify-content:space-between;}
  @media print{body{margin:20px;}}</style></head><body>
  <h1>DATAFLOW Institute</h1>
  <h2 style="text-align:center;margin-top:0;">Admission Form</h2>
  <p style="text-align:right;color:#555;">Date: ${date}</p>
  <table>
    <tr><td class="label">Student ID</td><td>${s.studentId}</td></tr>
    <tr><td class="label">Full Name</td><td>${s.firstName} ${s.lastName}</td></tr>
    <tr><td class="label">Class / Grade</td><td>${s.class || '—'}</td></tr>
    <tr><td class="label">Roll Number</td><td>${s.rollNumber || '—'}</td></tr>
    <tr><td class="label">Phone</td><td>${s.phone || '—'}</td></tr>
    <tr><td class="label">Fee Status</td><td>${s.feeStatus}</td></tr>
  </table>
  <div class="sig">
    <div>Student Signature: ________________</div>
    <div>Administrator: ________________</div>
  </div>
  </body></html>`;
}

function buildIdCard(s) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Student ID Card</title>
  <style>body{font-family:Arial,sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;background:#f0f2f8;}
  .card{width:340px;padding:28px 24px;border-radius:16px;background:#fff;box-shadow:0 4px 24px rgba(0,0,0,.15);text-align:center;}
  h2{color:#e11d48;margin:0 0 4px;}.subtitle{color:#888;font-size:13px;margin-bottom:20px;}
  .avatar{width:72px;height:72px;border-radius:50%;background:#e11d48;color:#fff;font-size:28px;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;}
  .name{font-size:20px;font-weight:700;margin-bottom:4px;} .id{font-size:13px;color:#888;margin-bottom:12px;}
  table{width:100%;font-size:13px;} td{padding:4px 8px;text-align:left;} .lbl{color:#888;font-weight:600;}
  @media print{body{min-height:auto;}}</style></head><body>
  <div class="card">
    <h2>DATAFLOW</h2><div class="subtitle">Student Identity Card</div>
    <div class="avatar">${s.firstName.charAt(0).toUpperCase()}</div>
    <div class="name">${s.firstName} ${s.lastName}</div>
    <div class="id">${s.studentId}</div>
    <table><tr><td class="lbl">Class</td><td>${s.class || '—'}</td></tr>
    <tr><td class="lbl">Roll No.</td><td>${s.rollNumber || '—'}</td></tr>
    <tr><td class="lbl">Phone</td><td>${s.phone || '—'}</td></tr></table>
  </div></body></html>`;
}

function buildFeeReceipt(s) {
  const date = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
  const receiptNo = `REC-${Date.now().toString().slice(-6)}`;
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Fee Receipt</title>
  <style>body{font-family:Arial,sans-serif;max-width:600px;margin:40px auto;color:#111;}
  h1{color:#e11d48;text-align:center;}
  table{width:100%;border-collapse:collapse;margin-top:20px;}
  td{padding:8px 12px;border:1px solid #ccc;} .label{font-weight:bold;background:#f5f5f5;width:40%;}
  .footer{margin-top:40px;text-align:right;font-size:12px;color:#888;}
  .paid-stamp{color:#16a34a;font-size:32px;font-weight:900;border:4px solid #16a34a;display:inline-block;padding:4px 16px;border-radius:4px;transform:rotate(-10deg);margin-top:20px;}
  @media print{body{margin:20px;}}</style></head><body>
  <h1>DATAFLOW Institute</h1>
  <h2 style="text-align:center;">Fee Receipt</h2>
  <p><strong>Receipt No:</strong> ${receiptNo} &nbsp;&nbsp; <strong>Date:</strong> ${date}</p>
  <table>
    <tr><td class="label">Student ID</td><td>${s.studentId}</td></tr>
    <tr><td class="label">Name</td><td>${s.firstName} ${s.lastName}</td></tr>
    <tr><td class="label">Class</td><td>${s.class || '—'}</td></tr>
    <tr><td class="label">Fee Status</td><td>${s.feeStatus}</td></tr>
  </table>
  ${s.feeStatus === 'paid' ? '<div style="text-align:center;margin-top:24px;"><span class="paid-stamp">PAID</span></div>' : ''}
  <div class="footer">This is a computer-generated receipt. No signature required.</div>
  </body></html>`;
}

// ── Helpers ────────────────────────────────────────────────
function escFo(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
