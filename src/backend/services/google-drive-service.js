// src/backend/services/google-drive-service.js
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const { Readable } = require('stream');
const googleService = require('./google-service');
const documentModel = require('../models/document-model');

let cachedFolderId = null;

async function getDriveClient() {
    const token = await googleService.getValidAccessToken();
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: token });
    return google.drive({ version: 'v3', auth: oauth2Client });
}

async function findOrCreateDataflowFolder() {
    if (cachedFolderId) return cachedFolderId;
    
    const drive = await getDriveClient();
    
    const q = "(name='DATAFLOW' or name='Dataflow') and mimeType='application/vnd.google-apps.folder' and trashed=false";
    const res = await drive.files.list({
        q,
        fields: 'files(id, name)',
        spaces: 'drive'
    });
    
    if (res.data.files && res.data.files.length > 0) {
        cachedFolderId = res.data.files[0].id;
        return cachedFolderId;
    }
    
    const createRes = await drive.files.create({
        resource: {
            name: 'DATAFLOW',
            mimeType: 'application/vnd.google-apps.folder'
        },
        fields: 'id'
    });
    
    cachedFolderId = createRes.data.id;
    return cachedFolderId;
}

async function findOrCreateSubfolder(drive, parentId, folderName) {
    const q = `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and '${parentId}' in parents and trashed=false`;
    const res = await drive.files.list({
        q,
        fields: 'files(id, name)',
        spaces: 'drive'
    });
    
    if (res.data.files && res.data.files.length > 0) {
        return res.data.files[0].id;
    }
    
    const createRes = await drive.files.create({
        resource: {
            name: folderName,
            mimeType: 'application/vnd.google-apps.folder',
            parents: [parentId]
        },
        fields: 'id'
    });
    return createRes.data.id;
}

async function uploadBase64Pdf(base64Data, fileName, folderName) {
    const drive = await getDriveClient();
    
    // Get or create Dataflow root folder
    const dataflowFolderId = await findOrCreateDataflowFolder();
    
    // Find or create the target folder (e.g., 'Admission Forms') INSIDE Dataflow folder
    const targetFolderId = await findOrCreateSubfolder(drive, dataflowFolderId, folderName);
    
    // Remove data URI prefix if present
    const base64String = base64Data.replace(/^data:.*?;base64,/, "");
    const buffer = Buffer.from(base64String, 'base64');
    
    // Convert Buffer to Readable Stream
    const stream = new Readable();
    stream.push(buffer);
    stream.push(null);
    
    const fileMetadata = {
        name: fileName,
        parents: [targetFolderId]
    };
    const media = {
        mimeType: 'application/pdf',
        body: stream
    };
    
    const uploadRes = await drive.files.create({
        resource: fileMetadata,
        media: media,
        fields: 'id, webViewLink, size'
    });
    
    return {
        driveFileId: uploadRes.data.id,
        driveLink: uploadRes.data.webViewLink,
        size: uploadRes.data.size
    };
}

async function readManifest(folderId) {
    const drive = await getDriveClient();
    
    const q = `name='manifest.json' and '${folderId}' in parents and trashed=false`;
    const res = await drive.files.list({
        q,
        fields: 'files(id, name)',
        spaces: 'drive'
    });
    
    if (res.data.files && res.data.files.length > 0) {
        const manifestFileId = res.data.files[0].id;
        try {
            const getRes = await drive.files.get(
                { fileId: manifestFileId, alt: 'media' },
                { responseType: 'json' }
            );
            
            let manifestData = getRes.data;
            if (typeof manifestData === 'string') {
                manifestData = JSON.parse(manifestData);
            }
            return { manifestFileId, files: manifestData.files || [] };
        } catch (e) {
            console.error('Failed to parse existing manifest', e);
            return { manifestFileId, files: [] };
        }
    }
    
    return { manifestFileId: null, files: [] };
}

