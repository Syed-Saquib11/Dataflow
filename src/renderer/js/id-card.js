// src/renderer/js/id-card.js

'use strict';

let idcardAllStudents = [];
let idcardCoursesMap = new Map();
let currentSelectedStudent = null;

// Pagination state
const IDCARD_PAGE_SIZE = 20;
let idcardCurrentPage = 1;
let idcardFilteredStudents = [];

window.initIdCard = async function () {
  const container = document.getElementById('idcard-student-list');
  if (container) {
    container.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--text-muted);">Loading students...</div>';
  }

  try {
    const [students, courses] = await Promise.all([
      window.api.getAllStudents(),
      (window.api.getCourses ? window.api.getCourses() : Promise.resolve([])).catch(() => [])
    ]);

    idcardAllStudents = students || [];
    idcardCoursesMap = new Map((courses || []).map(c => [String(c.id), c]));
    
    // Sort: Inactive at bottom, then Recent at top
    idcardAllStudents.sort((a, b) => {
      const aInact = (String(a.status || '').trim().toLowerCase() === 'inactive') ? 1 : 0;
      const bInact = (String(b.status || '').trim().toLowerCase() === 'inactive') ? 1 : 0;
      if (aInact !== bInact) return aInact - bInact;
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    });

    populateIdCardCoursesOption(courses || []);
    bindIdCardFilters();
    idcardCurrentPage = 1;
    renderIdCardStudentsList(idcardAllStudents);

    const sub = document.getElementById('idcard-subtitle');
    if (sub) sub.textContent = `Total ${idcardAllStudents.length} students enrolled`;
  } catch (err) {
    console.error('Failed to load students for ID Card page:', err);
    if (container) container.innerHTML = `<div style="padding: 20px; text-align: center; color: var(--danger);">Error loading students</div>`;
  }

  // Bind download button
  const btnDwn = document.getElementById('btn-download-id');
  if (btnDwn) {
    btnDwn.addEventListener('click', downloadIdCard);
  }

  // Bind save to drive button
  const btnDrive = document.getElementById('btn-save-id-drive');
  if (btnDrive) {
    btnDrive.addEventListener('click', saveIdCardToDrive);
  }

  // Bind Sidebar Toggle
  const btnToggle = document.getElementById('idcard-sidebar-toggle');
  const btnOpen = document.getElementById('idcard-sidebar-open');
  const sidebar = document.getElementById('idcard-sidebar');
  if (btnToggle && btnOpen && sidebar) {
    btnToggle.addEventListener('click', () => {
      sidebar.classList.add('collapsed');
      sidebar.style.flex = '0 0 0';
      sidebar.style.width = '0';
      sidebar.style.minWidth = '0';
      sidebar.style.padding = '0';
      sidebar.style.border = 'none';
      sidebar.style.opacity = '0';
      sidebar.style.margin = '0';
      sidebar.style.overflow = 'hidden';
      btnOpen.style.display = 'block';
    });
    btnOpen.addEventListener('click', () => {
      sidebar.classList.remove('collapsed');
      sidebar.style.flex = '0 0 30rem';
      sidebar.style.width = '';
      sidebar.style.minWidth = '';
      sidebar.style.padding = '';
      sidebar.style.border = '';
      sidebar.style.opacity = '1';
      sidebar.style.margin = '';
      sidebar.style.overflow = 'hidden';
      btnOpen.style.display = 'none';
    });
  }
};

function getInitialsId(s) {
  let f = (s.firstName || '').trim().charAt(0).toUpperCase();
  let l = (s.lastName || '').trim().charAt(0).toUpperCase();
  if (!f && !l) return '?';
  return f + l;
}

function getCourseText(s) {
  let cid = String(s.courseId || '');
  let cItem = idcardCoursesMap.get(cid);
  return cItem ? (cItem.code || cItem.name || 'Unknown') : '—';
}

function populateIdCardCoursesOption(courses) {
  const el = document.getElementById('idcard-filter-course');
  if (!el) return;

  const options = courses
    .filter(x => x.id !== null && x.id !== undefined)
    .sort((a, b) => String(a.name || a.code || '').localeCompare(String(b.name || b.code || '')))
    .map(x => `<option value="${x.id}">${x.name || x.code || 'Course'}</option>`)
    .join('');

  el.innerHTML = `<option value="">All Courses</option>${options}`;
}

