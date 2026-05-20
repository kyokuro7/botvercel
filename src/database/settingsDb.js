const fs = require('fs');
const path = require('path');

const SETTINGS_PATH = path.join(__dirname, '../../data/settings.json');

// Pastikan folder data ada
function ensureDataDir() {
  const dataDir = path.dirname(SETTINGS_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

// Default settings
const DEFAULT_SETTINGS = {
  security: {
    enabled: true,                // Toggle utama keamanan
    block_phishing: true,         // Blokir deploy phishing
    block_webbug: true,           // Blokir deploy web bug/IP logger
    scan_on_deploy: true,         // Scan saat deploy
    scan_on_update: true,         // Scan saat update file
    min_block_score: 5,           // Skor minimum untuk blokir
    notify_owner: true,           // Notifikasi owner jika ada ancaman
  },
};

/**
 * Load settings dari file
 */
function loadSettings() {
  ensureDataDir();
  if (!fs.existsSync(SETTINGS_PATH)) {
    fs.writeFileSync(SETTINGS_PATH, JSON.stringify(DEFAULT_SETTINGS, null, 2));
    return { ...DEFAULT_SETTINGS };
  }
  try {
    const data = JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf-8'));
    // Merge dengan default untuk field baru
    return {
      ...DEFAULT_SETTINGS,
      ...data,
      security: { ...DEFAULT_SETTINGS.security, ...(data.security || {}) },
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

/**
 * Save settings ke file
 */
function saveSettings(settings) {
  ensureDataDir();
  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2));
}

/**
 * Ambil security settings
 */
function getSecuritySettings() {
  const settings = loadSettings();
  return settings.security;
}

/**
 * Update security settings
 */
function updateSecuritySettings(updates) {
  const settings = loadSettings();
  settings.security = { ...settings.security, ...updates };
  saveSettings(settings);
  return settings.security;
}

/**
 * Toggle security on/off
 */
function toggleSecurity(enabled) {
  return updateSecuritySettings({ enabled });
}

/**
 * Toggle phishing detection on/off
 */
function togglePhishing(enabled) {
  return updateSecuritySettings({ block_phishing: enabled });
}

/**
 * Toggle web bug detection on/off
 */
function toggleWebBug(enabled) {
  return updateSecuritySettings({ block_webbug: enabled });
}

/**
 * Cek apakah security scan aktif
 */
function isSecurityEnabled() {
  const settings = getSecuritySettings();
  return settings.enabled;
}

module.exports = {
  loadSettings,
  saveSettings,
  getSecuritySettings,
  updateSecuritySettings,
  toggleSecurity,
  togglePhishing,
  toggleWebBug,
  isSecurityEnabled,
  DEFAULT_SETTINGS,
};
