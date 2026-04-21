// src/backend/services/drive-upload-service.js
const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');
const googleService = require('./google-service');
const documentService = require('./document-service'); // To update document DB

const dataDir = global.DATA_PATH || path.join(__dirname, '..', '..', '..', 'data');
const configPath = path.join(dataDir, 'drive-config.json');

// Helper to get or init drive config
function getDriveConfig() {
    if (fs.existsSync(configPath)) {
        try {
            return JSON.parse(fs.readFileSync(configPath, 'utf8'));
        } catch (e) {
            return {};
        }
    }
    return {};
}

function saveDriveConfig(config) {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
}

// Compute '2025-26' style string
function getAcademicYear() {
    const d = new Date();
    const month = d.getMonth() + 1; // 1-12
    const year = d.getFullYear();
    
    if (month >= 4) {
        return `${year}-${(year + 1).toString().slice(-2)}`;
    } else {
        return `${year - 1}-${year.toString().slice(-2)}`;
    }
}

async function getDriveClient() {
    const token = await googleService.getValidAccessToken();
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: token });
    return google.drive({ version: 'v3', auth: oauth2Client });
}

async function ensureFolder(drive, folderName, parentId = null) {
    // We can only list files created by us due to drive.file scope.
    let q = `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
    if (parentId) {
        q += ` and '${parentId}' in parents`;
    }
    
    const res = await drive.files.list({
        q,
        fields: 'files(id, name)',
        spaces: 'drive'
    });
    
    if (res.data.files && res.data.files.length > 0) {
        return res.data.files[0].id; // Return existing folder ID
    }
    
    // Create new folder
    const fileMetadata = {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder'
    };
    if (parentId) {
        fileMetadata.parents = [parentId];
    }
    
    const createRes = await drive.files.create({
        resource: fileMetadata,
        fields: 'id'
    });
    
    return createRes.data.id;
}

// Get the correct destination folder ID for the uploaded file
async function resolveDestinationFolderId(drive) {
    const config = getDriveConfig();
    let rootFolderId = config.rootFolderId;
    
    if (!rootFolderId) {
        rootFolderId = await ensureFolder(drive, 'DATAFLOW');
        config.rootFolderId = rootFolderId;
        saveDriveConfig(config);
    }
    
    const academicYear = getAcademicYear();
    let yearFolders = config.yearFolders || {};
    let yearFolderId = yearFolders[academicYear];
    
    if (!yearFolderId) {
        yearFolderId = await ensureFolder(drive, academicYear, rootFolderId);
        yearFolders[academicYear] = yearFolderId;
        config.yearFolders = yearFolders;
        saveDriveConfig(config);
    }
    
    return yearFolderId;
}

async function uploadFile(documentId) {
    return new Promise((resolve, reject) => {
        documentService.getDocumentById(documentId, async (err, doc) => {
            if (err) return reject(err);
            if (!doc) return reject(new Error('Document not found in DB'));
            if (!doc.localPath || !fs.existsSync(doc.localPath)) {
                return reject(new Error('Local file not found for upload'));
            }
            
            try {
                const drive = await getDriveClient();
                const folderId = await resolveDestinationFolderId(drive);
                
                const fileMetadata = {
                    name: doc.fileName,
                    parents: [folderId]
                };
                
                const media = {
                    mimeType: doc.mimeType || 'application/octet-stream',
                    body: fs.createReadStream(doc.localPath)
                };
                
                const res = await drive.files.create({
                    resource: fileMetadata,
                    media: media,
                    fields: 'id, webViewLink'
                });
                
                const driveInfo = {
                    driveFileId: res.data.id,
                    driveLink: res.data.webViewLink,
                    driveStatus: 'uploaded',
                    uploadedAt: new Date().toISOString()
                };
                
                documentService.updateDriveInfo(documentId, driveInfo, (updateErr) => {
                    if (updateErr) return reject(updateErr);
                    
                    try {
                        if (fs.existsSync(doc.localPath)) {
                            fs.unlinkSync(doc.localPath);
                        }
                    } catch (e) {
                        console.error('Failed to clear local file after upload:', e);
                    }
                    
                    resolve(driveInfo);
                });
                
            } catch (error) {
                const driveInfo = {
                    driveStatus: 'failed'
                };
                documentService.updateDriveInfo(documentId, driveInfo, () => {});
                reject(error);
            }
        });
    });
}

async function uploadPending() {
    return new Promise((resolve, reject) => {
        documentService.getPendingDocuments(async (err, docs) => {
            if (err) return reject(err);
            let successCount = 0;
            let errorCount = 0;
            
            for (const doc of docs) {
                try {
                    await uploadFile(doc.id);
                    successCount++;
                } catch (e) {
                    console.error(`Failed to upload doc ${doc.id}:`, e.message);
                    errorCount++;
                }
            }
            resolve({ successCount, errorCount });
        });
    });
}

module.exports = {
    uploadFile,
    uploadPending
};
