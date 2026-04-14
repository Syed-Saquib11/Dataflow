// ═══════════════════════════════════════════════════════════
//  PRELOAD.JS — Secure IPC Bridge
//  Exposes window.api (and window.electronAPI) to the renderer.
//  renderer → preload → main → services → models → SQLite
// ═══════════════════════════════════════════════════════════

const { contextBridge, ipcRenderer } = require('electron');

const bridge = {
  // ── BACKUP & RESTORE ──────────────────────────────────
  createBackup: () => ipcRenderer.invoke('backup:create'),
  restoreBackup: () => ipcRenderer.invoke('backup:restore'),

  // ── STUDENTS ──────────────────────────────────────────────
  getAllStudents: () => ipcRenderer.invoke('student:getAll'),
  getStudentById: (id) => ipcRenderer.invoke('student:getById', id),
  addStudent: (data) => ipcRenderer.invoke('student:add', data),
  updateStudent: (id, data) => ipcRenderer.invoke('student:update', id, data),
  deleteStudent: (id) => ipcRenderer.invoke('student:delete', id),
  searchStudents: (query) => ipcRenderer.invoke('student:search', query),
  checkRollNumber: (roll, excludeId) => ipcRenderer.invoke('student:checkRoll', roll, excludeId),

  // ── FEES ──────────────────────────────────────────────
  getFees: () => ipcRenderer.invoke('fees:getAll'),
  getFeePayments: (feeId) => ipcRenderer.invoke('fees:getPayments', feeId),
  updateFee: (studentId, data) => ipcRenderer.invoke('fees:update', studentId, data),
  addPayment: (feeId, data) => ipcRenderer.invoke('fees:addPayment', feeId, data),
  deletePayment: (paymentId) => ipcRenderer.invoke('fees:deletePayment', paymentId),



  // ── ACTIVITY ──────────────────────────────────────────────
  getRecentActivities: () => ipcRenderer.invoke('activity:getRecent'),

  // ── COURSES ───────────────────────────────────────────────
  // Keep both names for compatibility with different modules.
  getCourses: () => ipcRenderer.invoke('courses:load'),
  loadCourses: () => ipcRenderer.invoke('courses:load'),
  saveCourses: (data) => ipcRenderer.invoke('courses:save', data),

  // ── SLOTS (SQLite — time/label list for dropdowns) ────────
  getSlots: () => ipcRenderer.invoke('slots:getAll'),
  addSlot: (data) => ipcRenderer.invoke('slots:add', data),
  deleteSlot: (id) => ipcRenderer.invoke('slots:delete', id),

  // ── SLOT SCHEDULE DATA (JSON file — day/student matrix) ───
  // The slot management page stores rich per-day scheduling
  // state (slots + enrollments per day) as a JSON file.
  loadSlotData: () => ipcRenderer.invoke('data:load'),
  saveSlotData: (data) => ipcRenderer.invoke('data:save', data),
  exportSlotData: (data) => ipcRenderer.invoke('data:export', data),

  // ── EXPORT (native dialogs & desktop) ──────────────────────
  exportJSON: (data) => ipcRenderer.invoke('export:json', data),
  exportHTML: (html) => ipcRenderer.invoke('export:html', html),
  exportPDF: (options) => ipcRenderer.invoke('export:pdf', options),
  openPath: (p) => ipcRenderer.invoke('open:path', p),

  // ── MENU EVENTS (main → renderer) ─────────────────────────
  onMenuAdd: (cb) => ipcRenderer.on('menu:add', cb),
  onMenuExportJSON: (cb) => ipcRenderer.on('menu:exportJSON', cb),
  onMenuExportHTML: (cb) => ipcRenderer.on('menu:exportHTML', cb),

  // ── ROUTING ───────────────────────────────────────────────
  loadFragment: (name) => ipcRenderer.invoke('app:loadFragment', name),
  // ── SHELL ─────────────────────────────────────────────
  openExternal: (url) => ipcRenderer.invoke('shell:openExternal', url),

  googleGetStatus: () => ipcRenderer.invoke('google:getStatus'),
  googleConnect: () => ipcRenderer.invoke('google:connect'),
  googleDisconnect: () => ipcRenderer.invoke('google:disconnect'),

  // --- Google Sheet Import Additions ---
  importPreviewSheet:  (sheetId) => ipcRenderer.invoke('import:previewSheet', { sheetId }),
  importExecute:       (rows)    => ipcRenderer.invoke('import:executeImport', { rows }),
  updateStudentPhoto:  (studentId, photoPath) => ipcRenderer.invoke('student:updatePhoto', { studentId, photoPath }),
  openFileDialog:      () => ipcRenderer.invoke('dialog:openFile'),
};

// Keep both names for compatibility across renderer pages.
contextBridge.exposeInMainWorld('api', bridge);
contextBridge.exposeInMainWorld('electronAPI', bridge);