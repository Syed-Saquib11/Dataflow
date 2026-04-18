// src/renderer/js/id-card.js

'use strict';

let idcardAllStudents = [];
let idcardCoursesMap = new Map();
let currentSelectedStudent = null;

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
    
    // Sort so inactive are at the bottom
    idcardAllStudents.sort((a, b) => {
      const aInact = a.status === 'Inactive' ? 1 : 0;
      const bInact = b.status === 'Inactive' ? 1 : 0;
      return aInact - bInact;
    });

    populateIdCardCoursesOption(courses || []);
    bindIdCardFilters();
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

    renderIdCardStudentsList(res);
  };

  if (inpSearch) inpSearch.addEventListener('input', applyFilters);
  if (selCourse) selCourse.addEventListener('change', applyFilters);
}

function renderIdCardStudentsList(students) {
  const container = document.getElementById('idcard-student-list');
  if (!container) return;

  if (students.length === 0) {
    container.innerHTML = `<div style="padding: 20px; text-align: center; color: var(--text-muted);">No students match filter.</div>`;
    return;
  }

  container.innerHTML = students.map((s, i) => {
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
