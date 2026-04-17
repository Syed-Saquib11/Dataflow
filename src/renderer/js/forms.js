'use strict';

let allDocs = [];
let filteredDocs = [];
let allForms = [];
let currentDocsPage = 1;
const DOCS_PER_PAGE = 5;
let unsubscribeDocsWatcher = null;
let refreshTimer = null;

const CATEGORY_STYLES = {
  registration: { icon: '📋', tint: 'rgba(99,102,241,0.12)', color: '#6366f1', badge: 'rgba(99,102,241,0.12)' },
  leave: { icon: '🗓️', tint: 'rgba(245,158,11,0.12)', color: '#ea580c', badge: 'rgba(245,158,11,0.14)' },
  feedback: { icon: '💬', tint: 'rgba(16,185,129,0.12)', color: '#10b981', badge: 'rgba(16,185,129,0.14)' },
  exam: { icon: '📝', tint: 'rgba(239,68,68,0.12)', color: '#ef4444', badge: 'rgba(239,68,68,0.14)' },
  default: { icon: '📄', tint: 'rgba(59,130,246,0.12)', color: '#3b82f6', badge: 'rgba(59,130,246,0.14)' }
};

window.initForms = async function () {
  bindFormsEvents();
  subscribeToRealtimeChanges();
  await refreshFormsPageData();
};

window.destroyForms = function () {
  if (typeof unsubscribeDocsWatcher === 'function') {
    unsubscribeDocsWatcher();
    unsubscribeDocsWatcher = null;
  }
  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = null;
  }
};

function subscribeToRealtimeChanges() {
  if (window.api.onFormsDocumentsChanged) {
    unsubscribeDocsWatcher = window.api.onFormsDocumentsChanged(async () => {
      await refreshFormsPageData();
    });
  }
  refreshTimer = setInterval(() => {
    refreshFormsPageData();
  }, 8000);
}

function bindFormsEvents() {
  document.getElementById('btn-import-pc')?.addEventListener('click', () => {
    const fileInput = document.getElementById('hidden-doc-file-input');
    fileInput.click();
  });

  document.getElementById('btn-generate-admission')?.addEventListener('click', () => openAdmissionTemplate());
  document.getElementById('btn-generate-admission-inline')?.addEventListener('click', () => openAdmissionTemplate());

  document.getElementById('btn-add-document')?.addEventListener('click', () => {
    const fileInput = document.getElementById('hidden-doc-file-input');
    fileInput.click();
  });

  document.getElementById('btn-upload-docs')?.addEventListener('click', () => {
    const fileInput = document.getElementById('hidden-doc-file-input');
    fileInput.click();
  });

  document.getElementById('hidden-doc-file-input')?.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadDocumentWithProgress(file);
    e.target.value = '';
  });

  document.querySelectorAll('.forms-tabs .tests-tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      setActiveTab(btn.dataset.panel);
      if (btn.id === 'tab-gen-admission') {
        openAdmissionTemplate();
      }
    });
  });

  const dropZone = document.getElementById('upload-drop-zone');
  ['dragenter', 'dragover'].forEach((eventName) => {
    dropZone?.addEventListener(eventName, (event) => {
      event.preventDefault();
      dropZone.classList.add('drag-over');
    });
  });
  ['dragleave', 'drop'].forEach((eventName) => {
    dropZone?.addEventListener(eventName, (event) => {
      event.preventDefault();
      dropZone.classList.remove('drag-over');
    });
  });
  dropZone?.addEventListener('drop', async (event) => {
    const file = event.dataTransfer?.files?.[0];
    if (!file) return;
    await uploadDocumentWithProgress(file);
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

function setActiveTab(panelId) {
  document.querySelectorAll('.forms-tabs .tests-tab-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.panel === panelId);
  });
  document.querySelectorAll('.forms-tab-panel').forEach((panel) => {
    panel.style.display = panel.id === panelId ? 'block' : 'none';
  });
}

async function refreshFormsPageData() {
  await Promise.all([loadForms(), loadDocuments(), loadStats()]);
}

async function loadStats() {
  try {
    const stats = await window.api.getFormsDashboardStats();
    if (!stats || !stats.success) return;
    setStatText('stat-total-forms', stats.totalForms);
    setStatText('stat-total-submissions', stats.totalSubmissions);
    setStatText('stat-docs-uploaded', stats.documentsUploaded);
    setStatText('stat-admission-forms', stats.admissionFormsToday);
  } catch (err) {
    console.error('Failed to load forms stats:', err);
  }
}

function setStatText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = String(value ?? 0);
}

