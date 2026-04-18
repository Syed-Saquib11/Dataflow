'use strict';

let allDocs = [];
let filteredDocs = [];
let currentDocsPage = 1;
const DOCS_PER_PAGE = 5;
let refreshTimer = null;

window.initForms = async function () {
  bindFormsEvents();
  await loadDocuments();
  startAutoRefresh();
};

window.destroyForms = function () {
  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = null;
  }
};

function bindFormsEvents() {
  document.getElementById('btn-open-diploma')
    ?.addEventListener('click', () => window.api.openTemplate('diploma'));

  document.getElementById('btn-add-document')?.addEventListener('click', () => {
    handleAddDocument();
  });

  document.getElementById('btn-open-nondiploma')
    ?.addEventListener('click', () => window.api.openTemplate('non-diploma'));

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
    loadDocuments();
  }, 5000);
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
      await loadDocuments();
      showToast('Document deleted successfully.', 'success');
    });
  });
}

async function handleAddDocument() {
  try {
    const result = await window.api.addDocument();
    if (!result || !result.success) {
      if (result?.error) showToast(result.error, 'error');
      return;
    }
    await loadDocuments();
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