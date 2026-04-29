// renderer/js/router.js
// Single-shell router: loads page fragments via preload bridge and runs init hooks.

'use strict';

const ROUTES = {
  dashboard: { fragment: 'dashboard', init: 'initDashboard', destroy: 'destroyDashboard', css: '../css/dashboard.css' },
  students: { fragment: 'students', init: 'initStudents', destroy: 'destroyStudents', css: '../css/student.css' },
  slots: { fragment: 'slots', init: 'initSlots', destroy: 'destroySlots', css: '../css/slots.css' },
  courses: { fragment: 'courses', init: 'initCourses', destroy: 'destroyCourses', css: '../css/courses.css' },
  tests: { fragment: 'tests', init: 'initTests', destroy: 'destroyTests', css: '../css/tests.css' },
  forms: { fragment: 'forms', init: 'initForms', destroy: 'destroyForms', css: '../css/forms.css' },
  fees: { fragment: 'fees', init: 'initFees', destroy: 'destroyFees', css: '../css/fees.css' },
  admission: { fragment: 'admission-form', init: 'initAdmission', css: '../css/admission-form.css' },
  idcard: { fragment: 'id-card', init: 'initIdCard', css: '../css/id-card.css' },
  settings: { fragment: 'settings', init: 'initSettings', destroy: 'destroySettings', css: '../css/settings.css' },
};

let current = null;
let currentDestroy = null;



function setActiveNav(page) {
  document.querySelectorAll('.nav-item[data-page]').forEach(el => {
    el.classList.toggle('active', el.dataset.page === page);
  });
}

async function loadFragment(fragmentName) {
  if (!window.api?.loadFragment) {
    throw new Error('Fragment loader unavailable (window.api.loadFragment missing).');
  }
  return await window.api.loadFragment(fragmentName);
}

async function navigate(page) {
  if (!ROUTES[page]) page = 'dashboard';
  if (current === page) return;

  try { if (typeof currentDestroy === 'function') currentDestroy(); } catch (_) { }
  currentDestroy = null;

  current = page;
  setActiveNav(page);

  const outlet = document.getElementById('main-content');
  outlet.dataset.page = page;

  try {
    const { fragment, init, destroy } = ROUTES[page];

    // 1. Fetch FIRST — outlet still visible with old content
    const html = await loadFragment(fragment);

    // 2. Swap HTML instantly
    outlet.innerHTML = html;

    // 3. Init populates data
    if (init && typeof window[init] === 'function') {
      await window[init]();
    }

    if (destroy && typeof window[destroy] === 'function') {
      currentDestroy = window[destroy];
    }

  } catch (err) {
    outlet.innerHTML = `
      <div class="page-header">
        <div>
          <h2 class="page-title">Something went wrong</h2>
          <p class="page-subtitle">Could not load this section.</p>
        </div>
      </div>
      <div class="page-body">
        <div class="card" style="margin-top:24px;">
          <div style="color:var(--danger); font-weight:700; margin-bottom:6px;">Error</div>
          <div style="color:var(--text-secondary); font-size:13px; white-space:pre-wrap;">${String(err?.message || err)}</div>
        </div>
      </div>
    `;
  }
}

// ── Toast Utility ─────────────────────────────────────
// Usage: showToast('Saved!', 'success')
window.showToast = function (message, type = 'info', duration = 3000) {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const icons = { success: '✓', error: '✕', info: 'ℹ' };

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span style="font-weight:600">${icons[type] || 'ℹ'}</span> ${message}`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.transition = 'opacity 0.3s, transform 0.3s';
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(6px)';
    setTimeout(() => toast.remove(), 300);
  }, duration);
};

// Theme toggle (same as before, but safe)
(function initTheme() {
  try {
    const root = document.documentElement;
    const btn = document.getElementById('theme-toggle-btn');
    const icon = document.getElementById('theme-icon');
    const label = document.getElementById('theme-label');

    function applyTheme(theme) {
      root.setAttribute('data-theme', theme);
      if (!icon || !label) return;
      if (theme === 'light') {
        icon.textContent = '☀️';
        label.textContent = 'Light mode';
      } else {
        icon.textContent = '🌙';
        label.textContent = 'Dark mode';
      }
    }

    let saved = 'light';
    try { saved = localStorage.getItem('theme') || 'light'; } catch (_) { }
    applyTheme(saved);

    btn?.addEventListener('click', () => {
      const next = root.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
      applyTheme(next);
      try { localStorage.setItem('theme', next); } catch (_) { }
    });
  } catch (e) {
    console.warn('Theme init failed:', e);
  }
})();

// Wire sidebar clicks
document.querySelectorAll('.nav-item[data-page]').forEach(item => {
  // Use pointerdown so navigation happens before click-up,
  // preventing rare "ghost click" landing on newly-rendered buttons.
  item.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    navigate(item.dataset.page);
  });
});

// Boot
navigate('dashboard');

