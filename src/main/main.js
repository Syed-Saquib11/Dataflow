// src/main/main.js
// Electron entry point. Creates windows. Registers IPC handlers.
// NO SQL here. All DB work delegated to services.

const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');

// ── Init DB tables on startup ──────────────────────────
const { initStudentsTable } = require('../backend/models/student-model');
const activityModel = require('../backend/models/activity-model');

// ── Services (IPC delegates to these) ─────────────────
const studentService = require('../backend/services/student-service');

const courseModel = require('../backend/models/course-model');
const slotModel = require('../backend/models/slot-model');

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

  // Show maximized once fully loaded (prevents white flash)
  win.once('ready-to-show', () => {
    win.maximize();
    win.show();
  });
}

// ── App lifecycle ──────────────────────────────────────
app.whenReady().then(() => {
  // Init all tables
  initStudentsTable();
  activityModel.initActivityTable();

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

// ── IPC Handlers: Activity ────────────────────────────
ipcMain.handle('activity:getRecent', async () => {
  return new Promise((resolve, reject) => {
    activityModel.getRecentActivities(4, (err, rows) => {
      if (err) reject(err.message);
      else resolve(rows);
    });
  });
});

// ── IPC Handlers: Courses / Export ────────────────────
ipcMain.handle('courses:load', async () => {
  try {
    return await courseModel.getAllCourses();
  } catch (err) {
    console.error('Failed to load courses from DB:', err);
    return [];
  }
});

ipcMain.handle('courses:save', async (_event, data) => {
  try {
    await courseModel.bulkSaveCourses(data);
    return true;
  } catch (err) {
    console.error('Failed to save courses to DB:', err);
    return false;
  }
});

ipcMain.handle('export:json', async (_event, data) => {
  const { canceled, filePath } = await dialog.showSaveDialog({
    title: 'Export Data as JSON',
    defaultPath: 'data.json',
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
ipcMain.handle('slots:getAll', () => { return []; });
ipcMain.handle('slots:add', (_event, slotData) => { return null; });
ipcMain.handle('slots:delete', (_event, id) => { return { ok: true, removed: 0 }; });

// ── IPC Handlers: Slot Data (Rich JSON) ───────────────────
ipcMain.handle('data:load', async () => {
  try {
    return await slotModel.getSlotData();
  } catch (err) {
    console.error('Failed to load rich slot data from DB:', err.message);
    return null;
  }
});

ipcMain.handle('data:save', async (_event, data) => {
  try {
    return await slotModel.saveSlotData(data);
  } catch (err) {
    console.error('Failed to save rich slot data to DB:', err.message);
    return false;
  }
});

ipcMain.handle('data:export', async (_event, data) => {
  const { canceled, filePath } = await dialog.showSaveDialog({
    title: 'Export Slots as JSON',
    defaultPath: 'slots-data.json',
    filters: [{ name: 'JSON', extensions: ['json'] }],
  });
  if (canceled || !filePath) return false;
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (err) {
    return false;
  }
});

