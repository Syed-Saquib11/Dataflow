// src/backend/services/document-service.js

const path = require('path');
const fs = require('fs');
const documentModel = require('../models/document-model');

// Define data directories
const dataDir = global.DATA_PATH || path.join(__dirname, '..', '..', '..', 'data');
const documentsDir = path.join(dataDir, 'documents');

// Ensure documents folder exists
if (!fs.existsSync(documentsDir)) {
  fs.mkdirSync(documentsDir, { recursive: true });
}

// Simple mime lookup
const getMimeType = (ext) => {
  const mimes = {
    '.pdf': 'application/pdf',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.doc': 'application/msword',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.xls': 'application/vnd.ms-excel',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.txt': 'text/plain',
    '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  };
  return mimes[ext.toLowerCase()] || 'application/octet-stream';
};

function getAllDocuments(callback) {
  documentModel.getAllDocuments(callback);
}

function searchDocuments(query, callback) {
  documentModel.searchDocuments(query, callback);
}

function addDocument(sourcePath, callback) {
  try {
    if (!fs.existsSync(sourcePath)) {
      return callback(new Error('Selected file does not exist.'));
    }

    const fileName = path.basename(sourcePath);
    let destPath = path.join(documentsDir, fileName);
    
    // Prevent overwriting if file exists locally, append timestamp
    if (fs.existsSync(destPath)) {
      const ext = path.extname(fileName);
      const base = path.basename(fileName, ext);
      const newName = `${base}_${Date.now()}${ext}`;
      destPath = path.join(documentsDir, newName);
    }
    
    fs.copyFileSync(sourcePath, destPath);
    const stat = fs.statSync(destPath);
    const ext = path.extname(destPath);

    const docData = {
      fileName: path.basename(destPath),
      localPath: destPath,
      mimeType: getMimeType(ext),
      fileSize: stat.size,
      driveStatus: 'local',
      addedAt: new Date().toISOString()
    };

    documentModel.addDocument(docData, (err, newDoc) => {
      if (err) callback(err);
      else callback(null, newDoc);
    });

  } catch (err) {
    callback(err);
  }
}

function deleteDocument(id, callback) {
  documentModel.deleteDocument(id, (err, row) => {
    if (err) return callback(err);
    if (!row) return callback(new Error('Document not found'));

    // Try to delete local file
    try {
      if (row.localPath && fs.existsSync(row.localPath)) {
        fs.unlinkSync(row.localPath);
      }
    } catch (e) {
      console.error('Failed to delete local document file:', e);
      // Even if file deletion fails, we proceed since db row is deleted
    }
    callback(null, row);
  });
}

function getDocumentById(id, callback) {
   documentModel.getDocumentById(id, callback);
}

function getPendingDocuments(callback) {
   documentModel.getPendingDocuments(callback);
}

function updateDriveInfo(id, driveInfo, callback) {
    documentModel.updateDriveInfo(id, driveInfo, callback);
}


module.exports = {
  getAllDocuments,
  searchDocuments,
  addDocument,
  deleteDocument,
  getDocumentById,
  getPendingDocuments,
  updateDriveInfo
};
