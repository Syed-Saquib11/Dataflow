'use strict';

let allDocs = [];
let filteredDocs = [];
let currentDocsPage = 1;
const DOCS_PER_PAGE = 5;
let refreshTimer = null;
let isInitialLoad = true;

window.initForms = async function () {
  isInitialLoad = true;
  bindFormsEvents();
  await loadTemplates();
  await loadDocuments();
  await checkDriveStatus();
  updateStatsBar();
  startAutoRefresh();
  isInitialLoad = false;
};

window.destroyForms = function () {
  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = null;
  }
};

function bindFormsEvents() {
  document.getElementById('btn-add-document')?.addEventListener('click', () => {
    handleAddDocument();
  });

  document.getElementById('btn-drive-retry')?.addEventListener('click', async () => {
    const btn = document.getElementById('btn-drive-retry');
    btn.textContent = 'Uploading...';
    btn.disabled = true;
    try {
      await window.api.driveUploadPending();
      showToast('Batch upload initiated.', 'info');
    } catch (e) {
      showToast('Error during batch upload.', 'error');
    } finally {
      await loadDocuments();
      await checkDriveStatus();
      updateStatsBar();
    }
  });


  document.getElementById('btn-add-template')?.addEventListener('click', () => {
    handleAddTemplate();
  });

  document.getElementById('docs-search-input')?.addEventListener('input', (e) => {
    filterDocuments(e.target.value);
  });
  
  document.getElementById('btn-docs-prev')?.addEventListener('click', () => {
    if (currentDocsPage > 1) {
      currentDocsPage--;
      renderDocuments(filteredDocs);
    }
  });

  document.getElementById('btn-docs-next')?.addEventListener('click', () => {
    const totalPages = Math.ceil(filteredDocs.length / DOCS_PER_PAGE) || 1;
    if (currentDocsPage < totalPages) {
      currentDocsPage++;
      renderDocuments(filteredDocs);
    }
  });
}

function startAutoRefresh() {
  refreshTimer = setInterval(() => {
    loadTemplates();
    loadDocuments();
    checkDriveStatus();
    updateStatsBar();
  }, 10000); // 10s is better for drive status checks
}



function updateStatsBar() {
  const templatesEl = document.getElementById('stat-templates-count');
  const docsEl = document.getElementById('stat-docs-count');
  const driveEl = document.getElementById('stat-drive-count');

  const templateCards = document.querySelectorAll('#templates-grid .forms-template-card');
  if (templatesEl) templatesEl.textContent = templateCards.length || 0;
  if (docsEl) docsEl.textContent = allDocs.length || 0;
  if (driveEl) {
    const onDrive = allDocs.filter(d => d.driveStatus === 'uploaded').length;
    driveEl.textContent = onDrive;
  }
}

async function checkDriveStatus() {
  const banner = document.getElementById('drive-retry-banner');
  const text = document.getElementById('drive-retry-text');
  if (!banner || !text) return;

  try {
    const status = await window.api.driveGetStatus();
    if (status.connected && status.pendingCount > 0) {
      text.textContent = `${status.pendingCount} file(s) not yet on Drive.`;
      banner.style.display = 'flex';
      const btn = document.getElementById('btn-drive-retry');
      if (btn) {
        btn.textContent = 'Upload all now';
        btn.disabled = false;
      }
    } else {
      banner.style.display = 'none';
    }
  } catch (e) {
    banner.style.display = 'none';
  }
}

async function loadTemplates() {
  try {
    const templates = await window.api.getTemplates();
    renderTemplates(templates || []);
    updateStatsBar();
  } catch (err) {
    console.error('Failed to load templates:', err);
  }
}

