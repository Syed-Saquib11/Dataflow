// src/renderer/js/keyboard-shortcuts.js
// ═══════════════════════════════════════════════════════════
//  Global keyboard shortcut layer
//  • Enter  → submits/saves the topmost open form or modal
//  • Escape → closes/cancels the topmost open modal
//
//  Rules:
//  - If focus is inside a <textarea>, Enter adds a newline (no submit)
//  - Modifiers (Ctrl/Alt/Meta + Enter) are ignored
//  - Does NOT change any existing button behavior or logic
// ═══════════════════════════════════════════════════════════
'use strict';

(function initKeyboardShortcuts() {

  // ── ENTER KEY — Submit the topmost open form/modal ──────────────
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter') return;

    // Exception: if cursor is inside a <textarea>, let Enter add a newline
    const active = document.activeElement;
    if (active && active.tagName === 'TEXTAREA') return;

    // Exception: don't interfere with modifier combos (Ctrl+Enter, Shift+Enter, etc.)
    if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;

    // Find the topmost visible modal / overlay and click its primary action button.
    const btn = _findSubmitButton();
    if (!btn) return;

    // Don't double-fire if the button itself already has focus
    // (native Enter-on-button already triggers click)
    if (active === btn) return;

    // Don't fire if the button is disabled
    if (btn.disabled) return;

    e.preventDefault();
    e.stopPropagation();
    btn.click();
  });

  // ── ESCAPE KEY — Close the topmost open modal ──────────────────
  // This acts as a safety net / catch-all. Individual modules already
  // have Escape handlers, but not all do (e.g., student modals, test
  // modals, backup modal). The event bubbles, so module-specific
  // handlers will fire first if they call stopPropagation.
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;

    // 1. Dynamic modals in #modal-root (student add/edit/view/delete, test create/delete)
    const modalRoot = document.getElementById('modal-root');
    if (modalRoot && modalRoot.innerHTML.trim() !== '') {
      const overlay = modalRoot.querySelector('.modal-overlay');
      if (overlay) {
        // Try the close/cancel button first so proper cleanup runs
        const closeBtn = overlay.querySelector(
          '#modal-close-btn, #modal-cancel-btn, #del-close-btn, #del-cancel-btn, ' +
          '#tm-close, #tm-cancel, #del-cancel, #view-close-btn, #view-close-btn-2'
        );
        if (closeBtn) { closeBtn.click(); return; }
        // Fallback: clear modal-root directly
        modalRoot.innerHTML = '';
        return;
      }
    }

    // 2. Fees modals (.ov.on) — close topmost
    const feesModals = [...document.querySelectorAll('.ov.on')];
    if (feesModals.length) {
      feesModals[feesModals.length - 1].classList.remove('on');
      return;
    }

    // 3. Course modals
    const addCourseModal = document.getElementById('add-course-modal');
    if (addCourseModal && addCourseModal.classList.contains('active')) {
      addCourseModal.classList.remove('active');
      return;
    }
    const deleteCourseModal = document.getElementById('delete-course-modal');
    if (deleteCourseModal && deleteCourseModal.classList.contains('active')) {
      deleteCourseModal.classList.remove('active');
      return;
    }

    // 4. Slot modals
    const slotModalIds = ['slot-confirm-modal', 'slot-picker-modal', 'edit-slot-modal', 'add-slot-modal'];
    for (const id of slotModalIds) {
      const el = document.getElementById(id);
      if (el && el.classList.contains('active')) {
        el.classList.remove('active');
        return;
      }
    }

    // 5. Test editor overlay
    const testEditor = document.getElementById('test-editor-overlay');
    if (testEditor && !testEditor.classList.contains('hidden')) {
      testEditor.classList.add('hidden');
      return;
    }

    // 6. Google disconnect modal
    const gdm = document.getElementById('google-disconnect-modal');
    if (gdm && gdm.classList.contains('active')) {
      gdm.classList.remove('active');
      return;
    }

    // 7. Backup modal
    const bm = document.getElementById('backup-choice-modal');
    if (bm && bm.classList.contains('active')) {
      bm.classList.remove('active');
      return;
    }

    // 8. Month dropdown in fees
    const monthDD = document.getElementById('month-dropdown');
    if (monthDD && monthDD.classList.contains('open')) {
      monthDD.classList.remove('open');
      return;
    }

    // 9. Forms student picker
    const formsPicker = document.getElementById('forms-student-picker');
    if (formsPicker && formsPicker.style.display === 'block') {
      formsPicker.style.display = 'none';
      return;
    }
  });


  // ═══════════════════════════════════════════════════════════
  //  Find the primary submit / save / confirm button for
  //  the topmost open modal or form overlay.
  // ═══════════════════════════════════════════════════════════
  function _findSubmitButton() {

    // ── Priority 1: Dynamic modals in #modal-root ──────────
    //   (Student add/edit, student delete, test create, test delete)
    const modalRoot = document.getElementById('modal-root');
    if (modalRoot && modalRoot.innerHTML.trim() !== '') {
      // Student view modal — no submit action, skip
      if (modalRoot.querySelector('#student-view-overlay')) return null;

      // Student add/edit → Save / Add Student button
      const studentSave = modalRoot.querySelector('#modal-save-btn');
      if (studentSave) return studentSave;

      // Student delete confirm → "Yes, Delete Forever"
      const delConfirm = modalRoot.querySelector('#del-confirm-btn');
      if (delConfirm) return delConfirm;

      // Test create modal → "Save Test"
      const testSave = modalRoot.querySelector('#tm-save');
      if (testSave) return testSave;

      // Test delete confirm → "Delete"
      const testDel = modalRoot.querySelector('#del-confirm');
      if (testDel) return testDel;
    }

    // ── Priority 2: Slot modals (.active) ──────────────────

    // Slot confirm dialog (delete / remove student)
    const slotConfirm = document.getElementById('slot-confirm-modal');
    if (slotConfirm && slotConfirm.classList.contains('active')) {
      const okBtn = slotConfirm.querySelector('#ok-slot-confirm');
      if (okBtn) return okBtn;
    }

    // Edit slot modal → "Save Changes"
    const editSlotModal = document.getElementById('edit-slot-modal');
    if (editSlotModal && editSlotModal.classList.contains('active')) {
      return document.getElementById('save-edit-slot');
    }

    // Add slot modal → "Add Slot"
    const addSlotModal = document.getElementById('add-slot-modal');
    if (addSlotModal && addSlotModal.classList.contains('active')) {
      return document.getElementById('confirm-add-slot');
    }

    // Student picker modal → "Confirm"
    const pickerModal = document.getElementById('slot-picker-modal');
    if (pickerModal && pickerModal.classList.contains('active')) {
      return document.getElementById('confirm-picker');
    }

    // ── Priority 3: Course modals (.active) ────────────────

    // Delete course confirm
    const deleteCourseModal = document.getElementById('delete-course-modal');
    if (deleteCourseModal && deleteCourseModal.classList.contains('active')) {
      return document.getElementById('confirm-delete-course');
    }

    // Add course modal → "Add Course"
    const addCourseModal = document.getElementById('add-course-modal');
    if (addCourseModal && addCourseModal.classList.contains('active')) {
      return document.getElementById('submit-course');
    }

    // ── Priority 4: Fees modals (.ov.on) ───────────────────

    // Confirm dialog → "Confirm" button
    const cfModal = document.getElementById('cfMd');
    if (cfModal && cfModal.classList.contains('on')) {
      return document.getElementById('cfok');
    }

    // Reminder modal → "Send Now" (btn-pp inside #remMd)
    const remModal = document.getElementById('remMd');
    if (remModal && remModal.classList.contains('on')) {
      return remModal.querySelector('.btn.btn-pp');
    }

    // Add/Edit fee modal → "Save Changes" (btn-pp inside #addMd)
    const addFeeModal = document.getElementById('addMd');
    if (addFeeModal && addFeeModal.classList.contains('on')) {
      return addFeeModal.querySelector('.btn.btn-pp');
    }

    // Payment detail modal → "+ Add Payment" (btn-gg inside #detMd)
    const detModal = document.getElementById('detMd');
    if (detModal && detModal.classList.contains('on')) {
      return detModal.querySelector('.btn.btn-gg');
    }

    // ── Priority 5: Google disconnect confirmation ──────────
    const gdm = document.getElementById('google-disconnect-modal');
    if (gdm && gdm.classList.contains('active')) {
      return document.getElementById('google-disconnect-confirm');
    }

    // No modal open — don't submit anything
    return null;
  }

})();