function bindIdCardFilters() {
  const inpSearch = document.getElementById('idcard-search');
  const selCourse = document.getElementById('idcard-filter-course');

  const applyFilters = () => {
    let q = (inpSearch?.value || '').toLowerCase().trim();
    let c = selCourse?.value || '';

    let res = idcardAllStudents.filter(s => {
      // Course Match
      if (c && String(s.courseId || '') !== c) return false;
      
      // Search Match
      if (q) {
        let fn = (s.firstName || '').toLowerCase();
        let ln = (s.lastName || '').toLowerCase();
        let roll = (s.rollNumber || '').toLowerCase();
        let sid = (s.studentId || '').toLowerCase();
        if (!fn.includes(q) && !ln.includes(q) && !roll.includes(q) && !sid.includes(q)) return false;
      }
      return true;
    });

    idcardCurrentPage = 1; // Reset to page 1 on filter change
    renderIdCardStudentsList(res);
  };

  if (inpSearch) inpSearch.addEventListener('input', applyFilters);
  if (selCourse) selCourse.addEventListener('change', applyFilters);
}

window.idcardGoToPage = function(page) {
  const totalPages = Math.ceil(idcardFilteredStudents.length / IDCARD_PAGE_SIZE);
  if (page < 1 || page > totalPages) return;
  idcardCurrentPage = page;
  renderIdCardPage();
};

function renderIdCardStudentsList(students) {
  idcardFilteredStudents = students;
  idcardCurrentPage = Math.min(idcardCurrentPage, Math.max(1, Math.ceil(students.length / IDCARD_PAGE_SIZE)));
  renderIdCardPage();
}

function renderIdCardPage() {
  const container = document.getElementById('idcard-student-list');
  if (!container) return;

  const students = idcardFilteredStudents;

  if (students.length === 0) {
    container.innerHTML = `<div style="padding: 20px; text-align: center; color: var(--text-muted);">No students match filter.</div>`;
    renderPaginationControls(0, 0);
    return;
  }

  const totalPages = Math.ceil(students.length / IDCARD_PAGE_SIZE);
  const startIdx = (idcardCurrentPage - 1) * IDCARD_PAGE_SIZE;
  const endIdx = Math.min(startIdx + IDCARD_PAGE_SIZE, students.length);
  const pageStudents = students.slice(startIdx, endIdx);

  container.innerHTML = pageStudents.map((s, i) => {
    const fullName = `${s.firstName || ''} ${s.lastName || ''}`.trim();
    const isInactive = s.status === 'Inactive';
    const cTxt = getCourseText(s);
    
    // Fallback initials or photo
    let avatarInner = s.photo_path 
       ? `<img src="file://${s.photo_path}" />`
       : getInitialsId(s);

    let activeCls = (currentSelectedStudent && currentSelectedStudent.id === s.id) ? 'active' : '';
    let baseOpacity = isInactive ? 0.6 : 1;
    let delay = i * 0.04; // 40ms stagger per item

    return `
      <div class="idcard-student-item ${activeCls}" style="--dynamic-opacity: ${baseOpacity}; opacity: 0; animation: waterfallSlideIn 0.5s cubic-bezier(0.2, 0.8, 0.2, 1) ${delay}s forwards;" onclick="selectStudentForIdCard(${s.id})">
        <div class="idcard-avatar">
          ${avatarInner}
        </div>
        <div class="idcard-student-info">
          <div class="idcard-student-base-name">${fullName}</div>
          <div class="idcard-student-sub">
            <span style="font-weight: 500;">Roll: ${s.rollNumber || '—'}</span>
            ${cTxt !== '—' ? `<span class="idcard-course-badge">${cTxt}</span>` : ''}
          </div>
        </div>
      </div>
    `;
  }).join('');

  renderPaginationControls(totalPages, students.length);

  // Scroll list to top on page change
  container.scrollTop = 0;
}

