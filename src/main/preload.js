// ═══════════════════════════════════════════════════════════
//  PRELOAD.JS — Secure IPC Bridge
//  Exposes window.api (and window.electronAPI) to the renderer.
//  renderer → preload → main → services → models → SQLite
// ═══════════════════════════════════════════════════════════

const { contextBridge, ipcRenderer } = require('electron');

const bridge = {

  // ── STUDENTS ──────────────────────────────────────────────
  getAllStudents:  ()           => ipcRenderer.invoke('student:getAll'),
  getStudentById: (id)         => ipcRenderer.invoke('student:getById', id),
  addStudent:     (data)       => ipcRenderer.invoke('student:add', data),
  updateStudent:  (id, data)   => ipcRenderer.invoke('student:update', id, data),
  deleteStudent:  (id)         => ipcRenderer.invoke('student:delete', id),
  searchStudents: (query)      => ipcRenderer.invoke('student:search', query),

  // ── COURSES ───────────────────────────────────────────────
  // Keep both names for compatibility with different modules.
  getCourses:   ()             => ipcRenderer.invoke('courses:load'),
  loadCourses:  ()             => ipcRenderer.invoke('courses:load'),
  saveCourses:  (data)         => ipcRenderer.invoke('courses:save', data),

  // ── SLOTS ─────────────────────────────────────────────────
  getSlots:     ()             => ipcRenderer.invoke('slots:getAll'),
  addSlot:      (data)         => ipcRenderer.invoke('slots:add', data),
  deleteSlot:   (id)           => ipcRenderer.invoke('slots:delete', id),

  // ── EXPORT (native dialogs & desktop) ──────────────────────
  exportJSON:   (data)         => ipcRenderer.invoke('export:json', data),
  exportHTML:   (html)         => ipcRenderer.invoke('export:html', html),
  exportPDF:    (options)      => ipcRenderer.invoke('export:pdf', options),
  openPath:     (p)            => ipcRenderer.invoke('open:path', p),

  // ── MENU EVENTS (main → renderer) ─────────────────────────
  onMenuAdd:        (cb)       => ipcRenderer.on('menu:add',        cb),
  onMenuExportJSON: (cb)       => ipcRenderer.on('menu:exportJSON', cb),
  onMenuExportHTML: (cb)       => ipcRenderer.on('menu:exportHTML', cb),

  // ── ROUTING ───────────────────────────────────────────────
  loadFragment: (name)         => ipcRenderer.invoke('app:loadFragment', name),

};

// Keep both names for compatibility across renderer pages.
contextBridge.exposeInMainWorld('api', bridge);
contextBridge.exposeInMainWorld('electronAPI', bridge);