function renderTemplates(templates) {
  const grid = document.getElementById('templates-grid');
  if (!grid) return;

  if (templates.length === 0) {
    grid.innerHTML = `
      <div class="templates-empty">
        <div class="templates-empty-icon">📄</div>
        <div class="templates-empty-text">No templates found</div>
        <div class="templates-empty-hint">Click "Add Template" to upload a .docx format form template</div>
      </div>`;
    return;
  }

  const colors = ['blue', 'green', 'orange', 'purple', 'pink', 'teal'];
  const icons = ['📄', '📝', '📃', '📐', '📋', '📑'];

  grid.innerHTML = templates.map((tmpl, i) => {
    const color = colors[i % colors.length];
    const icon = icons[i % icons.length];
    const displayName = tmpl.name
      .replace(/\.[^/.]+$/, "")           // Remove extension
      .replace(/^template[-_]/i, "");     // Remove "template-" or "template_" prefix
    const ext = tmpl.name.split('.').pop().toUpperCase();
    
    // Waterfall stagger delay (starts after section header reveals)
    const staggerDelay = 280 + (i * 70);
    const animClass = isInitialLoad ? 'reveal-wf' : '';
    const animStyle = isInitialLoad ? `style="animation-delay: ${staggerDelay}ms"` : '';
    
    return `
      <div class="forms-template-card ${animClass}" 
           data-filename="${tmpl.name}" 
           data-color="${color}" 
           ${animStyle}>
        <div class="ftc-body">
          <div class="ftc-val">${displayName}</div>
          <div class="ftc-sub">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
              <polyline points="15 3 21 3 21 9"/>
              <line x1="10" y1="14" x2="21" y2="3"/>
            </svg>
            Opens in Microsoft Word
          </div>
        </div>
        <div class="ftc-icon">
          ${icon}
        </div>
        <button class="ftc-delete-btn" title="Delete template">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
        </button>
      </div>
    `;
  }).join('');

  grid.querySelectorAll('.forms-template-card').forEach(card => {
    card.addEventListener('click', (e) => {
      // Don't open template if they clicked the delete button
      if (e.target.closest('.ftc-delete-btn')) return;
      window.api.openTemplate(card.dataset.filename);
    });
  });

  grid.querySelectorAll('.ftc-delete-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const card = btn.closest('.forms-template-card');
      const filename = card.dataset.filename;
      
      const confirmed = await showDeleteConfirmModal(
        'Delete Template',
        filename,
        'This action **cannot be undone**. All related template data and access will be removed.'
      );

      if (confirmed) {
        await window.api.deleteTemplate(filename);
        await loadTemplates();
        showToast('Template deleted successfully.', 'success');
      }
    });
  });
}

async function handleAddTemplate() {
  try {
    const result = await window.api.addTemplate();
    if (!result || !result.success) {
      if (result?.error) showToast(result.error, 'error');
      return;
    }
    await loadTemplates();
    showToast('Template added successfully.', 'success');
  } catch (err) {
    showToast('Upload failed. Please try again.', 'error');
    console.error('Add template error:', err);
  }
}

async function loadDocuments() {
  try {
    const banner = document.getElementById('drive-retry-banner');
    try {
      const res = await window.api.listDriveFiles();
      if (res.success) {
        allDocs = res.files || [];
        if (banner) banner.style.display = 'none';
      } else {
        throw new Error(res.error);
      }
    } catch (e) {
      console.warn("Drive not connected or failed, falling back to local docs cache", e);
      if (banner) {
        const text = document.getElementById('drive-retry-text');
        if (text) text.textContent = 'Drive not connected — showing local files only.';
        banner.style.display = 'flex';
        const btn = document.getElementById('btn-drive-retry');
        if (btn) btn.style.display = 'none';
      }
      const docs = await window.api.getAllDocuments();
      allDocs = docs || [];
    }
    
    filterDocuments(document.getElementById('docs-search-input')?.value || '');
    updateStatsBar();
  } catch (err) {
    console.error('Failed to load documents:', err);
  }
}


function filterDocuments(query) {
  const lowerQuery = query.toLowerCase().trim();
  if (!lowerQuery) {
    filteredDocs = [...allDocs];
  } else {
    filteredDocs = allDocs.filter(doc => doc.fileName.toLowerCase().includes(lowerQuery));
  }
  currentDocsPage = 1;
  renderDocuments(filteredDocs);
}

function getFileTypeClass(filename) {
  const ext = filename.split('.').pop().toLowerCase();
  if (['pdf'].includes(ext)) return 'type-pdf';
  if (['doc', 'docx'].includes(ext)) return 'type-doc';
  if (['xls', 'xlsx', 'csv'].includes(ext)) return 'type-xls';
  if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp'].includes(ext)) return 'type-img';
  return 'type-other';
}

