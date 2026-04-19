// src/backend/models/document-model.js

const db = require('../database/db');

function initDocumentsTable() {
  return new Promise((resolve, reject) => {
    db.run(`
      CREATE TABLE IF NOT EXISTS documents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        fileName TEXT NOT NULL,
        localPath TEXT,
        mimeType TEXT,
        fileSize INTEGER,
        driveFileId TEXT,
        driveLink TEXT,
        driveStatus TEXT DEFAULT 'local',
        addedAt TEXT,
        uploadedAt TEXT
      )
    `, (err) => {
      if (err) {
        console.error('Failed to create documents table:', err.message);
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

function getAllDocuments(callback) {
  db.all(`SELECT * FROM documents ORDER BY addedAt DESC`, (err, rows) => {
    if (callback) callback(err, rows);
  });
}

function addDocument(doc, callback) {
  const query = `
    INSERT INTO documents 
    (fileName, localPath, mimeType, fileSize, driveStatus, addedAt)
    VALUES (?, ?, ?, ?, ?, ?)
  `;
  const params = [
    doc.fileName,
    doc.localPath || null,
    doc.mimeType || null,
    doc.fileSize || 0,
    doc.driveStatus || 'local',
    doc.addedAt || new Date().toISOString()
  ];
  
  db.run(query, params, function (err) {
    if (err) {
      if (callback) callback(err);
      return;
    }
    // Return the inserted row
    db.get('SELECT * FROM documents WHERE id = ?', [this.lastID], callback);
  });
}

function deleteDocument(id, callback) {
  db.get('SELECT * FROM documents WHERE id = ?', [id], (err, row) => {
    if (err || !row) {
      if (callback) callback(err || new Error('Document not found'));
      return;
    }
    db.run('DELETE FROM documents WHERE id = ?', [id], (err2) => {
      if (callback) callback(err2, row); // Return row so service can delete file
    });
  });
}

function searchDocuments(query, callback) {
  db.all(
    `SELECT * FROM documents WHERE fileName LIKE ? ORDER BY addedAt DESC`,
    [`%${query}%`],
    (err, rows) => {
      if (callback) callback(err, rows);
    }
  );
}

function updateDriveInfo(id, driveInfo, callback) {
  const { driveFileId, driveLink, driveStatus, uploadedAt } = driveInfo;
  db.run(`
    UPDATE documents 
    SET driveFileId = ?, driveLink = ?, driveStatus = ?, uploadedAt = ?
    WHERE id = ?
  `, [
    driveFileId || null,
    driveLink || null,
    driveStatus || 'failed',
    uploadedAt || null,
    id
  ], function (err) {
    if (callback) callback(err, { changes: this.changes });
  });
}

function getPendingDocuments(callback) {
  db.all(`SELECT * FROM documents WHERE driveStatus = 'local'`, (err, rows) => {
    if (callback) callback(err, rows);
  });
}

function getDocumentById(id, callback) {
  db.get(`SELECT * FROM documents WHERE id = ?`, [id], (err, row) => {
      if (callback) callback(err, row);
  });
}


module.exports = {
  initDocumentsTable,
  getAllDocuments,
  addDocument,
  deleteDocument,
  searchDocuments,
  updateDriveInfo,
  getPendingDocuments,
  getDocumentById
};
