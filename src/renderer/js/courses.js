// ═══════════════════════════════════════════════════════════
//  COURSES.JS
//  Exported init fn: initCourses()
//  Called by router.js after courses.html is injected.
//
//  Storage: window.api.getCourses() / saveCourses()
//  These IPC handlers must be wired in main.js + preload.js
// ═══════════════════════════════════════════════════════════

const COURSE_GRADIENTS = [
    { key:'blue',   grad:'linear-gradient(135deg,#5b6ef5 0%,#7c52e8 100%)', dot:'#5b6ef5', tagBg:'rgba(91,110,245,.1)',  tagC:'#4f5bd5' },
    { key:'teal',   grad:'linear-gradient(135deg,#1ec99e 0%,#17a98a 100%)', dot:'#1ec99e', tagBg:'rgba(30,201,158,.1)',  tagC:'#0e9b7a' },
    { key:'red',    grad:'linear-gradient(135deg,#f87171 0%,#f97316 100%)', dot:'#f97316', tagBg:'rgba(249,115,22,.1)',  tagC:'#d97706' },
    { key:'orange', grad:'linear-gradient(135deg,#fb923c 0%,#f59e0b 100%)', dot:'#fb923c', tagBg:'rgba(251,146,60,.1)',  tagC:'#d97706' },
    { key:'sky',    grad:'linear-gradient(135deg,#38bdf8 0%,#6366f1 100%)', dot:'#38bdf8', tagBg:'rgba(56,189,248,.1)',  tagC:'#0284c7' },
    { key:'purple', grad:'linear-gradient(135deg,#a78bfa 0%,#ec4899 100%)', dot:'#a78bfa', tagBg:'rgba(167,139,250,.1)', tagC:'#7c3aed' },
  ];
  
  // ── MODULE STATE (reset on each initCourses call) ──────────
  let _courses    = [];
  let _selKey     = 'blue';
  let _delPending = null;
  
  // ── ENTRY POINT ────────────────────────────────────────────
  async function initCourses() {
    // Reset state
    _courses    = [];
    _selKey     = 'blue';
    _delPending = null;

    // Defensive: ensure modals are not shown on page entry.
    // (Prevents "ghost open" when navigating into Courses.)
    const addModal = document.getElementById('add-course-modal');
    const delModal = document.getElementById('delete-course-modal');
    if (addModal) addModal.classList.remove('active');
    if (delModal) delModal.classList.remove('active');
  
    // Load from backend
    try {
      _courses = (await window.api.getCourses()) || [];
    } catch (e) {
      console.warn('[Courses] Could not load from backend, using empty list:', e);
      _courses = [];
    }
  
    // Wire buttons
    document.getElementById('open-add-course-btn').addEventListener('click', openCourseModal);
    document.getElementById('hint-add-btn').addEventListener('click', openCourseModal);
    document.getElementById('close-course-modal').addEventListener('click', closeCourseModal);
    document.getElementById('cancel-course-modal').addEventListener('click', closeCourseModal);
    document.getElementById('submit-course').addEventListener('click', doAddCourse);
    document.getElementById('cancel-delete-course').addEventListener('click', closeDeleteModal);
    document.getElementById('confirm-delete-course').addEventListener('click', () => {
      if (_delPending !== null) deleteCourse(_delPending);
      closeDeleteModal();
    });
  
    // Backdrop close
    document.getElementById('add-course-modal').addEventListener('click', (e) => {
      if (e.target.id === 'add-course-modal') closeCourseModal();
    });
    document.getElementById('delete-course-modal').addEventListener('click', (e) => {
      if (e.target.id === 'delete-course-modal') closeDeleteModal();
    });
  
    // Live preview inputs
    document.getElementById('ac-name').addEventListener('input', livePreview);
    document.getElementById('ac-code').addEventListener('input', livePreview);
    document.getElementById('ac-level').addEventListener('change', livePreview);
    document.getElementById('ac-days').addEventListener('input', livePreview);
    document.getElementById('ac-time').addEventListener('input', livePreview);
    document.getElementById('ac-dur').addEventListener('input', livePreview);
  
    // Keyboard shortcut: Escape closes modals
    document.addEventListener('keydown', _courseKeyHandler);
  
    buildColorPicker();
    renderCourses();
    updateCourseStats();
  }
  
  // Cleanup when navigating away
  function destroyCourses() {
    document.removeEventListener('keydown', _courseKeyHandler);
  }
  
  function _courseKeyHandler(e) {
    if (e.key === 'Escape') {
      closeCourseModal();
      closeDeleteModal();
    }
    if (e.key === 'Enter') {
      // Don't trigger if in a textarea (Topics field)
      if (document.activeElement.tagName === 'TEXTAREA') return;

      const addModal = document.getElementById('add-course-modal');
      const delModal = document.getElementById('delete-course-modal');

      if (addModal && addModal.classList.contains('active')) {
        e.preventDefault();
        doAddCourse();
      } else if (delModal && delModal.classList.contains('active')) {
        e.preventDefault();
        if (_delPending !== null) deleteCourse(_delPending);
        closeDeleteModal();
      }
    }
  }
  
  // ── RENDER ──────────────────────────────────────────────────
  function renderCourses() {
    const sec  = document.getElementById('added-section');
    const grid = document.getElementById('added-grid');
    const hint = document.getElementById('custom-hint');
  
    if (!_courses.length) {
      sec.style.display  = 'none';
      hint.style.display = 'block';
    } else {
      sec.style.display  = 'block';
      hint.style.display = 'none';
      grid.innerHTML = _courses.map((c, i) => courseCardHTML(c, i)).join('');
  
      // Wire delete buttons after render
      grid.querySelectorAll('[data-del-id]').forEach(btn => {
        btn.addEventListener('click', () => askDeleteCourse(Number(btn.dataset.delId)));
      });
    }
  }
  
  function courseCardHTML(c, i) {
    const dot      = c.g.dot;
    const topics   = c.topics || [];
    const topicsHtml = topics.map(t => `
      <li class="dyn-topic">
        <span style="width:9px;height:9px;border-radius:50%;flex-shrink:0;background:${dot};box-shadow:0 0 7px ${dot}88"></span>
        ${esc(t)}
      </li>`).join('') || `<li style="color:var(--muted);font-size:14px;padding:8px 0">No topics listed.</li>`;
  
    return `<div class="dyn-card" style="animation-delay:${0.45 + i * 0.1}s">
      <div class="dyn-banner" style="background:${c.g.grad}">
        <div class="dyn-banner-inner">
          <div>
            <div class="dyn-name">${esc(c.name)}</div>
            <div class="dyn-code">${esc(c.code)}</div>
          </div>
          <span class="dyn-level">${esc(c.level)}</span>
        </div>
      </div>
      <div class="dyn-body">
        ${c.days || c.time ? `<div class="dyn-info-row">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          ${esc([c.days, c.time].filter(Boolean).join(' · '))}
        </div>` : ''}
        ${c.dur ? `<div class="dyn-info-row">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          ${esc(c.dur)}
        </div>` : ''}
        <ul class="dyn-topics">${topicsHtml}</ul>
      </div>
      <div class="dyn-footer">
        <span class="dyn-tag" style="background:${c.g.tagBg};color:${c.g.tagC}">${topics.length} topic${topics.length !== 1 ? 's' : ''}</span>
        <button class="btn-del" data-del-id="${c.id}">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          Remove
        </button>
      </div>
    </div>`;
  }
  
  function updateCourseStats() {
    const totalTopics = _courses.reduce((a, c) => a + (c.topics || []).length, 0);
    document.getElementById('stat-total').textContent  = _courses.length;
    document.getElementById('stat-topics').textContent = totalTopics;
    document.getElementById('stat-custom').textContent = _courses.length;
    document.getElementById('stat-levels').textContent = new Set(_courses.map(c => c.level)).size;
  }
  
  // ── COLOR PICKER ───────────────────────────────────────────
  function buildColorPicker() {
    document.getElementById('color-grid').innerHTML = COURSE_GRADIENTS.map((g, i) =>
      `<div class="color-opt${i === 0 ? ' selected' : ''}" style="background:${g.grad}" data-key="${g.key}"></div>`
    ).join('');
  
    document.getElementById('color-grid').querySelectorAll('.color-opt').forEach(el => {
      el.addEventListener('click', () => {
        _selKey = el.dataset.key;
        document.querySelectorAll('.color-opt').forEach(x => x.classList.remove('selected'));
        el.classList.add('selected');
        livePreview();
      });
    });
  }
  
  // ── LIVE PREVIEW ───────────────────────────────────────────
  function livePreview() {
    const name   = document.getElementById('ac-name').value.trim();
    const code   = document.getElementById('ac-code').value.trim();
    const level  = document.getElementById('ac-level').value;
    const days   = document.getElementById('ac-days').value.trim();
    const time   = document.getElementById('ac-time').value.trim();
    const dur    = document.getElementById('ac-dur').value.trim();
    
    const g      = COURSE_GRADIENTS.find(x => x.key === _selKey);
    const prev   = document.getElementById('course-preview');
  
    document.getElementById('pv-name').textContent  = name  || 'Course Name';
    document.getElementById('pv-code').textContent  = code  || 'COURSE-CODE';
    document.getElementById('pv-level').textContent = level;
    
    const sched = [days, time].filter(Boolean).join(' · ');
    const schedRow = document.getElementById('pv-sched-row');
    if (sched) {
      schedRow.style.display = 'flex';
      document.getElementById('pv-sched').textContent = sched;
    } else {
      schedRow.style.display = 'none';
    }

    const durRow = document.getElementById('pv-dur-row');
    if (dur) {
      durRow.style.display = 'flex';
      document.getElementById('pv-dur').textContent = dur;
    } else {
      durRow.style.display = 'none';
    }

    prev.style.background = g.grad;
    prev.style.display    = (name || code || days || time || dur) ? 'block' : 'none';
  }
  
  // ── MODAL OPEN / CLOSE ─────────────────────────────────────
  function openCourseModal() {
    ['ac-name', 'ac-code', 'ac-days', 'ac-time', 'ac-dur', 'ac-topics'].forEach(id => {
      document.getElementById(id).value = '';
    });
    document.getElementById('ac-level').value = 'Beginner';
    document.getElementById('course-preview').style.display = 'none';
    _selKey = 'blue';
    buildColorPicker();
    document.getElementById('add-course-modal').classList.add('active');
    setTimeout(() => document.getElementById('ac-name').focus(), 150);
  }
  
  function closeCourseModal() {
    document.getElementById('add-course-modal').classList.remove('active');
  }

  function askDeleteCourse(id) {
    _delPending = id;
    document.getElementById('delete-course-modal').classList.add('active');
  }
  
  function closeDeleteModal() {
    document.getElementById('delete-course-modal').classList.remove('active');
    _delPending = null;
  }
  
  // ── ADD COURSE ─────────────────────────────────────────────
  async function doAddCourse() {
    const name   = document.getElementById('ac-name').value.trim();
    const code   = document.getElementById('ac-code').value.trim();
    const level  = document.getElementById('ac-level').value;
    const days   = document.getElementById('ac-days').value.trim();
    const time   = document.getElementById('ac-time').value.trim();
    const dur    = document.getElementById('ac-dur').value.trim();
    const topics = document.getElementById('ac-topics').value.trim()
      .split('\n').map(s => s.trim()).filter(Boolean);
  
    if (!name || !code) {
      showToast('Please enter a course name and code.', 'error');
      return;
    }
  
    const g = COURSE_GRADIENTS.find(x => x.key === _selKey);
    _courses.push({ id: Date.now(), name, code, level, days, time, dur, topics, g });
  
    closeCourseModal();
    await persistCourses();
    renderCourses();
    updateCourseStats();
    showToast(`"${name}" added!`, 'success');
  }
  
  // ── DELETE COURSE ──────────────────────────────────────────
  async function deleteCourse(id) {
    const c = _courses.find(x => x.id === id);
    _courses = _courses.filter(x => x.id !== id);
    await persistCourses();
    renderCourses();
    updateCourseStats();
    showToast(`"${c?.name || 'Course'}" removed.`, 'info');
  }
  
  // ── PERSIST ────────────────────────────────────────────────
  async function persistCourses() {
    try {
      await window.api.saveCourses(_courses);
    } catch (e) {
      showToast('Could not save to disk.', 'error');
      console.error('[Courses] Save error:', e);
    }
  }
  
  // ── UTILS ──────────────────────────────────────────────────
  function esc(s) {
    return String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }