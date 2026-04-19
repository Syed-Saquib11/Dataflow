'use strict';

let allDocs = [];
let filteredDocs = [];
let currentDocsPage = 1;
const DOCS_PER_PAGE = 5;
let refreshTimer = null;

window.initForms = async function () {
  bindFormsEvents();
  initAutoUploadToggle();
  await loadTemplates();
  await loadDocuments();
  await checkDriveStatus();
  startAutoRefresh();
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
    }
  });

  document.getElementById('auto-drive-upload')?.addEventListener('change', (e) => {
    localStorage.setItem('auto_drive_upload', e.target.checked);
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
  }, 10000); // 10s is better for drive status checks
}

function initAutoUploadToggle() {
  const toggle = document.getElementById('auto-drive-upload');
  if (toggle) {
    toggle.checked = localStorage.getItem('auto_drive_upload') === 'true';
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
  } catch (err) {
    console.error('Failed to load templates:', err);
  }
}

function renderTemplates(templates) {
  const grid = document.getElementById('templates-grid');
  if (!grid) return;

  if (templates.length === 0) {
    grid.innerHTML = `<div class="docs-empty" style="grid-column: 1 / -1; padding: 24px; color: var(--text-muted);">
      No templates found. Click "+ Add Template" to upload a .docx format form template.
    </div>`;
    return;
  }

  const colors = ['blue', 'green', 'orange', 'purple', 'pink'];
  const icons = ['📄', '📝', '📃', '📐', '📋'];

  grid.innerHTML = templates.map((tmpl, i) => {
    const color = colors[i % colors.length];
    const icon = icons[i % icons.length];
    const displayName = tmpl.name.replace(/\.[^/.]+$/, ""); // Remove extension
    
    return `
      <div class="forms-template-card" data-filename="${tmpl.name}" style="border-left-color: var(--${color});">
        <div class="ftc-body">
          <div class="ftc-label">TEMPLATE</div>
          <div class="ftc-val">${displayName}</div>
          <div class="ftc-sub">Opens in Microsoft Word</div>
        </div>
        <div class="ftc-icon" style="background: var(--${color}-light); color: var(--${color});">
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
      if (!confirm(`Delete template "${filename}"?`)) return;
      await window.api.deleteTemplate(filename);
      await loadTemplates();
      showToast('Template deleted successfully.', 'success');
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
    const docs = await window.api.getAllDocuments();
    allDocs = docs || [];
    filterDocuments(document.getElementById('docs-search-input')?.value || '');
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

  fileList.innerHTML = pageDocs.map(doc => {
    let driveBadge = '';
    let driveAction = '';
    if (doc.driveStatus === 'uploaded') {
      driveBadge = '<span style="font-size: 11px; padding: 2px 6px; background: #E6F4EA; color: #137333; border-radius: 4px; margin-left: 8px;">☁ On Drive</span>';
      driveAction = `<button class="btn btn-sm btn-ghost doc-drive-link-btn" data-link="${doc.driveLink}">Open on Drive</button>`;
    } else if (doc.driveStatus === 'failed') {
      driveBadge = '<span style="font-size: 11px; padding: 2px 6px; background: #FCE8E6; color: #C5221F; border-radius: 4px; margin-left: 8px;">⚠ Failed</span>';
      driveAction = `<button class="btn btn-sm btn-ghost doc-upload-btn">Retry</button>`;
    } else {
      driveBadge = '<span style="font-size: 11px; padding: 2px 6px; background: #F1F3F4; color: #5F6368; border-radius: 4px; margin-left: 8px;">↑ Local</span>';
      driveAction = `<button class="btn btn-sm btn-ghost doc-upload-btn">Upload</button>`;
    }

    return `
    <div class="doc-row" data-id="${doc.id}" data-path="${doc.localPath}">
      <div class="doc-icon">${getFileIcon(doc.fileName)}</div>
      <div class="doc-info">
        <div class="doc-name">${doc.fileName}</div>
        <div class="doc-meta">${formatSize(doc.fileSize)} &nbsp;·&nbsp; Added ${formatDate(doc.addedAt)} ${driveBadge}</div>
      </div>
      <div class="doc-actions">
        <button class="btn btn-sm btn-ghost doc-open-btn">Open Local</button>
        ${driveAction}
        <button class="btn btn-sm btn-danger-ghost doc-delete-btn">Delete</button>
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

  fileList.querySelectorAll('.doc-upload-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      btn.textContent = '...';
      btn.disabled = true;
      const id = btn.closest('.doc-row').dataset.id;
      try {
        await window.api.driveUploadFile(id);
        showToast('Uploaded to Drive', 'success');
      } catch (e) {
        showToast('Upload failed', 'error');
      }
      await loadDocuments();
      checkDriveStatus();
    });
  });

  fileList.querySelectorAll('.doc-delete-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.closest('.doc-row').dataset.id;
      const doc = filteredDocs.find(d => d.id == id);
      if (!confirm(`Delete "${doc.fileName}"?`)) return;
      await window.api.deleteDocument(id);
      await loadDocuments();
      checkDriveStatus();
      showToast('Document deleted successfully.', 'success');
    });
  });
}

async function handleAddDocument() {
  try {
    showToast('Uploading document...', 'info');
    const result = await window.api.addDocument();
    if (!result || !result.success) {
      if (result?.error) showToast(result.error, 'error');
      return;
    }
    
    // Auto upload check
    const shouldAutoUpload = localStorage.getItem('auto_drive_upload') === 'true';
    if (shouldAutoUpload && result.document) {
      showToast('Adding to Drive...', 'info');
      try {
        await window.api.driveUploadFile(result.document.id);
      } catch(e) {
        // Will just mark as failed and can retry later
      }
    }
    
    await loadDocuments();
    checkDriveStatus();
    showToast('Document uploaded successfully.', 'success');
  } catch (err) {
    showToast('Upload failed. Please try again.', 'error');
    console.error('Add document error:', err);
  }
}

function getFileIcon(filename) {
  const ext = filename.split('.').pop().toLowerCase();
  const icons = {
    pdf: '📄',
    docx: '📝',
    doc: '📝',
    xlsx: '📊',
    xls: '📊',
    jpg: '🖼️',
    jpeg: '🖼️',
    png: '🖼️',
    txt: '📃',
    pptx: '📊',
  };
  return icons[ext] || '📎';
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