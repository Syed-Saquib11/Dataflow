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
}

function destroySettings() {
    // No body/window level addeventlisteners to tear down.
}
