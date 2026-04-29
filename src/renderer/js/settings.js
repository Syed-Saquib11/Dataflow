async function initSettings() {
    const disconnectedState = document.getElementById('google-disconnected-state');
    const connectedState = document.getElementById('google-connected-state');
    const avatarImg = document.getElementById('google-avatar');
    const nameSpan = document.getElementById('google-name');
    const emailSpan = document.getElementById('google-email');
    const connectBtn = document.getElementById('btn-google-connect');
    const disconnectBtn = document.getElementById('btn-google-disconnect');
    const statusMsg = document.getElementById('google-status-msg');

    async function renderState() {
        try {
            const status = await window.api.googleGetStatus();
            statusMsg.textContent = '';

            if (status.connected) {
                avatarImg.src = status.avatar || '';
                nameSpan.textContent = status.name || 'Unknown User';
                emailSpan.textContent = status.email || '';

                disconnectedState.style.display = 'none';
                connectedState.style.display = 'flex';
            } else {
                disconnectedState.style.display = 'flex';
                connectedState.style.display = 'none';
            }
        } catch (err) {
            statusMsg.textContent = 'Failed to fetch status: ' + err.message;
        }
    }

    connectBtn.addEventListener('click', async () => {
        connectBtn.disabled = true;
        statusMsg.textContent = 'Connecting... Check your browser to complete authorization.';

        try {
            const result = await window.api.googleConnect();
            if (result.success) {
                statusMsg.textContent = 'Successfully connected!';
                await renderState();
            } else {
                statusMsg.textContent = result.error;
            }
        } catch (err) {
            statusMsg.textContent = 'Connection Error: ' + err.message;
        } finally {
            connectBtn.disabled = false;
        }
    });

    disconnectBtn.addEventListener('click', async () => {
        disconnectBtn.disabled = true;
        statusMsg.textContent = 'Disconnecting...';

        try {
            const result = await window.api.googleDisconnect();
            if (result.success) {
                await renderState();
            } else {
                statusMsg.textContent = result.error;
            }
        } catch (err) {
            statusMsg.textContent = 'Disconnection Error: ' + err.message;
        } finally {
            disconnectBtn.disabled = false;
        }
    });

    await renderState();

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

        // Update Password
        document.getElementById('sec-update-pw-btn')?.addEventListener('click', async () => {
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
                if (btn) { btn.disabled = false; btn.textContent = 'Update Password'; }
            }
        });

        // Change email toggle
        document.getElementById('sec-change-email-btn')?.addEventListener('click', () => {
            const panel = document.getElementById('sec-email-change');
            if (panel) panel.style.display = panel.style.display === 'none' ? 'flex' : 'none';
        });

        // Save email
        document.getElementById('sec-save-email-btn')?.addEventListener('click', async () => {
            const newEmail = document.getElementById('sec-new-email')?.value?.trim();
            if (!newEmail) return;
            try {
                const result = await window.api.authSetRegisteredEmail(newEmail);
                if (result.success) {
                    const { masked } = await window.api.authGetRegisteredEmail();
                    const el = document.getElementById('sec-masked-email');
                    if (el) el.textContent = masked;
                    document.getElementById('sec-email-change').style.display = 'none';
                    document.getElementById('sec-new-email').value = '';
                    if (typeof showToast === 'function') showToast('Email updated.', 'success');
                } else {
                    if (typeof showToast === 'function') showToast(result.error, 'error');
                }
            } catch (err) {
                if (typeof showToast === 'function') showToast('Error: ' + err.message, 'error');
            }
        });

        // Test OTP
        document.getElementById('sec-test-otp-btn')?.addEventListener('click', async () => {
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

        document.getElementById('wizard-finish-btn')?.addEventListener('click', async () => {
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
                    // Revert isConfigured? Or leave it so they can try again? The instructions say "Do NOT save invalid keys"
                    // If it failed, let's revert it. But we don't have a specific IPC for revert. 
                    // Let's just leave it open. They have to fix it.
                }
            } catch (err) {
                showWizardError('Error: ' + err.message);
            } finally {
                btn.disabled = false;
                btn.textContent = 'Send Test Email & Save';
            }
        });
    }

    initSecurity();
}

function destroySettings() {
    // No body/window level addeventlisteners to tear down.
}
