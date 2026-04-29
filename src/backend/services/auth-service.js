// ═══════════════════════════════════════════════════════════
//  AUTH-SERVICE.JS
//  Hybrid Authentication: Password Login + EmailJS OTP Reset
//  Storage: DATA_PATH/auth.json
// ═══════════════════════════════════════════════════════════

const crypto = require('crypto');
const https = require('https');
const fs = require('fs');
const path = require('path');

// ── In-memory state (never written to disk) ───────────────
const _mem = {
  otpHash: null,
  otpExpiry: 0,
  failedAttempts: 0,
  lockedUntil: 0,
  sessionToken: null,
  resetEmail: null, // tracks email during reset flow
  isSendingOTP: false // idempotency lock to prevent duplicate emails
};

// ── Helpers ────────────────────────────────────────────────

function getAuthFilePath() {
  const dataPath = global.DATA_PATH;
  if (!dataPath) throw new Error('DATA_PATH not set');
  return path.join(dataPath, 'auth.json');
}

function readAuthData() {
  const filePath = getAuthFilePath();
  if (!fs.existsSync(filePath)) return {};
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return {};
  }
}

function writeAuthData(data) {
  const filePath = getAuthFilePath();
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

function sha256(str) {
  return crypto.createHash('sha256').update(str).digest('hex');
}

function maskEmail(email) {
  if (!email) return '';
  const [local, domain] = email.split('@');
  if (!domain) return email;
  const visible = local.length <= 2 ? local[0] : local.slice(0, 2);
  return `${visible}${'*'.repeat(Math.max(1, local.length - 2))}@${domain}`;
}

// ── Password Management (Primary) ─────────────────────────

function isSetup() {
  const data = readAuthData();
  return {
    isSetup: !!(data['auth.isSetup'] && data['auth.passwordHash'])
  };
}

function setupPassword(password) {
  if (!password || password.length < 6) {
    return { success: false, error: 'Password must be at least 6 characters long.' };
  }

  const data = readAuthData();
  data['auth.passwordHash'] = sha256(password);
  data['auth.isSetup'] = true;
  writeAuthData(data);

  _mem.sessionToken = crypto.randomBytes(32).toString('hex');
  return { success: true };
}

function verifyPassword(password) {
  // Check lockout
  if (Date.now() < _mem.lockedUntil) {
    const remaining = Math.ceil((_mem.lockedUntil - Date.now()) / 1000);
    return { valid: false, error: `Too many attempts. Wait ${remaining} seconds.`, locked: true, remaining };
  }

  const data = readAuthData();
  if (!data['auth.isSetup']) {
    return { valid: false, error: 'No password set up.' };
  }

  const hash = sha256(password || '');
  if (hash === data['auth.passwordHash']) {
    // Success — clear lockout state
    _mem.failedAttempts = 0;
    _mem.sessionToken = crypto.randomBytes(32).toString('hex');
    return { valid: true };
  }

  // Failed attempt
  _mem.failedAttempts++;
  if (_mem.failedAttempts >= 5) {
    _mem.lockedUntil = Date.now() + 60 * 1000; // 60 second lockout
    return {
      valid: false,
      error: 'Too many attempts. Wait 60 seconds.',
      locked: true,
      remaining: 60,
    };
  }

  return {
    valid: false,
    error: `Incorrect password. Try again.`
  };
}

function changePassword(oldPassword, newPassword) {
  const data = readAuthData();
  if (sha256(oldPassword) !== data['auth.passwordHash']) {
    return { success: false, error: 'Current password is incorrect.' };
  }
  if (!newPassword || newPassword.length < 6) {
    return { success: false, error: 'New password must be at least 6 characters long.' };
  }

  data['auth.passwordHash'] = sha256(newPassword);
  writeAuthData(data);
  return { success: true };
}

// ── EmailJS Settings & Config ──────────────────────────────

function getRegisteredEmail() {
  const data = readAuthData();
  return { email: data['auth.registeredEmail'] || '', masked: maskEmail(data['auth.registeredEmail']) };
}

function setRegisteredEmail(email) {
  if (!email || !email.includes('@')) {
    return { success: false, error: 'Invalid email address.' };
  }
  const data = readAuthData();
  data['auth.registeredEmail'] = email.trim().toLowerCase();
  writeAuthData(data);
  return { success: true };
}

function getEmailJSConfig() {
  const data = readAuthData();
  return {
    serviceId: data['emailjs.serviceId'] || '',
    templateId: data['emailjs.templateId'] || '',
    publicKey: data['emailjs.publicKey'] || '',
    privateKey: data['emailjs.privateKey'] || '',
    isConfigured: data['emailjs.isConfigured'] === true
  };
}

function setEmailJSConfig(config) {
  const data = readAuthData();
  if (config.serviceId !== undefined) data['emailjs.serviceId'] = config.serviceId.trim();
  if (config.templateId !== undefined) data['emailjs.templateId'] = config.templateId.trim();
  if (config.publicKey !== undefined) data['emailjs.publicKey'] = config.publicKey.trim();
  if (config.privateKey !== undefined) data['emailjs.privateKey'] = config.privateKey.trim();
  data['emailjs.isConfigured'] = true;
  writeAuthData(data);
  return { success: true };
}

// ── EmailJS REST API Call ──────────────────────────────────

function _sendOTPEmail(toEmail, otp, timeString) {
  return new Promise((resolve, reject) => {
    const data = readAuthData();
    const serviceId = data['emailjs.serviceId'];
    const templateId = data['emailjs.templateId'];
    const publicKey = data['emailjs.publicKey'];
    const privateKey = data['emailjs.privateKey'];

    if (!serviceId || !templateId || !publicKey || !privateKey) {
      return reject(new Error('EmailJS not configured in Settings. Cannot send reset code.'));
    }

    const payload = JSON.stringify({
      service_id: serviceId,
      template_id: templateId,
      user_id: publicKey,
      accessToken: privateKey,
      template_params: {
        to_email: toEmail,
        otp: otp,
        time: timeString
      },
    });

    const options = {
      hostname: 'api.emailjs.com',
      path: '/api/v1.0/email/send',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve({ success: true });
        } else {
          reject(new Error(`EmailJS error (${res.statusCode}): ${body || 'Unknown error'}`));
        }
      });
    });

    req.on('error', (err) => reject(new Error('Network error: ' + err.message)));
    req.setTimeout(15000, () => {
      req.destroy();
      reject(new Error('Request timed out.'));
    });

    req.write(payload);
    req.end();
  });
}