function renderPaginationControls(totalPages, totalStudents) {
  let paginationEl = document.getElementById('idcard-pagination');
  
  // Create the pagination container if it doesn't exist yet
  if (!paginationEl) {
    paginationEl = document.createElement('div');
    paginationEl.id = 'idcard-pagination';
    paginationEl.className = 'idcard-pagination';
    // Insert after the student list container, inside the left panel
    const listContainer = document.getElementById('idcard-student-list');
    if (listContainer && listContainer.parentNode) {
      listContainer.parentNode.appendChild(paginationEl);
    }
  }

  if (totalPages <= 1) {
    paginationEl.innerHTML = totalStudents > 0
      ? `<span class="idcard-page-info">${totalStudents} student${totalStudents !== 1 ? 's' : ''}</span>`
      : '';
    return;
  }

  const startIdx = (idcardCurrentPage - 1) * IDCARD_PAGE_SIZE + 1;
  const endIdx = Math.min(idcardCurrentPage * IDCARD_PAGE_SIZE, totalStudents);

  // Build page number buttons (show max 5 visible pages)
  let pageButtons = '';
  let startPage = Math.max(1, idcardCurrentPage - 2);
  let endPage = Math.min(totalPages, startPage + 4);
  if (endPage - startPage < 4) startPage = Math.max(1, endPage - 4);

  if (startPage > 1) {
    pageButtons += `<button class="idcard-page-btn" onclick="idcardGoToPage(1)">1</button>`;
    if (startPage > 2) pageButtons += `<span class="idcard-page-ellipsis">…</span>`;
  }

  for (let p = startPage; p <= endPage; p++) {
    const activeClass = p === idcardCurrentPage ? 'active' : '';
    pageButtons += `<button class="idcard-page-btn ${activeClass}" onclick="idcardGoToPage(${p})">${p}</button>`;
  }

  if (endPage < totalPages) {
    if (endPage < totalPages - 1) pageButtons += `<span class="idcard-page-ellipsis">…</span>`;
    pageButtons += `<button class="idcard-page-btn" onclick="idcardGoToPage(${totalPages})">${totalPages}</button>`;
  }

  paginationEl.innerHTML = `
    <span class="idcard-page-info">${startIdx}–${endIdx} of ${totalStudents}</span>
    <div class="idcard-page-nav">
      <button class="idcard-page-btn idcard-page-arrow" ${idcardCurrentPage <= 1 ? 'disabled' : ''} onclick="idcardGoToPage(${idcardCurrentPage - 1})">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
      </button>
      ${pageButtons}
      <button class="idcard-page-btn idcard-page-arrow" ${idcardCurrentPage >= totalPages ? 'disabled' : ''} onclick="idcardGoToPage(${idcardCurrentPage + 1})">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
      </button>
    </div>
  `;
}

window.selectStudentForIdCard = function(id) {
  currentSelectedStudent = idcardAllStudents.find(s => s.id === id);
  if (!currentSelectedStudent) return;
  
  // Re-render list to show active state
  // Easiest way (inefficient but fine for small list) is trigger search
  const inpSearch = document.getElementById('idcard-search');
  inpSearch.dispatchEvent(new Event('input', { bubbles: true }));

  // Show right panel content
  document.getElementById('idcard-empty-state').style.display = 'none';
  document.getElementById('idcard-preview-container').style.display = 'flex';

  populateCardPreview(currentSelectedStudent);
};

function populateCardPreview(s) {
  const fullName = `${s.firstName || ''} ${s.lastName || ''}`.trim();
  
  // Elements
  const elName = document.getElementById('idcard-name');
  const elRoll = document.getElementById('idcard-val-roll');
  const elCourse = document.getElementById('idcard-val-course');
  const elParent = document.getElementById('idcard-val-parent');
  const elAddress = document.getElementById('idcard-val-address');
  const elMobile = document.getElementById('idcard-val-mobile');
  const elPhotoImg = document.getElementById('idcard-photo');
  const elPhotoFallback = document.getElementById('idcard-photo-fallback');

  elName.textContent = fullName;
  elRoll.textContent = s.rollNumber || '—';
  elCourse.textContent = getCourseText(s);
  
  let pName = s.parentName || s.fatherName || s.motherName || '—';
  elParent.textContent = pName;
  
  let mobileStr = [s.phone, s.parentPhone].filter(Boolean).join(' / ');
  elMobile.textContent = mobileStr || '—';
  
  elAddress.textContent = s.address || '—';

  // Photo
  if (s.photo_path) {
    elPhotoImg.src = `file://${s.photo_path}`;
    elPhotoImg.style.display = 'block';
    elPhotoFallback.style.display = 'none';
  } else {
    elPhotoImg.style.display = 'none';
    elPhotoFallback.textContent = getInitialsId(s);
    elPhotoFallback.style.display = 'block';
  }
}

