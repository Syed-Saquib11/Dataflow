// src/renderer/js/admission-form.js

'use strict';

let admAllStudents = [];
let admCoursesMap = new Map();
let currentAdmStudent = null;

// Pagination state
const ADM_PAGE_SIZE = 20;
let admCurrentPage = 1;
let admFilteredStudents = [];

window.initAdmission = async function () {
  const container = document.getElementById('admission-student-list');
  if (container) {
    container.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--text-muted);">Loading students...</div>';
  }

  try {
    const [students, courses] = await Promise.all([
      window.api.getAllStudents(),
      (window.api.getCourses ? window.api.getCourses() : Promise.resolve([])).catch(() => [])
    ]);

    admAllStudents = students || [];
    admCoursesMap = new Map((courses || []).map(c => [String(c.id), c]));
    
    // Sort: Inactive at bottom, then Recent at top
    admAllStudents.sort((a, b) => {
      const aInact = (String(a.status || '').trim().toLowerCase() === 'inactive') ? 1 : 0;
      const bInact = (String(b.status || '').trim().toLowerCase() === 'inactive') ? 1 : 0;
      if (aInact !== bInact) return aInact - bInact;
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    });

    populateAdmCoursesOption(courses || []);
    bindAdmFilters();
    admCurrentPage = 1;
    renderAdmStudentsList(admAllStudents);

    const sub = document.getElementById('admission-subtitle');
    if (sub) sub.textContent = `Total ${admAllStudents.length} students enrolled`;
  } catch (err) {
    console.error('Failed to load students for Admission Form page:', err);
    if (container) container.innerHTML = `<div style="padding: 20px; text-align: center; color: var(--danger);">Error loading students</div>`;
  }

  // Bind download button
  const btnDwn = document.getElementById('btn-download-form');
  if (btnDwn) {
    btnDwn.addEventListener('click', downloadAdmissionFormPDF);
  }
};

function getAdmInitials(s) {
  let f = (s.firstName || '').trim().charAt(0).toUpperCase();
  let l = (s.lastName || '').trim().charAt(0).toUpperCase();
  if (!f && !l) return '?';
  return f + l;
}

function getAdmCourseText(s) {
  let cid = String(s.courseId || '');
  let cItem = admCoursesMap.get(cid);
  return cItem ? (cItem.name || cItem.code || 'Unknown') : '—';
}

function populateAdmCoursesOption(courses) {
  const el = document.getElementById('admission-filter-course');
  if (!el) return;

  const options = courses
    .filter(x => x.id !== null && x.id !== undefined)
    .sort((a, b) => String(a.name || a.code || '').localeCompare(String(b.name || b.code || '')))
    .map(x => `<option value="${x.id}">${x.name || x.code || 'Course'}</option>`)
    .join('');

  el.innerHTML = `<option value="">All Courses</option>${options}`;
}

function bindAdmFilters() {
  const inpSearch = document.getElementById('admission-search');
  const selCourse = document.getElementById('admission-filter-course');

  const applyFilters = () => {
    let q = (inpSearch?.value || '').toLowerCase().trim();
    let c = selCourse?.value || '';

    let res = admAllStudents.filter(s => {
      if (c && String(s.courseId || '') !== c) return false;
      if (q) {
        let fn = (s.firstName || '').toLowerCase();
        let ln = (s.lastName || '').toLowerCase();
        let roll = (s.rollNumber || '').toLowerCase();
        let sid = (s.studentId || '').toLowerCase();
        if (!fn.includes(q) && !ln.includes(q) && !roll.includes(q) && !sid.includes(q)) return false;
      }
      return true;
    });

    admCurrentPage = 1;
    renderAdmStudentsList(res);
  };

  if (inpSearch) inpSearch.addEventListener('input', applyFilters);
  if (selCourse) selCourse.addEventListener('change', applyFilters);
}

window.admGoToPage = function(page) {
  const totalPages = Math.ceil(admFilteredStudents.length / ADM_PAGE_SIZE);
  if (page < 1 || page > totalPages) return;
  admCurrentPage = page;
  renderAdmPage();
};

function renderAdmStudentsList(students) {
  admFilteredStudents = students;
  admCurrentPage = Math.min(admCurrentPage, Math.max(1, Math.ceil(students.length / ADM_PAGE_SIZE)));
  renderAdmPage();
}