async function loadForms() {
  try {
    const result = await window.api.getFormsOverview();
    allForms = (result && result.success && Array.isArray(result.forms)) ? result.forms : [];
    renderFormsGrid(allForms);
  } catch (err) {
    console.error('Failed to load forms:', err);
    allForms = [];
    renderFormsGrid(allForms);
  }
}

async function loadDocuments() {
  try {
    const docs = await window.api.getDocuments();
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
    filteredDocs = allDocs.filter(doc => doc.name.toLowerCase().includes(lowerQuery));
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

  fileList.innerHTML = pageDocs.map(doc => `
    <div class="doc-row" data-filename="${doc.name}">
      <div class="doc-icon">${getFileIcon(doc.name)}</div>
      <div class="doc-info">
        <div class="doc-name">${doc.name}</div>
        <div class="doc-meta">${formatSize(doc.size)} &nbsp;·&nbsp; Added ${formatDate(doc.addedAt)}</div>
      </div>
      <div class="doc-actions">
        <button class="btn btn-sm btn-ghost doc-open-btn">Open</button>
        <button class="btn btn-sm btn-danger-ghost doc-delete-btn">Delete</button>
      </div>
    </div>
  `).join('');

  if (pagination) {
    pagination.style.display = 'flex';
    if (pageInfo) pageInfo.textContent = `Showing ${pageDocs.length} of ${docs.length} documents`;
    
    document.getElementById('btn-docs-prev').disabled = currentDocsPage === 1;
    document.getElementById('btn-docs-next').disabled = currentDocsPage === totalPages;
  }

  fileList.querySelectorAll('.doc-open-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const filename = btn.closest('.doc-row').dataset.filename;
      window.api.openDocument(filename);
    });
  });

  fileList.querySelectorAll('.doc-delete-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const filename = btn.closest('.doc-row').dataset.filename;
      if (!confirm(`Delete "${filename}"?`)) return;
      await window.api.deleteDocument(filename);
      await refreshFormsPageData();
      showToast('Document deleted successfully.', 'success');
    });
  });
}