function renderDocuments(docs) {
  const emptyState = document.getElementById('docs-empty-state');
  const fileList = document.getElementById('docs-file-list');
  const pagination = document.getElementById('docs-pagination');
  const pageInfo = document.getElementById('docs-page-info');

  if (docs.length === 0) {
    emptyState.style.display = 'flex';
    fileList.innerHTML = '';
    if (pagination) pagination.style.display = 'none';
    return;
  }

  emptyState.style.display = 'none';
  
  const totalPages = Math.ceil(docs.length / DOCS_PER_PAGE) || 1;
  if (currentDocsPage > totalPages) currentDocsPage = totalPages;
  
  const startIndex = (currentDocsPage - 1) * DOCS_PER_PAGE;
  const endIndex = startIndex + DOCS_PER_PAGE;
  const pageDocs = docs.slice(startIndex, endIndex);

  fileList.innerHTML = pageDocs.map((doc, i) => {
    const typeClass = getFileTypeClass(doc.fileName);
    
    // Waterfall stagger delay (starts after document section header reveals)
    const staggerDelay = 420 + (i * 70);
    const animClass = isInitialLoad ? 'reveal-wf' : '';
    const animStyle = isInitialLoad ? `style="animation-delay: ${staggerDelay}ms"` : '';
    
    let statusBadge = '<span class="doc-status-badge badge-cloud">☁️ Synced</span>';
    let driveAction = `<button class="doc-action-btn btn-drive-action doc-drive-link-btn" data-link="${doc.driveLink}">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
      Drive
    </button>`;

    return `
    <div class="doc-row ${animClass}" 
         data-id="${doc.id}" 
         data-path="${doc.localPath}"
         ${animStyle}>
      <div class="doc-icon-wrap ${typeClass}">${getFileIcon(doc.fileName)}</div>
      <div class="doc-info">
        <div class="doc-name">${doc.fileName}</div>
        <div class="doc-meta">
          ${formatSize(doc.fileSize)} &nbsp;·&nbsp; Added ${formatDate(doc.addedAt)} 
          ${statusBadge}
        </div>
      </div>
      <div class="doc-actions">
        ${doc.driveStatus !== 'uploaded' ? `
        <button class="doc-action-btn btn-open doc-open-btn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          Open
        </button>` : ''}
        ${driveAction}
        <button class="doc-action-btn btn-delete-doc doc-delete-btn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          Delete
        </button>
      </div>
    </div>
  `}).join('');

  if (pagination) {
    pagination.style.display = 'flex';
    if (pageInfo) pageInfo.textContent = `Showing ${pageDocs.length} of ${docs.length} documents`;
    
    document.getElementById('btn-docs-prev').disabled = currentDocsPage === 1;
    document.getElementById('btn-docs-next').disabled = currentDocsPage === totalPages;
  }

  fileList.querySelectorAll('.doc-open-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const path = btn.closest('.doc-row').dataset.path;
      window.api.openPath(path);
    });
  });

  fileList.querySelectorAll('.doc-drive-link-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const link = btn.dataset.link;
      window.api.openExternal(link);
    });
  });

  fileList.querySelectorAll('.doc-delete-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.closest('.doc-row').dataset.id;
      const doc = filteredDocs.find(d => d.id == id);
      const driveFileId = doc.driveFileId;
      
      const confirmed = await showDeleteConfirmModal(
        'Delete Document',
        doc.fileName,
        'This action **cannot be undone**. The file will be removed from local cache and Drive shared folder.'
      );

      if (confirmed) {
        if (driveFileId) {
          await window.api.deleteDriveFile(driveFileId);
        } else {
          // If it somehow lacks a driveFileId, delete locally
          await window.api.deleteDocument(id);
        }
        await loadDocuments();
        checkDriveStatus();
        showToast('Document deleted successfully.', 'success');
      }
    });
  });
}

async function handleAddDocument() {
  try {
    const filePath = await window.api.openAnyFileDialog();
    if (!filePath) return;
    
    showToast('Uploading directly to Google Drive Shared folder...', 'info');
    
    const fileName = filePath.split('\\').pop().split('/').pop();
    
    const res = await window.api.uploadDriveFile(filePath, fileName, null, null);
    if (!res || !res.success) {
      showToast('Upload failed: ' + (res?.error || 'Unknown error'), 'error');
      return;
    }
    
    await loadDocuments();
    checkDriveStatus();
    showToast('Document uploaded and shared successfully.', 'success');
  } catch (err) {
    showToast('Upload failed. Please try again.', 'error');
    console.error('Add document error:', err);
  }
}