function downloadIdCard() {
  if (!currentSelectedStudent) return;
  
  if (typeof html2canvas === 'undefined') {
    alert("html2canvas library is missing! The ID card cannot be generated.");
    return;
  }

  const cardElem = document.getElementById('id-card-preview');
  const btn = document.getElementById('btn-download-id');
  
  // Visual feedback
  const originalHtml = btn.innerHTML;
  btn.innerHTML = 'Generating...';
  btn.disabled = true;

  html2canvas(cardElem, {
    scale: 3, 
    useCORS: true,
    backgroundColor: '#ffffff'
  }).then(canvas => {
    const fullName = `${currentSelectedStudent.firstName || ''} ${currentSelectedStudent.lastName || ''}`.trim().replace(/\s+/g, '_');
    const filename = `${fullName}_ID_DF2026.png`;
    
    canvas.toBlob(blob => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
      
      btn.innerHTML = originalHtml;
      btn.disabled = false;

      // Show toast
      const toast = document.getElementById('idcard-toast');
      if (toast) {
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3500);
      }
    }, 'image/png');
  }).catch(err => {
    console.error("ID Card generation failed", err);
    alert("Failed to generate ID card: " + err.message);
    btn.innerHTML = originalHtml;
    btn.disabled = false;
  });
}

async function saveIdCardToDrive() {
  if (!currentSelectedStudent) return;
  
  if (typeof html2canvas === 'undefined' || typeof window.jspdf === 'undefined') {
    alert("html2canvas or jsPDF library is missing! The ID card cannot be saved to Drive.");
    return;
  }

  const cardElem = document.getElementById('id-card-preview');
  const btn = document.getElementById('btn-save-id-drive');
  
  const originalHtml = btn.innerHTML;
  btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="animation:spin 0.8s linear infinite"><circle cx="12" cy="12" r="10" stroke-opacity="0.3"/><path d="M12 2a10 10 0 0 1 10 10"/></svg> <span id="save-id-drive-text">Saving...</span>`;
  btn.disabled = true;

  try {
    const status = await window.api.googleGetStatus();
    if (!status.connected) {
      btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="animation:spin 0.8s linear infinite"><circle cx="12" cy="12" r="10" stroke-opacity="0.3"/><path d="M12 2a10 10 0 0 1 10 10"/></svg> <span id="save-id-drive-text">Connecting...</span>`;
      const connectRes = await window.api.googleConnect();
      if (!connectRes.success) throw new Error(connectRes.error || "Failed to authenticate with Google");
    }

    const { jsPDF } = window.jspdf;
    const canvas = await html2canvas(cardElem, {
      scale: 3, 
      useCORS: true,
      backgroundColor: '#ffffff'
    });

    const imgData = canvas.toDataURL('image/png');
    const pxToMm = 0.264583;
    const pdfWidth = canvas.width * pxToMm / 3; 
    const pdfHeight = canvas.height * pxToMm / 3;

    const pdf = new jsPDF({
      orientation: pdfWidth > pdfHeight ? 'landscape' : 'portrait',
      unit: 'mm',
      format: [pdfWidth, pdfHeight]
    });

    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    
    const pdfBase64 = pdf.output('datauristring');
    const fullName = `${currentSelectedStudent.firstName || ''} ${currentSelectedStudent.lastName || ''}`.trim().replace(/\s+/g, '_');
    const filename = `${fullName}_ID_Card_DF2026.pdf`;

    const uploadRes = await window.api.uploadIDCard(pdfBase64, filename);
    
    if (!uploadRes || !uploadRes.success) {
      throw new Error((uploadRes && uploadRes.error) || "Upload failed");
    }

    btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg> <span id="save-id-drive-text">Saved!</span>`;
    btn.style.background = '#10b981';
    
    const toast = document.getElementById('idcard-toast');
    if (toast) {
      const originalToast = toast.innerHTML;
      toast.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg> ✅ Saved to Google Drive > ID cards`;
      toast.classList.add('show');
      setTimeout(() => { 
          toast.classList.remove('show');
          setTimeout(() => toast.innerHTML = originalToast, 300);
      }, 3500);
    }
  } catch (err) {
    console.error("Save to drive failed:", err);
    btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg> <span id="save-id-drive-text">Failed</span>`;
    btn.style.background = '#ef4444';
  } finally {
    setTimeout(() => {
      btn.innerHTML = originalHtml;
      btn.style.background = '';
      btn.disabled = false;
    }, 3000);
  }
}