function renderFormsGrid(forms) {
  const formsGrid = document.getElementById('forms-grid');
  if (!formsGrid) return;
  if (!forms.length) {
    formsGrid.innerHTML = `
      <div class="docs-empty" style="grid-column:1 / -1;">
        <p>No forms available yet.</p>
      </div>
    `;
    return;
  }

  formsGrid.innerHTML = forms.map((form) => {
    const style = getCategoryStyle(form.category);
    const fields = Array.isArray(form.fields) ? form.fields : [];
    const visibleFields = fields.slice(0, 4);
    const moreCount = Math.max(fields.length - visibleFields.length, 0);
    return `
      <div class="form-card" data-form-id="${form.id}">
        <div class="form-card-top">
          <div class="form-card-icon" style="background:${style.tint};color:${style.color};">${style.icon}</div>
          <span class="form-card-badge" style="background:${style.badge};color:${style.color};">${escapeHtml(form.category || 'General')}</span>
        </div>
        <h3 style="font-size:16px;font-family:var(--font-display);font-weight:700;margin:0 0 6px 0;">${escapeHtml(form.title)}</h3>
        <p style="font-size:13px;color:var(--text-secondary);margin:0 0 16px 0;line-height:1.4;">${escapeHtml(form.description || 'No description provided.')}</p>
        <div class="form-fields">
          ${visibleFields.map((field) => `<span class="form-field-tag">${escapeHtml(field)}</span>`).join('')}
          ${moreCount > 0 ? `<span class="form-field-tag">+${moreCount} more</span>` : ''}
        </div>
        <div class="form-card-footer">
          <span style="font-size:12px;color:var(--text-secondary);font-weight:500;">${Number(form.submissionCount || 0)} submissions</span>
          <div class="form-action-row">
            <button class="btn-icon-sq form-edit-btn" title="Edit">✏️</button>
            <button class="btn-icon-sq form-download-btn" title="Download">⬇️</button>
            <button class="btn-icon-sq form-share-btn" title="Share">🔗</button>
            <button class="btn-icon-sq form-delete-btn" title="Delete" style="color:var(--danger);">🗑️</button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  formsGrid.querySelectorAll('.form-edit-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const form = getFormFromButton(btn);
      if (!form) return;
      openFormEditor(form);
    });
  });

  formsGrid.querySelectorAll('.form-download-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const form = getFormFromButton(btn);
      if (!form) return;
      downloadFormAsPdf(form);
    });
  });

  formsGrid.querySelectorAll('.form-share-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const form = getFormFromButton(btn);
      if (!form) return;
      await shareFormLink(form);
    });
  });

  formsGrid.querySelectorAll('.form-delete-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const form = getFormFromButton(btn);
      if (!form) return;
      await handleDeleteForm(form);
    });
  });
}

function getFormFromButton(btn) {
  const formId = Number(btn.closest('.form-card')?.dataset.formId);
  return allForms.find((item) => item.id === formId);
}

function openFormEditor(form) {
  if (form.sourceType === 'students') {
    window.api.openTemplate('non-diploma');
    return;
  }
  if (form.category?.toLowerCase() === 'leave') {
    window.api.openTemplate('diploma');
    return;
  }
  showToast(`Editor for "${form.title}" will be available soon.`, 'info');
}

function downloadFormAsPdf(form) {
  if (form.sourceType === 'students' || form.category?.toLowerCase() === 'leave') {
    window.api.openTemplate(form.sourceType === 'students' ? 'non-diploma' : 'diploma');
    showToast('Template opened for download.', 'success');
    return;
  }
  showToast('No PDF template linked for this form yet.', 'info');
}

async function shareFormLink(form) {
  const slug = `${String(form.title || 'form').toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${form.id}`;
  const link = `https://dataflow.local/forms/${slug}`;
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(link);
    showToast('Shareable link copied to clipboard.', 'success');
  } else {
    alert(link);
  }
}

async function handleDeleteForm(form) {
  if (!confirm(`Delete form "${form.title}"?`)) return;
  const result = await window.api.deleteForm(form.id);
  if (!result || !result.success) {
    showToast(result?.error || 'Could not delete form.', 'error');
    return;
  }
  await refreshFormsPageData();
  showToast('Form deleted successfully.', 'success');
}

async function uploadDocumentWithProgress(file) {
  startUploadProgress();
  try {
    const path = file.path;
    if (!path) throw new Error('This file has no local path.');
    const result = await window.api.addDocumentByPath(path);
    finishUploadProgress();
    if (!result || !result.success) {
      showToast(result?.error || 'Upload failed.', 'error');
      return;
    }
    await refreshFormsPageData();
    showToast('Document uploaded successfully.', 'success');
  } catch (err) {
    finishUploadProgress(true);
    showToast('Upload failed. Please try again.', 'error');
    console.error('Add document error:', err);
  }
}

function startUploadProgress() {
  const wrap = document.getElementById('upload-progress-wrap');
  const bar = document.getElementById('upload-progress-bar');
  if (!wrap || !bar) return;
  wrap.style.display = 'block';
  let progress = 0;
  bar.dataset.uploading = 'true';
  bar.style.width = '0%';

  const tick = () => {
    if (bar.dataset.uploading !== 'true') return;
    progress = Math.min(progress + Math.floor(Math.random() * 12) + 6, 92);
    bar.style.width = `${progress}%`;
    setTimeout(tick, 150);
  };
  tick();
}

function finishUploadProgress(isError = false) {
  const wrap = document.getElementById('upload-progress-wrap');
  const bar = document.getElementById('upload-progress-bar');
  if (!wrap || !bar) return;
  bar.dataset.uploading = 'false';
  bar.style.width = isError ? '0%' : '100%';
  setTimeout(() => {
    wrap.style.display = 'none';
    bar.style.width = '0%';
  }, isError ? 250 : 500);
}

function openAdmissionTemplate() {
  window.api.openTemplate('diploma');
}

function getCategoryStyle(category) {
  const key = String(category || 'default').toLowerCase();
  return CATEGORY_STYLES[key] || CATEGORY_STYLES.default;
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

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function showToast(message, type = 'info') {
  if (typeof window.showToast === 'function') {
    window.showToast(message, type);
  }
}