// ── Idempotency state for settings email actions ──
let _settingsIsSendingTest = false;
let _settingsIsFinishingWizard = false;
let _settingsIsUpdatingPw = false;
let _settingsIsSavingEmail = false;
const _SETTINGS_COOLDOWN_MS = 2000;
let _settingsLastTestTime = 0;
let _settingsLastWizardFinishTime = 0;

async function initSettings() {
    // ── Profile Section ───────────────────────────────────
    try {
        const { adminName } = await window.api.authGetAdminName();
        const nameInput = document.getElementById('settings-admin-name');
        const initialsAvatar = document.getElementById('settings-avatar-initials');
        
        if (nameInput) nameInput.value = adminName || 'Admin';
        
        if (initialsAvatar && adminName) {
            const parts = adminName.trim().split(' ');
            let initials = '';
            if (parts.length > 1) {
                initials = parts[0][0] + parts[parts.length - 1][0];
            } else if (parts.length === 1 && parts[0].length > 0) {
                initials = parts[0].substring(0, 2);
            }
            initialsAvatar.textContent = initials.toUpperCase();
        }
    } catch (err) {
        console.error('Failed to load admin name:', err);
    }

    // ── Security Section ──────────────────────────────────
    async function initSecurity() {
        // Load masked email
        try {
            const { masked } = await window.api.authGetRegisteredEmail();
            const el = document.getElementById('sec-masked-email');
            if (el) el.textContent = masked || 'Not configured';
        } catch { }

        // Load EmailJS config to set banners
        try {
            const cfg = await window.api.authGetEmailJSConfig();
            if (cfg && cfg.isConfigured) {
                document.getElementById('sec-email-configured').style.display = 'flex';
                document.getElementById('sec-email-details').style.display = 'block';
                document.getElementById('sec-configure-btn').style.display = 'none';
            } else {
                document.getElementById('sec-email-not-configured').style.display = 'flex';
            }
        } catch { }

        // Update Password — with state lock
        document.getElementById('sec-update-pw-btn')?.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();

            if (_settingsIsUpdatingPw) return;

            const currentPw = document.getElementById('sec-current-pw')?.value || '';
            const newPw = document.getElementById('sec-new-pw')?.value || '';
            const confirmPw = document.getElementById('sec-confirm-pw')?.value || '';

            if (!currentPw || !newPw || !confirmPw) {
                if (typeof showToast === 'function') showToast('Please fill all password fields.', 'error');
                return;
            }
            if (newPw !== confirmPw) {
                if (typeof showToast === 'function') showToast('New passwords do not match.', 'error');
                return;
            }

            _settingsIsUpdatingPw = true;
            const btn = document.getElementById('sec-update-pw-btn');
            if (btn) { btn.disabled = true; btn.textContent = 'Updating...'; }

            try {
                const res = await window.api.authChangePassword(currentPw, newPw);
                if (res.success) {
                    document.getElementById('sec-current-pw').value = '';
                    document.getElementById('sec-new-pw').value = '';
                    document.getElementById('sec-confirm-pw').value = '';
                    if (typeof showToast === 'function') showToast('Password updated successfully.', 'success');
                } else {
                    if (typeof showToast === 'function') showToast(res.error || 'Failed to update password.', 'error');
                }
            } catch (err) {
                if (typeof showToast === 'function') showToast('Error: ' + err.message, 'error');
            } finally {
                _settingsIsUpdatingPw = false;
                if (btn) { btn.disabled = false; btn.textContent = 'Update Password'; }
            }
        });



        // Save email — with state lock
        document.getElementById('sec-save-email-btn')?.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();

            if (_settingsIsSavingEmail) return;

            const newEmail = document.getElementById('sec-new-email')?.value?.trim();
            if (!newEmail) return;

            _settingsIsSavingEmail = true;

            try {
                const result = await window.api.authSetRegisteredEmail(newEmail);
                if (result.success) {
                    const { masked } = await window.api.authGetRegisteredEmail();
                    const el = document.getElementById('sec-masked-email');
                    if (el) el.textContent = masked;
                    document.getElementById('sec-new-email').value = '';
                    if (typeof showToast === 'function') showToast('Email updated.', 'success');
                } else {
                    if (typeof showToast === 'function') showToast(result.error, 'error');
                }
            } catch (err) {
                if (typeof showToast === 'function') showToast('Error: ' + err.message, 'error');
            } finally {
                _settingsIsSavingEmail = false;
            }
        });

        // Test OTP — with state lock & cooldown
        document.getElementById('sec-test-otp-btn')?.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();

            if (_settingsIsSendingTest) return;
            const now = Date.now();
            if (now - _settingsLastTestTime < _SETTINGS_COOLDOWN_MS) return;

            _settingsIsSendingTest = true;
            _settingsLastTestTime = now;

            const btn = document.getElementById('sec-test-otp-btn');
            if (btn) { btn.disabled = true; btn.textContent = 'Sending...'; }
            try {
                const result = await window.api.authSendTestOTP();
                if (result.success) {
                    if (typeof showToast === 'function') showToast('Test Email sent! Check your inbox.', 'success');
                } else {
                    if (typeof showToast === 'function') showToast(result.error || 'Failed to send.', 'error');
                }
            } catch (err) {
                if (typeof showToast === 'function') showToast('Error: ' + err.message, 'error');
            } finally {
                _settingsIsSendingTest = false;
                if (btn) { btn.disabled = false; btn.textContent = 'Send Test Email'; }
            }
        });

        // ── WIZARD LOGIC ──────────────────────────────────────────────
        let currentStep = 1;

        const updateWizardUI = () => {
            document.querySelectorAll('.wizard-step').forEach(el => el.classList.remove('active'));
            document.getElementById(`wizard-step-${currentStep}`).classList.add('active');
            document.getElementById('wizard-progress').textContent = `Step ${currentStep} of 4`;

            document.getElementById('wizard-back-btn').style.display = currentStep > 1 ? 'block' : 'none';
            document.getElementById('wizard-next-btn').style.display = currentStep < 4 ? 'block' : 'none';
            document.getElementById('wizard-finish-btn').style.display = currentStep === 4 ? 'block' : 'none';
            document.getElementById('wizard-error').style.display = 'none';
        };

        const showWizardError = (msg) => {
            const err = document.getElementById('wizard-error');
            err.textContent = msg;
            err.style.display = 'block';
        };

        const openWizard = () => {
            currentStep = 1;
            updateWizardUI();
            document.getElementById('wizard-overlay').style.display = 'flex';
        };

        const closeWizard = () => {
            document.getElementById('wizard-overlay').style.display = 'none';
        };

        document.getElementById('sec-configure-btn')?.addEventListener('click', openWizard);
        document.getElementById('sec-reconfigure-btn')?.addEventListener('click', openWizard);
        document.getElementById('wizard-cancel-btn')?.addEventListener('click', closeWizard);

        document.getElementById('wizard-open-website-btn')?.addEventListener('click', () => {
            window.api.openExternal('https://www.emailjs.com');
        });

        document.getElementById('wizard-back-btn')?.addEventListener('click', () => {
            if (currentStep > 1) { currentStep--; updateWizardUI(); }
        });

        document.getElementById('wizard-next-btn')?.addEventListener('click', () => {
            // Validation
            if (currentStep === 2) {
                const sid = document.getElementById('wizard-service-id').value.trim();
                if (!sid || !sid.startsWith('service_')) {
                    showWizardError('Invalid Service ID format. Must start with service_');
                    return;
                }
            }
            if (currentStep === 3) {
                const tid = document.getElementById('wizard-template-id').value.trim();
                if (!tid) {
                    showWizardError('Template ID is required.');
                    return;
                }
            }

            if (currentStep < 4) { currentStep++; updateWizardUI(); }
        });

        // Wizard Finish — with state lock & cooldown (sends test email)
        document.getElementById('wizard-finish-btn')?.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();

            if (_settingsIsFinishingWizard) return;
            const now = Date.now();
            if (now - _settingsLastWizardFinishTime < _SETTINGS_COOLDOWN_MS) return;

            const serviceId = document.getElementById('wizard-service-id').value.trim();
            const templateId = document.getElementById('wizard-template-id').value.trim();
            const publicKey = document.getElementById('wizard-public-key').value.trim();
            const privateKey = document.getElementById('wizard-private-key')?.value.trim() || '';
            const adminEmail = document.getElementById('wizard-admin-email').value.trim();

            if (!publicKey) {
                showWizardError('Public Key is required.');
                return;
            }
            if (!privateKey) {
                showWizardError('Private Key is required for API access.');
                return;
            }
            if (!adminEmail || !adminEmail.includes('@')) {
                showWizardError('Valid admin email is required for the test.');
                return;
            }

            _settingsIsFinishingWizard = true;
            _settingsLastWizardFinishTime = now;

            const btn = document.getElementById('wizard-finish-btn');
            btn.disabled = true;
            btn.textContent = 'Sending test email...';
            showWizardError('');

            try {
                // First save email
                await window.api.authSetRegisteredEmail(adminEmail);
                // Save config (this sets isConfigured to true)
                await window.api.authSetEmailJSConfig({ serviceId, templateId, publicKey, privateKey });

                // Then run test OTP
                const res = await window.api.authSendTestOTP();
                if (res.success) {
                    if (typeof showToast === 'function') showToast('✅ Test email sent! Setup complete.', 'success');
                    closeWizard();

                    // Refresh view
                    document.getElementById('sec-email-not-configured').style.display = 'none';
                    document.getElementById('sec-email-configured').style.display = 'flex';
                    document.getElementById('sec-email-details').style.display = 'block';
                    document.getElementById('sec-configure-btn').style.display = 'none';

                    const { masked } = await window.api.authGetRegisteredEmail();
                    document.getElementById('sec-masked-email').textContent = masked;
                } else {
                    showWizardError(`❌ Failed to send: ${res.error || 'Unknown error. Check your keys.'}`);
                }
            } catch (err) {
                showWizardError('Error: ' + err.message);
            } finally {
                _settingsIsFinishingWizard = false;
                btn.disabled = false;
                btn.textContent = 'Send Test Email & Save';
            }
        });
    }

    initSecurity();
}

function destroySettings() {
    // Reset sending states when navigating away
    _settingsIsSendingTest = false;
    _settingsIsFinishingWizard = false;
    _settingsIsUpdatingPw = false;
    _settingsIsSavingEmail = false;
}
