// src/main/main.js
// Electron entry point. Creates windows. Registers IPC handlers.
// NO SQL here. All DB work delegated to services.

const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');

// ── Init DB tables on startup ──────────────────────────
const { initStudentsTable } = require('../backend/models/student-model');

// ── Services (IPC delegates to these) ─────────────────
const studentService = require('../backend/services/student-service');

const courseModel = require('../backend/models/course-model');

function getCoursesFilePath() {
  return path.join(app.getPath('userData'), 'dataflow-courses.json');
}

function loadCoursesFromDisk() {
  try {
    const file = getCoursesFilePath();
    if (!fs.existsSync(file)) return [];
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (err) {
    console.error('Failed to load courses:', err.message);
    return [];
  }
}

function saveCoursesToDisk(data) {
  try {
    const file = getCoursesFilePath();
    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('Failed to save courses:', err.message);
    return false;
  }
}

function getSlotsFilePath() {
  return path.join(app.getPath('userData'), 'dataflow-slots.json');
}

function loadSlotsFromDisk() {
  try {
    const file = getSlotsFilePath();
    if (!fs.existsSync(file)) return [];
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (err) {
    console.error('Failed to load slots:', err.message);
    return [];
  }
}

function saveSlotsToDisk(data) {
  try {
    const file = getSlotsFilePath();
    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('Failed to save slots:', err.message);
    return false;
  }
}

function getRendererPagesDir() {
  return path.join(__dirname, '..', 'renderer', 'pages');
}


function safeFragmentPath(fragmentName) {
  // Allow only simple names like "students", "dashboard", etc.
  if (!/^[a-z0-9-]+$/i.test(fragmentName)) return null;
  const full = path.join(getRendererPagesDir(), `${fragmentName}.html`);
  const pagesDir = getRendererPagesDir();
  const resolved = path.resolve(full);
  if (!resolved.startsWith(path.resolve(pagesDir) + path.sep)) return null;
  return resolved;
}

// ── Create main window ─────────────────────────────────
function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,   // Keep this FALSE always
    },
    titleBarStyle: 'hiddenInset',
    show: false,
  });

  win.loadFile(path.join(__dirname, '..', 'renderer', 'pages', 'index.html'));

  // Show only once fully loaded (prevents white flash)
  win.once('ready-to-show', () => win.show());
}

// ── App lifecycle ──────────────────────────────────────
app.whenReady().then(() => {
  // Init all tables
  initStudentsTable();

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ── IPC Handlers: Students ─────────────────────────────

ipcMain.handle('student:add', async (event, data) => {
  return new Promise((resolve, reject) => {
    studentService.addStudent(data, (err, result) => {
      if (err) reject(err.message);
      else resolve(result);
    });
  });
});

ipcMain.handle('student:getAll', async () => {
  return new Promise((resolve, reject) => {
    studentService.getAllStudents((err, rows) => {
      if (err) reject(err.message);
      else resolve(rows);
    });
  });
});

ipcMain.handle('student:getById', async (event, id) => {
  return new Promise((resolve, reject) => {
    studentService.getStudentById(id, (err, row) => {
      if (err) reject(err.message);
      else resolve(row);
    });
  });
});

ipcMain.handle('student:update', async (event, id, data) => {
  return new Promise((resolve, reject) => {
    studentService.updateStudent(id, data, (err, result) => {
      if (err) reject(err.message);
      else resolve(result);
    });
  });
});

ipcMain.handle('student:delete', async (event, id) => {
  return new Promise((resolve, reject) => {
    studentService.deleteStudent(id, (err, result) => {
      if (err) reject(err.message);
      else resolve(result);
    });
  });
});

ipcMain.handle('student:search', async (event, query) => {
  return new Promise((resolve, reject) => {
    studentService.searchStudents(query, (err, rows) => {
      if (err) reject(err.message);
      else resolve(rows);
    });
  });
});

// ── IPC Handlers: Courses / Export ────────────────────
ipcMain.handle('courses:load', async () => {
  return await courseModel.getAllCourses();
});

ipcMain.handle('courses:save', async (_event, data) => {
  const { canceled, filePath } = await dialog.showSaveDialog({
    title: 'Export Courses as JSON',
    defaultPath: 'courses.json',
    filters: [{ name: 'JSON', extensions: ['json'] }],
  });
  if (canceled || !filePath) return { ok: false };
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    return { ok: true, path: filePath };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('export:html', async (_event, html) => {
  const { canceled, filePath } = await dialog.showSaveDialog({
    title: 'Export Syllabus as HTML',
    defaultPath: 'syllabus.html',
    filters: [{ name: 'HTML', extensions: ['html'] }],
  });
  if (canceled || !filePath) return { ok: false };
  try {
    fs.writeFileSync(filePath, html, 'utf8');
    return { ok: true, path: filePath };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('open:path', (_event, targetPath) => {
  shell.showItemInFolder(targetPath);
  return true;
});

ipcMain.handle('export:pdf', async (event, options) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) return { ok: false, error: 'No valid window found' };

  try {
    const data = await win.webContents.printToPDF({
      printBackground: true,
      pageSize: 'A4'
    });

    const title = options?.filename || 'Test';
    const safeTitle = title.replace(/[^a-z0-9 ]/gi, '').trim() || 'DataflowTest';

    // Show a native Save As dialog
    const { canceled, filePath } = await dialog.showSaveDialog(win, {
      title: 'Save PDF Document',
      defaultPath: path.join(app.getPath('downloads'), safeTitle + '.pdf'),
      filters: [{ name: 'PDF Files', extensions: ['pdf'] }]
    });

    if (canceled || !filePath) {
      return { ok: false, error: 'Download canceled' };
    }

    fs.writeFileSync(filePath, data);
    return { ok: true, path: filePath };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

// ── IPC Handlers: Fragment loader (router) ─────────────
ipcMain.handle('app:loadFragment', (_event, fragmentName) => {
  const filePath = safeFragmentPath(String(fragmentName || ''));
  if (!filePath) throw new Error('Invalid fragment name');
  return fs.readFileSync(filePath, 'utf8');
});

// ── IPC Handlers: Slots ────────────────────────────────
ipcMain.handle('slots:getAll', () => loadSlotsFromDisk());

ipcMain.handle('slots:add', (_event, slotData) => {
  const slots = loadSlotsFromDisk();
  const newSlot = {
    id: Date.now(),
    ...slotData,
    createdAt: new Date().toISOString(),
  };
  slots.push(newSlot);
  saveSlotsToDisk(slots);
  return newSlot;
});

ipcMain.handle('slots:delete', (_event, id) => {
  const slots = loadSlotsFromDisk();
  const filtered = slots.filter(s => s.id !== id);
  saveSlotsToDisk(filtered);
  return { ok: true, removed: slots.length - filtered.length };
});