function getFileIcon(filename) {
  const ext = filename.split('.').pop().toLowerCase();
  
  const icons = {
    pdf: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <path d="M10 12h4"></path>
            <path d="M10 16h4"></path>
            <path d="M9 14h6"></path>
          </svg>`,
    docx: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
             <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
             <polyline points="14 2 14 8 20 8"></polyline>
             <line x1="16" y1="13" x2="8" y2="13"></line>
             <line x1="16" y1="17" x2="8" y2="17"></line>
             <polyline points="10 9 9 9 8 9"></polyline>
           </svg>`,
    doc: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
          </svg>`,
    xlsx: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
             <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
             <polyline points="14 2 14 8 20 8"></polyline>
             <path d="M8 13h2"></path>
             <path d="M14 13h2"></path>
             <path d="M8 17h2"></path>
             <path d="M14 17h2"></path>
           </svg>`,
    xls: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <path d="M8 13h8"></path>
            <path d="M8 17h8"></path>
          </svg>`,
    jpg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <circle cx="8.5" cy="8.5" r="1.5"></circle>
            <polyline points="21 15 16 10 5 21"></polyline>
          </svg>`,
    jpeg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
             <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
             <circle cx="8.5" cy="8.5" r="1.5"></circle>
             <polyline points="21 15 16 10 5 21"></polyline>
           </svg>`,
    png: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <circle cx="8.5" cy="8.5" r="1.5"></circle>
            <polyline points="21 15 16 10 5 21"></polyline>
          </svg>`,
    webp: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
             <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
             <circle cx="8.5" cy="8.5" r="1.5"></circle>
             <polyline points="21 15 16 10 5 21"></polyline>
           </svg>`,
    txt: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
            <line x1="10" y1="9" x2="8" y2="9"></line>
          </svg>`,
    pptx: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
             <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
             <line x1="2" y1="20" x2="22" y2="20"></line>
             <polyline points="10 7 15 10 10 13 10 7"></polyline>
           </svg>`,
  };

  return icons[ext] || `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
                        </svg>`;
}

function formatSize(bytes) {
  if (!bytes) return '—';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function showToast(message, type = 'info') {
  if (typeof window.showToast === 'function') {
    window.showToast(message, type);
  }
}

// ── Delete Confirmation Modal ─────────────────────────
function showDeleteConfirmModal(title, itemName, warningText) {
  return new Promise((resolve) => {
    const root = document.getElementById('modal-root');
    if (!root) return resolve(false);

    const modalHtml = `
      <div class="modal-overlay active" id="delete-confirm-overlay">
        <div class="modal delete-confirm-modal">
          <div class="delete-confirm-header">
            <div class="delete-confirm-icon-outer">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="24" height="24">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                <line x1="12" y1="9" x2="12" y2="13"></line>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
              </svg>
            </div>
            <h2 class="delete-confirm-title">${title}</h2>
            <button class="delete-confirm-close" id="delete-modal-close">&times;</button>
          </div>
          
          <div class="delete-confirm-body">
            <p class="delete-confirm-desc">
              You are about to permanently delete <strong>${itemName}</strong>.
            </p>
            
            <div class="delete-confirm-alert">
              <div class="delete-confirm-alert-icon">⚠️</div>
              <div class="delete-confirm-alert-text">
                ${warningText.replace('**cannot be undone**', '<b>cannot be undone</b>')}
              </div>
            </div>
          </div>

          <div class="delete-confirm-footer">
            <button class="btn-delete-cancel" id="delete-modal-cancel">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="14" height="14">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
              Cancel
            </button>
            <button class="btn-delete-confirm" id="delete-modal-confirm">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="14" height="14">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
              Yes, Delete Forever
            </button>
          </div>
        </div>
      </div>
    `;

    root.innerHTML = modalHtml;

    const overlay = document.getElementById('delete-confirm-overlay');
    const closeBtn = document.getElementById('delete-modal-close');
    const cancelBtn = document.getElementById('delete-modal-cancel');
    const confirmBtn = document.getElementById('delete-modal-confirm');

    const closeModal = (result) => {
      overlay.classList.remove('active');
      setTimeout(() => {
        root.innerHTML = '';
        resolve(result);
      }, 300);
    };

    closeBtn.addEventListener('click', () => closeModal(false));
    cancelBtn.addEventListener('click', () => closeModal(false));
    confirmBtn.addEventListener('click', () => closeModal(true));
    
    // Close on overlay click
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal(false);
    });
  });
}