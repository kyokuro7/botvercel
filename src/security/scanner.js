/**
 * Security Scanner - Deteksi Web Bug & Phishing
 * 
 * Fitur:
 * - Deteksi pola phishing (form login palsu, redirect mencurigakan)
 * - Deteksi web bug (IP logger, tracking pixel, grabber)
 * - Scan konten HTML & JS dalam file deploy
 */

// =====================
// POLA PHISHING
// =====================
const PHISHING_PATTERNS = [
  // Form login palsu (mirip platform populer)
  { pattern: /action=["'][^"']*login/i, score: 3, desc: 'Form login mencurigakan' },
  { pattern: /password.*type=["']password/i, score: 2, desc: 'Input password terdeteksi' },
  { pattern: /(facebook|instagram|google|whatsapp|telegram|bank|bca|bni|bri|mandiri|dana|gopay|ovo|shopeepay).*login/i, score: 5, desc: 'Imitasi halaman login platform terkenal' },
  { pattern: /(verify|verifikasi).*account/i, score: 3, desc: 'Halaman verifikasi akun palsu' },
  { pattern: /your.*account.*has.*been.*(?:locked|suspended|limited)/i, score: 4, desc: 'Pesan akun terkunci (social engineering)' },
  { pattern: /(confirm|konfirmasi).*(?:password|kata.?sandi)/i, score: 4, desc: 'Konfirmasi password palsu' },
  
  // Redirect mencurigakan
  { pattern: /window\.location\s*=\s*["'][^"']+["']/i, score: 2, desc: 'Redirect JavaScript' },
  { pattern: /meta.*http-equiv=["']refresh["'].*url=/i, score: 2, desc: 'Meta redirect' },
  { pattern: /document\.location\s*=\s*/i, score: 2, desc: 'Document location redirect' },
  
  // Data exfiltration
  { pattern: /fetch\s*\(\s*["']https?:\/\/[^"']+["']\s*,\s*\{[^}]*method\s*:\s*["']POST["']/i, score: 3, desc: 'Pengiriman data ke server eksternal' },
  { pattern: /xmlhttprequest|\.ajax\s*\(/i, score: 1, desc: 'AJAX request' },
  { pattern: /document\.cookie/i, score: 3, desc: 'Akses cookie' },
  { pattern: /localStorage|sessionStorage/i, score: 1, desc: 'Akses storage browser' },
  
  // Obfuscation (sering dipakai phishing)
  { pattern: /eval\s*\(\s*(?:atob|unescape|decodeURIComponent)/i, score: 5, desc: 'Kode ter-obfuscate (eval + decode)' },
  { pattern: /String\.fromCharCode\s*\([^)]{50,}\)/i, score: 4, desc: 'String encoding mencurigakan' },
  { pattern: /\\x[0-9a-f]{2}(?:\\x[0-9a-f]{2}){10,}/i, score: 4, desc: 'Hex encoding panjang' },
  { pattern: /atob\s*\(\s*["'][A-Za-z0-9+/=]{50,}["']\s*\)/i, score: 4, desc: 'Base64 decode mencurigakan' },
];

// =====================
// POLA WEB BUG / IP LOGGER
// =====================
const WEBBUG_PATTERNS = [
  // IP Logger services
  { pattern: /iplogger\.org/i, score: 5, desc: 'IP Logger service terdeteksi' },
  { pattern: /grabify\.link/i, score: 5, desc: 'Grabify link terdeteksi' },
  { pattern: /ipgrabber/i, score: 5, desc: 'IP Grabber terdeteksi' },
  { pattern: /canarytokens\.com/i, score: 4, desc: 'Canary token terdeteksi' },
  { pattern: /blasze\.tk/i, score: 5, desc: 'Blasze IP logger terdeteksi' },
  { pattern: /2no\.co/i, score: 5, desc: '2no.co logger terdeteksi' },
  { pattern: /iplis\.ru/i, score: 5, desc: 'IPlis logger terdeteksi' },
  { pattern: /02telefonos\.info/i, score: 4, desc: 'IP logger terdeteksi' },
  { pattern: /ps3cfw\.com/i, score: 4, desc: 'PS3CFW logger terdeteksi' },
  
  // Tracking pixel / web bug
  { pattern: /img.*src=["'][^"']+\?.*(?:id|uid|track|log)=/i, score: 3, desc: 'Tracking pixel terdeteksi' },
  { pattern: /width=["']1["'].*height=["']1["']/i, score: 2, desc: 'Hidden 1x1 pixel (tracking)' },
  { pattern: /display:\s*none.*<img/i, score: 3, desc: 'Hidden image (tracking)' },
  { pattern: /visibility:\s*hidden.*<img/i, score: 3, desc: 'Hidden image (tracking)' },
  
  // Webhook / data grabber
  { pattern: /discord\.com\/api\/webhooks/i, score: 4, desc: 'Discord webhook (data grabber)' },
  { pattern: /webhook\.site/i, score: 4, desc: 'Webhook.site terdeteksi' },
  { pattern: /requestbin\.com/i, score: 3, desc: 'RequestBin terdeteksi' },
  { pattern: /pipedream\.net/i, score: 3, desc: 'Pipedream webhook terdeteksi' },
  
  // Navigator/device info grabbing
  { pattern: /navigator\.(?:userAgent|platform|language|plugins|hardwareConcurrency)/i, score: 2, desc: 'Pengambilan info device' },
  { pattern: /screen\.(?:width|height|colorDepth)/i, score: 1, desc: 'Pengambilan info layar' },
  { pattern: /navigator\.geolocation/i, score: 4, desc: 'Akses lokasi GPS' },
  { pattern: /navigator\.mediaDevices|getUserMedia/i, score: 5, desc: 'Akses kamera/mikrofon' },
  { pattern: /RTCPeerConnection/i, score: 4, desc: 'WebRTC (bisa leak IP)' },
  
  // Keylogger patterns
  { pattern: /addEventListener\s*\(\s*["']key(?:down|up|press)["']/i, score: 4, desc: 'Keylogger terdeteksi' },
  { pattern: /onkey(?:down|up|press)\s*=/i, score: 3, desc: 'Key event handler mencurigakan' },
];

// =====================
// DOMAIN BLACKLIST (partial match)
// =====================
const SUSPICIOUS_DOMAINS = [
  'iplogger.org',
  'grabify.link',
  '2no.co',
  'iplis.ru',
  'blasze.tk',
  'ps3cfw.com',
  'urlz.fr',
  'yip.su',
  'cutt.ly/tracking',
  'webhook.site',
  'requestbin.com',
];

/**
 * Scan konten HTML/JS untuk pola berbahaya
 * @param {string} content - Konten file yang akan di-scan
 * @returns {object} - Hasil scan { safe, score, threats, level }
 */
function scanContent(content) {
  const threats = [];
  let totalScore = 0;

  // Scan phishing patterns
  for (const { pattern, score, desc } of PHISHING_PATTERNS) {
    if (pattern.test(content)) {
      threats.push({ type: 'PHISHING', desc, score });
      totalScore += score;
    }
  }

  // Scan web bug patterns
  for (const { pattern, score, desc } of WEBBUG_PATTERNS) {
    if (pattern.test(content)) {
      threats.push({ type: 'WEB_BUG', desc, score });
      totalScore += score;
    }
  }

  // Scan suspicious domains
  for (const domain of SUSPICIOUS_DOMAINS) {
    if (content.toLowerCase().includes(domain)) {
      threats.push({ type: 'BLACKLIST', desc: `Domain mencurigakan: ${domain}`, score: 5 });
      totalScore += 5;
    }
  }

  // Tentukan level ancaman
  let level = 'SAFE';
  if (totalScore >= 10) level = 'DANGER';
  else if (totalScore >= 5) level = 'WARNING';
  else if (totalScore >= 2) level = 'LOW';

  return {
    safe: totalScore < 5,
    score: totalScore,
    threats,
    level,
  };
}

/**
 * Scan file map (multiple files) untuk ancaman
 * @param {object} fileMap - { 'path': Buffer/string }
 * @returns {object} - Hasil scan gabungan
 */
function scanFileMap(fileMap) {
  const allThreats = [];
  let totalScore = 0;
  const fileResults = {};

  for (const [filePath, content] of Object.entries(fileMap)) {
    // Hanya scan file text (html, js, css, json, txt)
    const ext = filePath.split('.').pop().toLowerCase();
    const textExtensions = ['html', 'htm', 'js', 'css', 'json', 'txt', 'svg', 'xml', 'php'];
    
    if (!textExtensions.includes(ext)) continue;

    const contentStr = Buffer.isBuffer(content) ? content.toString('utf-8') : String(content);
    const result = scanContent(contentStr);

    if (result.threats.length > 0) {
      fileResults[filePath] = result;
      allThreats.push(...result.threats.map(t => ({ ...t, file: filePath })));
      totalScore += result.score;
    }
  }

  let level = 'SAFE';
  if (totalScore >= 10) level = 'DANGER';
  else if (totalScore >= 5) level = 'WARNING';
  else if (totalScore >= 2) level = 'LOW';

  return {
    safe: totalScore < 5,
    score: totalScore,
    threats: allThreats,
    level,
    fileResults,
  };
}

/**
 * Format hasil scan menjadi pesan Telegram
 * @param {object} scanResult - Hasil dari scanContent atau scanFileMap
 * @returns {string} - Pesan format Telegram
 */
function formatScanReport(scanResult) {
  const { safe, score, threats, level } = scanResult;

  if (safe && threats.length === 0) {
    return '✅ *Scan Keamanan: AMAN*\n\nTidak ditemukan ancaman.';
  }

  const levelEmoji = {
    SAFE: '✅',
    LOW: '⚠️',
    WARNING: '🟠',
    DANGER: '🔴',
  };

  const typeEmoji = {
    PHISHING: '🎣',
    WEB_BUG: '🐛',
    BLACKLIST: '⛔',
  };

  let report = `${levelEmoji[level]} *Scan Keamanan: ${level}*\n`;
  report += `━━━━━━━━━━━━━━━━━━━━\n\n`;
  report += `📊 Skor ancaman: ${score}\n`;
  report += `🔍 Ditemukan: ${threats.length} potensi ancaman\n\n`;

  // Grouping by type
  const phishingThreats = threats.filter(t => t.type === 'PHISHING');
  const webBugThreats = threats.filter(t => t.type === 'WEB_BUG');
  const blacklistThreats = threats.filter(t => t.type === 'BLACKLIST');

  if (phishingThreats.length > 0) {
    report += `🎣 *Phishing (${phishingThreats.length}):*\n`;
    phishingThreats.forEach(t => {
      report += `  • ${t.desc}${t.file ? ` [${t.file}]` : ''}\n`;
    });
    report += '\n';
  }

  if (webBugThreats.length > 0) {
    report += `🐛 *Web Bug/Logger (${webBugThreats.length}):*\n`;
    webBugThreats.forEach(t => {
      report += `  • ${t.desc}${t.file ? ` [${t.file}]` : ''}\n`;
    });
    report += '\n';
  }

  if (blacklistThreats.length > 0) {
    report += `⛔ *Domain Blacklist (${blacklistThreats.length}):*\n`;
    blacklistThreats.forEach(t => {
      report += `  • ${t.desc}${t.file ? ` [${t.file}]` : ''}\n`;
    });
    report += '\n';
  }

  if (!safe) {
    report += `\n🚫 *DEPLOY DIBLOKIR*\nFile mengandung konten berbahaya!`;
  }

  return report;
}

module.exports = {
  scanContent,
  scanFileMap,
  formatScanReport,
  PHISHING_PATTERNS,
  WEBBUG_PATTERNS,
  SUSPICIOUS_DOMAINS,
};