// ── Forgot Password Flow ──────────────────────────────────

async function sendResetOTP(email) {
  // ── Idempotency lock: reject if already sending ──
  if (_mem.isSendingOTP) {
    return { success: false, error: 'Email is already being sent. Please wait.' };
  }

  const data = readAuthData();
  const registeredEmail = data['auth.registeredEmail'];
  const isConfigured = data['emailjs.isConfigured'];

  if (!isConfigured) {
    return { success: false, error: 'Email service not configured. Please go to Settings -> Security to configure it.' };
  }

  if (!registeredEmail) {
    return { success: false, error: 'No recovery email configured. Cannot reset password.' };
  }

  if (email.trim().toLowerCase() !== registeredEmail) {
    // Intentionally vague error for security, or explicit as per UX preference
    return { success: false, error: 'Email does not match registered recovery email.' };
  }

  // Acquire the lock
  _mem.isSendingOTP = true;

  const otp = String(Math.floor(100000 + Math.random() * 900000));
  _mem.otpHash = sha256(otp);
  
  // 15 minutes expiry
  const expiryDate = new Date(Date.now() + 15 * 60 * 1000);
  _mem.otpExpiry = expiryDate.getTime(); 
  _mem.resetEmail = registeredEmail;

  // Format time (e.g., 10:30 PM)
  const timeString = expiryDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

  try {
    await _sendOTPEmail(registeredEmail, otp, timeString);
    return { success: true };
  } catch (err) {
    _mem.otpHash = null;
    _mem.otpExpiry = 0;
    _mem.resetEmail = null;
    return { success: false, error: err.message };
  } finally {
    _mem.isSendingOTP = false;
  }
}

function verifyResetOTP(code) {
  if (!_mem.otpHash) {
    return { valid: false, error: 'No reset code requested.' };
  }

  if (Date.now() > _mem.otpExpiry) {
    _mem.otpHash = null;
    _mem.otpExpiry = 0;
    return { valid: false, error: 'Code expired. Please request a new one.' };
  }

  const hash = sha256(String(code).trim());
  if (hash === _mem.otpHash) {
    // Valid code, but we do NOT reset password here. We just validate the code is correct.
    // The actual reset happens in resetPasswordWithOTP
    return { valid: true };
  }

  return { valid: false, error: 'Incorrect code.' };
}

function resetPasswordWithOTP(code, newPassword) {
  const verification = verifyResetOTP(code);
  if (!verification.valid) {
    return { success: false, error: verification.error };
  }

  if (!newPassword || newPassword.length < 6) {
    return { success: false, error: 'New password must be at least 6 characters long.' };
  }

  // Success
  const data = readAuthData();
  data['auth.passwordHash'] = sha256(newPassword);
  writeAuthData(data);

  // Clear memory state
  _mem.otpHash = null;
  _mem.otpExpiry = 0;
  _mem.resetEmail = null;

  return { success: true };
}

// ── Test Config ───────────────────────────────────────────

async function sendTestOTP() {
  // ── Idempotency lock: reject if already sending ──
  if (_mem.isSendingOTP) {
    return { success: false, error: 'Email is already being sent. Please wait.' };
  }

  const data = readAuthData();
  const email = data['auth.registeredEmail'];
  if (!email) return { success: false, error: 'No registered email set.' };

  // Acquire the lock
  _mem.isSendingOTP = true;

  const otp = String(Math.floor(100000 + Math.random() * 900000));
  const expiryDate = new Date(Date.now() + 15 * 60 * 1000);
  const timeString = expiryDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

  try {
    await _sendOTPEmail(email, otp, timeString);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  } finally {
    _mem.isSendingOTP = false;
  }
}

// ── Session ───────────────────────────────────────────────

function clearSession() {
  _mem.sessionToken = null;
  _mem.otpHash = null;
  _mem.otpExpiry = 0;
}

module.exports = {
  isSetup,
  setupPassword,
  verifyPassword,
  changePassword,
  
  getRegisteredEmail,
  setRegisteredEmail,
  getEmailJSConfig,
  setEmailJSConfig,
  
  sendResetOTP,
  verifyResetOTP,
  resetPasswordWithOTP,
  
  sendTestOTP,
  clearSession
};
