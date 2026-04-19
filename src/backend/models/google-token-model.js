const fs = require('fs');
const path = require('path');

const dataDir = global.DATA_PATH || path.join(__dirname, '..', '..', '..', 'data');
const TOKEN_PATH = path.join(dataDir, 'google-tokens.json');

function loadTokens() {
    try {
        if (fs.existsSync(TOKEN_PATH)) {
            const data = fs.readFileSync(TOKEN_PATH, 'utf8');
            return JSON.parse(data);
        }
    } catch (err) {
        console.error('Error loading tokens:', err);
    }
    return null;
}

function saveTokens(data) {
    try {
        const dir = path.dirname(TOKEN_PATH);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(TOKEN_PATH, JSON.stringify(data, null, 2), 'utf8');
    } catch (err) {
        console.error('Error saving tokens:', err);
    }
}

function clearTokens() {
    try {
        if (fs.existsSync(TOKEN_PATH)) {
            fs.unlinkSync(TOKEN_PATH);
        }
    } catch (err) {
        console.error('Error clearing tokens:', err);
    }
}

function hasTokens() {
    const tokens = loadTokens();
    return tokens !== null && tokens.refresh_token !== undefined;
}

module.exports = {
    loadTokens,
    saveTokens,
    clearTokens,
    hasTokens
};