async function writeManifest(folderId, manifestData, manifestFileId) {
    const drive = await getDriveClient();
    const fileMetadata = { name: 'manifest.json' };
    const media = {
        mimeType: 'application/json',
        body: JSON.stringify(manifestData)
    };
    
    if (manifestFileId) {
        await drive.files.update({
            fileId: manifestFileId,
            media: media
        });
        return manifestFileId;
    } else {
        fileMetadata.parents = [folderId];
        const res = await drive.files.create({
            resource: fileMetadata,
            media: media,
            fields: 'id'
        });
        return res.data.id;
    }
}

function getFileSize(filePath) {
    try {
        return fs.statSync(filePath).size;
    } catch(e) {
        return 0;
    }
}

async function uploadToDataflow(filePath, fileName, mimeType, userEmail) {
    const drive = await getDriveClient();
    const dataflowFolderId = await findOrCreateDataflowFolder();
    const folderId = await findOrCreateSubfolder(drive, dataflowFolderId, 'Forms and Documents');
    const { manifestFileId, files } = await readManifest(folderId);
    
    const fileMetadata = {
        name: fileName,
        parents: [folderId]
    };
    const media = {
        mimeType: mimeType || 'application/octet-stream',
        body: fs.createReadStream(filePath)
    };
    
    const res = await drive.files.create({
        resource: fileMetadata,
        media: media,
        fields: 'id, webViewLink, size'
    });
    
    const driveFileId = res.data.id;
    
    const newEntry = {
        driveFileId: driveFileId,
        fileName: fileName,
        fileSize: res.data.size || getFileSize(filePath),
        mimeType: mimeType || 'application/octet-stream',
        uploadedBy: userEmail || 'unknown',
        driveLink: res.data.webViewLink,
        driveStatus: 'uploaded',
        addedAt: new Date().toISOString(),
        uploadedAt: new Date().toISOString()
    };
    
    files.push(newEntry);
    await writeManifest(folderId, { files }, manifestFileId);
    
    // Upsert into local db just so it's instantly cached
    return new Promise((resolve) => {
        documentModel.upsertFromManifest(newEntry, () => {
            resolve(newEntry);
        });
    });
}

async function listDataflowFiles() {
    const drive = await getDriveClient();
    const dataflowFolderId = await findOrCreateDataflowFolder();
    const folderId = await findOrCreateSubfolder(drive, dataflowFolderId, 'Forms and Documents');
    const { files } = await readManifest(folderId);
    
    // Clear and upsert everything in local DB as a cache
    return new Promise((resolve, reject) => {
        documentModel.clearAll((err) => {
            if (err) return reject(err);
            
            if (files.length === 0) return resolve([]);
            
            let doneCount = 0;
            let hasError = false;
            
            for (const entry of files) {
                documentModel.upsertFromManifest(entry, (upsertErr) => {
                    if (hasError) return;
                    if (upsertErr) {
                        hasError = true;
                        return reject(upsertErr);
                    }
                    doneCount++;
                    if (doneCount === files.length) {
                        resolve(files);
                    }
                });
            }
        });
    });
}

async function deleteFromDataflow(driveFileId) {
    const drive = await getDriveClient();
    const dataflowFolderId = await findOrCreateDataflowFolder();
    const folderId = await findOrCreateSubfolder(drive, dataflowFolderId, 'Forms and Documents');
    const { manifestFileId, files } = await readManifest(folderId);
    
    try {
        await drive.files.delete({ fileId: driveFileId });
    } catch(e) {
        console.error('Error deleting drive file:', e.message);
        // We'll continue to remove from manifest even if it throws (maybe already deleted manually)
    }
    
    const updatedFiles = files.filter(f => f.driveFileId !== driveFileId);
    await writeManifest(folderId, { files: updatedFiles }, manifestFileId);
    
    return new Promise((resolve, reject) => {
        documentModel.deleteDocumentByDriveId(driveFileId, (err) => {
            if (err) return reject(err);
            resolve({ success: true });
        });
    });
}

module.exports = {
    findOrCreateDataflowFolder,
    findOrCreateSubfolder,
    uploadToDataflow,
    listDataflowFiles,
    deleteFromDataflow,
    uploadBase64Pdf
};
