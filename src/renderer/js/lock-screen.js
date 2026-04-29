// ═══════════════════════════════════════════════════════════
//  LOCK-SCREEN.JS
//  Hybrid Auth: Password Login + EmailJS Reset Flow
// ═══════════════════════════════════════════════════════════

'use strict';

(function () {
  // ── State ──────────────────────────────────────────────
  let _isUnlocked = false;
  let _lockoutTimer = null;
  let _resendTimer = null;
  let _resendSeconds = 0;
  let _passwordVisibilityTimers = {};

  // ── Helpers ─────────────────────────────────────────────
  function $(id) { return document.getElementById(id); }

  function showView(viewId) {
    document.querySelectorAll('.lock-view').forEach(v => v.classList.remove('active'));
    const view = $(viewId);
    if (view) view.classList.add('active');
  }

  function showError(elId, msg) {
    const el = $(elId);
    if (!el) return;
    el.textContent = msg;
    el.classList.add('visible');
  }

  function hideError(elId) {
    const el = $(elId);
    if (!el) return;
    el.textContent = '';
    el.classList.remove('visible');
  }

  function togglePasswordVisibility(inputId, btnId) {
    const input = $(inputId);
    const btn = $(btnId);
    if (!input || !btn) return;

    if (_passwordVisibilityTimers[inputId]) {
      clearTimeout(_passwordVisibilityTimers[inputId]);
    }

    if (input.type === 'password') {
      input.type = 'text';
      btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;
      _passwordVisibilityTimers[inputId] = setTimeout(() => {
        if (input.type === 'text') {
          input.type = 'password';
          btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
        }
      }, 5000);
    } else {
      input.type = 'password';
      btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
    }
  }

  // ── Init ───────────────────────────────────────────────
  async function initLockScreen() {
    const lockScreen = $('lock-screen');
    if (!lockScreen) return;

    try {
      const { isSetup } = await window.api.authIsSetup();
      if (!isSetup) {
        showView('auth-setup-view');
        setTimeout(() => $('setup-pw')?.focus(), 500);
      } else {
        showView('auth-lock-view');
        setTimeout(() => $('lock-password')?.focus(), 500);
      }
    } catch (err) {
      console.error('[LockScreen] Init error:', err);
      unlockApp();
      return;
    }

    wireEvents();
  }

  // ── Wire Events ────────────────────────────────────────
  function wireEvents() {
    // Toggles
    $('setup-toggle-pw')?.addEventListener('click', () => togglePasswordVisibility('setup-pw', 'setup-toggle-pw'));
    $('setup-toggle-confirm')?.addEventListener('click', () => togglePasswordVisibility('setup-confirm-pw', 'setup-toggle-confirm'));
    $('lock-toggle-pw')?.addEventListener('click', () => togglePasswordVisibility('lock-password', 'lock-toggle-pw'));
    $('forgot-toggle-pw')?.addEventListener('click', () => togglePasswordVisibility('forgot-new-pw', 'forgot-toggle-pw'));
    $('forgot-toggle-confirm')?.addEventListener('click', () => togglePasswordVisibility('forgot-confirm-pw', 'forgot-toggle-confirm'));

    // Set Password
    $('setup-submit-btn')?.addEventListener('click', handleSetup);
    ['setup-pw', 'setup-confirm-pw'].forEach(id => {
      $(id)?.addEventListener('keydown', e => { if (e.key === 'Enter') handleSetup(); });
    });

    // Login
    $('lock-submit-btn')?.addEventListener('click', handleLogin);
    $('lock-password')?.addEventListener('keydown', e => { if (e.key === 'Enter') handleLogin(); });

    // Forgot Password Nav
    $('lock-forgot-btn')?.addEventListener('click', () => {
      showView('auth-forgot-step1-view');
      hideError('forgot-step1-error');
      setTimeout(() => $('forgot-email')?.focus(), 150);
    });
    $('forgot-step1-back-btn')?.addEventListener('click', () => {
      showView('auth-lock-view');
      hideError('forgot-step1-error');
    });
    $('forgot-go-settings-btn')?.addEventListener('click', () => {
      showView('auth-lock-view');
      hideError('forgot-step1-error');
    });
    $('forgot-step2-back-btn')?.addEventListener('click', () => {
      showView('auth-lock-view');
      hideError('forgot-step2-error');
    });

    // Forgot Password Step 1 (Send Email)
    $('forgot-send-code-btn')?.addEventListener('click', handleSendResetCode);
    $('forgot-email')?.addEventListener('keydown', e => { if (e.key === 'Enter') handleSendResetCode(); });

    // Forgot Password Step 2 (Reset)
    $('forgot-reset-btn')?.addEventListener('click', handleResetPassword);
    ['forgot-code', 'forgot-new-pw', 'forgot-confirm-pw'].forEach(id => {
      $(id)?.addEventListener('keydown', e => { if (e.key === 'Enter') handleResetPassword(); });
    });

    // Code input logic
    $('forgot-code')?.addEventListener('input', e => {
      e.target.value = e.target.value.replace(/[^0-9]/g, '').slice(0, 6);
    });

    // IPC: auto-lock
    if (window.api?.onLockApp) {
      window.api.onLockApp(() => {
        if (_isUnlocked) lockApp();
      });
    }
  }

  // ── Handlers ────────────────────────────────────────────
  async function handleSetup() {
    const pw = $('setup-pw')?.value || '';
    const confirm = $('setup-confirm-pw')?.value || '';

    hideError('setup-error');

    if (pw.length < 8) {
      showError('setup-error', 'Password must be at least 8 characters.');
      return;
    }
    if (pw !== confirm) {
      showError('setup-error', 'Passwords do not match.');
      return;
    }

    const btn = $('setup-submit-btn');
    if (btn) { btn.disabled = true; btn.innerHTML = '<span class="lock-spinner"></span> Saving...'; }

    try {
      const res = await window.api.authSetupPassword(pw);
      if (res.success) {
        unlockApp();
      } else {
        showError('setup-error', res.error || 'Failed to setup password.');
      }
    } catch (err) {
      showError('setup-error', err.message);
    } finally {
      if (btn) { btn.disabled = false; btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> Complete Setup'; }
    }
  }

  async function handleLogin() {
    const pw = $('lock-password')?.value || '';
    hideError('lock-error');

    if (!pw) {
      showError('lock-error', 'Please enter your password.');
      return;
    }

    const btn = $('lock-submit-btn');
    if (btn) { btn.disabled = true; btn.innerHTML = '<span class="lock-spinner"></span> Verifying...'; }

    try {
      const res = await window.api.authVerifyPassword(pw);
      if (res.valid) {
        unlockApp();
      } else {
        showError('lock-error', res.error || 'Incorrect password.');
        if (res.locked) startLockout(res.remaining || 60);
      }
    } catch (err) {
      showError('lock-error', err.message);
    } finally {
      if (btn) { btn.disabled = false; btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> Login'; }
      $('lock-password').value = '';
    }
  }

  async function handleSendResetCode() {
    const email = $('forgot-email')?.value?.trim() || '';
    hideError('forgot-step1-error');
    const goSettingsBtn = $('forgot-go-settings-btn');
    if (goSettingsBtn) goSettingsBtn.style.display = 'none';

    if (!email || !email.includes('@')) {
      showError('forgot-step1-error', 'Please enter a valid email address.');
      return;
    }

    const btn = $('forgot-send-code-btn');
    if (btn) { btn.disabled = true; btn.innerHTML = '<span class="lock-spinner"></span> Sending...'; }

    try {
      const res = await window.api.authSendResetOTP(email);
      if (res.success) {
        showView('auth-forgot-step2-view');
        
        // Mask the email visually
        const parts = email.split('@');
        if (parts.length === 2) {
            const masked = parts[0].substring(0, 2) + '***@' + parts[1];
            $('forgot-sent-msg').textContent = `Code sent to ${masked}`;
        } else {
            $('forgot-sent-msg').textContent = `Code sent to ${email}`;
        }
        
        setTimeout(() => $('forgot-code')?.focus(), 150);
        startResendCountdown(60, email);
      } else {
        if (res.error.includes('not configured')) {
            showError('forgot-step1-error', 'Email service not set up. Please go to Settings → Security to configure it first.');
            if (goSettingsBtn) goSettingsBtn.style.display = 'block';
        } else {
            showError('forgot-step1-error', res.error || 'Failed to send reset code.');
        }
      }
    } catch (err) {
      showError('forgot-step1-error', err.message);
    } finally {
      if (btn) { btn.disabled = false; btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 2L11 13"/><path d="M22 2L15 22l-4-9-9-4z"/></svg> Send Reset Code'; }
    }
  }

  async function handleResetPassword() {
    const code = $('forgot-code')?.value || '';
    const pw = $('forgot-new-pw')?.value || '';
    const confirm = $('forgot-confirm-pw')?.value || '';

    hideError('forgot-step2-error');

    if (code.length !== 6) {
      showError('forgot-step2-error', 'Please enter a valid 6-digit code.');
      return;
    }
    if (pw.length < 8) {
      showError('forgot-step2-error', 'Password must be at least 8 characters.');
      return;
    }
    if (pw !== confirm) {
      showError('forgot-step2-error', 'Passwords do not match.');
      return;
    }

    const btn = $('forgot-reset-btn');
    if (btn) { btn.disabled = true; btn.innerHTML = '<span class="lock-spinner"></span> Resetting...'; }

    try {
      const res = await window.api.authResetPasswordWithOTP(code, pw);
      if (res.success) {
        // Success
        showView('auth-lock-view');
        clearAllInputs();
        if (typeof showToast === 'function') {
          showToast('Password reset successful. Please login.', 'success');
        } else {
          // Fallback if toast not loaded yet
          const successDiv = document.createElement('div');
          successDiv.className = 'lock-success visible';
          successDiv.style.marginBottom = '20px';
          successDiv.innerHTML = 'Password reset successfully.';
          $('auth-lock-view').insertBefore(successDiv, $('lock-error'));
          setTimeout(() => successDiv.remove(), 4000);
        }
      } else {
        showError('forgot-step2-error', res.error || 'Reset failed.');
      }
    } catch (err) {
      showError('forgot-step2-error', err.message);
    } finally {
      if (btn) { btn.disabled = false; btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> Reset Password'; }
    }
  }

  // ── Lockout & Countdown ─────────────────────────────────
  function startLockout(seconds) {
    const lockoutEl = $('lock-lockout');
    const timerEl = $('lock-lockout-timer');

    if (lockoutEl) lockoutEl.classList.add('visible');
    const btn = $('lock-submit-btn');
    const input = $('lock-password');
    if (btn) btn.disabled = true;
    if (input) input.disabled = true;

    let remaining = seconds;

    function tick() {
      if (timerEl) timerEl.textContent = remaining + 's';
      if (remaining <= 0) {
        clearInterval(_lockoutTimer);
        _lockoutTimer = null;
        if (lockoutEl) lockoutEl.classList.remove('visible');
        hideError('lock-error');
        if (btn) btn.disabled = false;
        if (input) { input.disabled = false; input.focus(); }
      }
      remaining--;
    }

    tick();
    _lockoutTimer = setInterval(tick, 1000);
  }

  function startResendCountdown(seconds, email) {
    if (_resendTimer) clearInterval(_resendTimer);
    _resendSeconds = seconds;

    const countdown = $('forgot-countdown');

    function tick() {
      if (!countdown) return;
      if (_resendSeconds > 0) {
        const min = Math.floor(_resendSeconds / 60);
        const sec = _resendSeconds % 60;
        countdown.innerHTML = `Resend code in <span class="timer">${min}:${String(sec).padStart(2, '0')}</span>`;
        _resendSeconds--;
      } else {
        clearInterval(_resendTimer);
        _resendTimer = null;
        countdown.innerHTML = '<button class="otp-resend-link" id="forgot-resend-btn">Resend Code</button>';
        $('forgot-resend-btn')?.addEventListener('click', async () => {
          countdown.innerHTML = '<span class="lock-spinner" style="border-color:rgba(124,58,237,.2);border-top-color:#7c3aed;width:14px;height:14px;"></span> Sending...';
          const res = await window.api.authSendResetOTP(email);
          if (res.success) {
            startResendCountdown(60, email);
          } else {
            showError('forgot-step2-error', res.error || 'Failed to resend code.');
            countdown.innerHTML = '<button class="otp-resend-link" id="forgot-resend-btn">Resend Code</button>';
            // Need to re-bind since we overwrote innerHTML
          }
        });
      }
    }

    tick();
    _resendTimer = setInterval(tick, 1000);
  }

  // ── Lock / Unlock ──────────────────────────────────────
  function lockApp() {
    _isUnlocked = false;
    const lockScreen = $('lock-screen');
    if (!lockScreen) return;

    lockScreen.classList.remove('hidden');

    window.api?.authClearSession?.();
    showView('auth-lock-view');
    hideError('lock-error');
    clearAllInputs();

    if (_resendTimer) { clearInterval(_resendTimer); _resendTimer = null; }
    if (_lockoutTimer) { clearInterval(_lockoutTimer); _lockoutTimer = null; }
  }

  function unlockApp() {
    _isUnlocked = true;
    const lockScreen = $('lock-screen');
    if (!lockScreen) return;

    lockScreen.classList.add('hidden');
    window.dispatchEvent(new CustomEvent('appUnlocked'));

    clearAllInputs();
  }

  function clearAllInputs() {
    ['setup-pw', 'setup-confirm-pw', 'lock-password', 'forgot-email', 'forgot-code', 'forgot-new-pw', 'forgot-confirm-pw'].forEach(id => {
      const el = $(id);
      if (el) el.value = '';
    });
    // reset visibility
    ['setup-pw', 'setup-confirm-pw', 'lock-password', 'forgot-new-pw', 'forgot-confirm-pw'].forEach(id => {
      const input = $(id);
      if (input && input.type === 'text') {
        const toggleId = id.replace('-pw', '-toggle-pw').replace('-password', '-toggle-pw');
        // manual fallback since names might not match exactly, just brute force setting type
        input.type = 'password';
      }
    });
  }

  window.lockApp = lockApp;

  // ── Boot ───────────────────────────────────────────────
  function boot() {
    if (window.splashScreenActive) {
      window.addEventListener('splashScreenDone', () => initLockScreen(), { once: true });
      setTimeout(() => {
        if (!_isUnlocked) initLockScreen();
      }, 5000);
    } else {
      initLockScreen();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