function renderAdmPage() {
  const container = document.getElementById('admission-student-list');
  if (!container) return;

  const students = admFilteredStudents;

  if (students.length === 0) {
    container.innerHTML = `<div style="padding: 20px; text-align: center; color: var(--text-muted);">No students match filter.</div>`;
    renderAdmPagination(0, 0);
    return;
  }

  const totalPages = Math.ceil(students.length / ADM_PAGE_SIZE);
  const startIdx = (admCurrentPage - 1) * ADM_PAGE_SIZE;
  const endIdx = Math.min(startIdx + ADM_PAGE_SIZE, students.length);
  const pageStudents = students.slice(startIdx, endIdx);

  container.innerHTML = pageStudents.map((s, i) => {
    const fullName = `${s.firstName || ''} ${s.lastName || ''}`.trim();
    const isInactive = s.status === 'Inactive';
    const cTxt = getAdmCourseText(s);
    
    let avatarInner = s.photo_path 
       ? `<img src="file://${s.photo_path}" />`
       : getAdmInitials(s);

    let activeCls = (currentAdmStudent && currentAdmStudent.id === s.id) ? 'active' : '';
    let baseOpacity = isInactive ? 0.6 : 1;
    let delay = i * 0.04;

    return `
      <div class="adm-student-item ${activeCls}" style="--dynamic-opacity: ${baseOpacity}; opacity: 0; animation: waterfallSlideIn 0.5s cubic-bezier(0.2, 0.8, 0.2, 1) ${delay}s forwards;" onclick="selectStudentForAdmission(${s.id})">
        <div class="adm-avatar">
          ${avatarInner}
        </div>
        <div class="adm-student-info">
          <div class="adm-student-base-name">${fullName}</div>
          <div class="adm-student-sub">
            <span style="font-weight: 500;">Roll: ${s.rollNumber || '—'}</span>
            ${cTxt !== '—' ? `<span class="adm-course-badge">${cTxt}</span>` : ''}
          </div>
        </div>
      </div>
    `;
  }).join('');

  renderAdmPagination(totalPages, students.length);
  container.scrollTop = 0;
}

function renderAdmPagination(totalPages, totalStudents) {
  let paginationEl = document.getElementById('admission-pagination');
  
  if (!paginationEl) {
    paginationEl = document.createElement('div');
    paginationEl.id = 'admission-pagination';
    paginationEl.className = 'adm-pagination';
    const listContainer = document.getElementById('admission-student-list');
    if (listContainer && listContainer.parentNode) {
      listContainer.parentNode.appendChild(paginationEl);
    }
  }

  if (totalPages <= 1) {
    paginationEl.innerHTML = totalStudents > 0
      ? `<span style="font-size: 13px; color: var(--text-secondary);">${totalStudents} student${totalStudents !== 1 ? 's' : ''}</span>`
      : '';
    return;
  }

  const startIdx = (admCurrentPage - 1) * ADM_PAGE_SIZE + 1;
  const endIdx = Math.min(admCurrentPage * ADM_PAGE_SIZE, totalStudents);

  let pageButtons = '';
  let startPage = Math.max(1, admCurrentPage - 2);
  let endPage = Math.min(totalPages, startPage + 4);
  if (endPage - startPage < 4) startPage = Math.max(1, endPage - 4);

  if (startPage > 1) {
    pageButtons += `<button class="adm-page-btn" onclick="admGoToPage(1)">1</button>`;
    if (startPage > 2) pageButtons += `<span style="color: var(--text-muted); padding: 0 4px;">…</span>`;
  }

  for (let p = startPage; p <= endPage; p++) {
    const activeClass = p === admCurrentPage ? 'active' : '';
    pageButtons += `<button class="adm-page-btn ${activeClass}" onclick="admGoToPage(${p})">${p}</button>`;
  }

  if (endPage < totalPages) {
    if (endPage < totalPages - 1) pageButtons += `<span style="color: var(--text-muted); padding: 0 4px;">…</span>`;
    pageButtons += `<button class="adm-page-btn" onclick="admGoToPage(${totalPages})">${totalPages}</button>`;
  }

  paginationEl.innerHTML = `
    <span style="font-size: 13px; color: var(--text-secondary);">${startIdx}–${endIdx} of ${totalStudents}</span>
    <div class="adm-page-nav">
      <button class="adm-page-btn" ${admCurrentPage <= 1 ? 'disabled' : ''} onclick="admGoToPage(${admCurrentPage - 1})">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
      </button>
      ${pageButtons}
      <button class="adm-page-btn" ${admCurrentPage >= totalPages ? 'disabled' : ''} onclick="admGoToPage(${admCurrentPage + 1})">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
      </button>
    </div>
  `;
}

window.selectStudentForAdmission = async function(id) {
  // Fetch fresh data in case it was just edited
  const freshStudent = await window.api.getStudentById(id);
  if (!freshStudent) return;
  
  // Update local array
  const idx = admAllStudents.findIndex(s => s.id === id);
  if (idx !== -1) admAllStudents[idx] = freshStudent;

  currentAdmStudent = freshStudent;
  
  // Re-render list to show active state
  const inpSearch = document.getElementById('admission-search');
  if (inpSearch) inpSearch.dispatchEvent(new Event('input', { bubbles: true }));

  document.getElementById('admission-empty-state').style.display = 'none';
  
  const missingFields = validateStudentData(currentAdmStudent);
  const errorState = document.getElementById('admission-error-state');
  
  if (missingFields.length > 0) {
    document.getElementById('admission-preview-container').style.display = 'none';
    errorState.style.display = 'flex';
    const ul = document.getElementById('admission-missing-fields');
    ul.innerHTML = missingFields.map(f => `<li>• ${f}</li>`).join('');

    let editBtn = document.getElementById('adm-error-edit-btn');
    if (!editBtn) {
      editBtn = document.createElement('button');
      editBtn.id = 'adm-error-edit-btn';
      editBtn.className = 'btn btn-primary';
      editBtn.style.marginTop = '20px';
      editBtn.innerHTML = `
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 8px; vertical-align: middle;">
          <path d="M12 20h9"/>
          <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/>
        </svg>
        Edit Student Profile
      `;
      errorState.appendChild(editBtn);
    }
    editBtn.onclick = () => {
      if (typeof window.openViewModal === 'function') {
        window.openViewModal(currentAdmStudent.id);
      }
    };
  } else {
    errorState.style.display = 'none';
    document.getElementById('admission-preview-container').style.display = 'flex';
    populateAdmissionPreview(currentAdmStudent);
  }
};

function validateStudentData(s) {
  const missing = [];
  if (!s.admissionDate) missing.push("Date of Admission");
  if (!s.photo_path) missing.push("Student Photo");
  if (!s.firstName) missing.push("First Name");
  if (!s.courseId) missing.push("Course");
  if (!s.dob) missing.push("Date of Birth");
  if (!s.sex) missing.push("Sex");
  if (!s.category) missing.push("Category");
  if (!s.qualification) missing.push("Educational Qualification");
  if (!s.fatherName) missing.push("Father's Name");
  if (!s.motherName) missing.push("Mother's Name");
  if (!s.address) missing.push("Address");
  if (!s.phone && !s.parentPhone) missing.push("Mobile Number");
  if (s.feeAmount === null || s.feeAmount === undefined || s.feeAmount === '') missing.push("Fee Details");
  
  return missing;
}

function populateAdmissionPreview(s) {
  const fullName = `${s.firstName || ''} ${s.lastName || ''}`.trim();
  
  document.getElementById('adm-val-date').textContent = s.admissionDate || '';
  document.getElementById('adm-val-name').textContent = fullName;
  document.getElementById('adm-val-course').textContent = getAdmCourseText(s);
  document.getElementById('adm-val-dob').textContent = s.dob || '';
  document.getElementById('adm-val-sex').textContent = s.sex || '';
  document.getElementById('adm-val-category').textContent = s.category || '';
  document.getElementById('adm-val-qual').textContent = s.qualification || '';
  document.getElementById('adm-val-father').textContent = s.fatherName || '';
  document.getElementById('adm-val-mother').textContent = s.motherName || '';
  document.getElementById('adm-val-address').textContent = s.address || '';
  document.getElementById('adm-val-mobile').textContent = [s.phone, s.parentPhone].filter(Boolean).join(' / ');

  const photoImg = document.getElementById('adm-photo');
  const photoPlaceholder = document.getElementById('adm-photo-placeholder');
  
  if (s.photo_path) {
    photoImg.src = `file://${s.photo_path}`;
    photoImg.style.display = 'block';
    photoPlaceholder.style.display = 'none';
  } else {
    photoImg.style.display = 'none';
    photoPlaceholder.style.display = 'block';
  }
}

async function downloadAdmissionFormPDF() {
  if (!currentAdmStudent) return;
  
  if (typeof html2canvas === 'undefined' || typeof window.jspdf === 'undefined') {
    alert("Required libraries (html2canvas or jsPDF) are missing!");
    return;
  }

  const { jsPDF } = window.jspdf;
  const formElem = document.getElementById('admission-form-preview');
  const btn = document.getElementById('btn-download-form');
  
  const originalHtml = btn.innerHTML;
  btn.innerHTML = 'Generating PDF...';
  btn.disabled = true;

  try {
    // Make sure we capture it in good quality
    const canvas = await html2canvas(formElem, {
      scale: 3, 
      useCORS: true,
      backgroundColor: '#ffffff'
    });

    const imgData = canvas.toDataURL('image/png');
    
    // A4 dimensions at 72 PPI (standard) are 595.28 x 841.89
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    // Add image to PDF
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);

    const fullName = `${currentAdmStudent.firstName || ''} ${currentAdmStudent.lastName || ''}`.trim().replace(/\s+/g, '_');
    const filename = `${fullName}_Admission_Form.pdf`;
    
    pdf.save(filename);

    const toast = document.getElementById('admission-toast');
    if (toast) {
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 3500);
    }
  } catch (err) {
    console.error("PDF generation failed", err);
    alert("Failed to generate PDF: " + err.message);
  } finally {
    btn.innerHTML = originalHtml;
    btn.disabled = false;
  }
}
