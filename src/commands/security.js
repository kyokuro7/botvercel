const { Markup } = require('telegraf');
const { isOwner } = require('../database/userDb');
const {
  getSecuritySettings,
  updateSecuritySettings,
  toggleSecurity,
  togglePhishing,
  toggleWebBug,
} = require('../database/settingsDb');

module.exports = function securityCommand(bot) {
  // =====================
  // /security - Menu Keamanan (Owner Only)
  // =====================
  bot.command('security', (ctx) => {
    const userId = ctx.from.id;
    if (!isOwner(userId)) {
      return ctx.reply('🚫 Perintah ini hanya untuk owner.');
    }
    showSecurityMenu(ctx, false);
  });

  // =====================
  // Action: Menu Keamanan dari tombol
  // =====================
  bot.action('menu_security', (ctx) => {
    const userId = ctx.from.id;
    if (!isOwner(userId)) {
      return ctx.answerCbQuery('🚫 Fitur ini hanya untuk owner.', { show_alert: true });
    }
    showSecurityMenu(ctx, true);
  });

  // =====================
  // Toggle: Keamanan Utama ON/OFF
  // =====================
  bot.action('sec_toggle_main', (ctx) => {
    const userId = ctx.from.id;
    if (!isOwner(userId)) return ctx.answerCbQuery('🚫 Hanya owner.');

    const settings = getSecuritySettings();
    const newState = !settings.enabled;
    toggleSecurity(newState);

    ctx.answerCbQuery(`🔒 Keamanan ${newState ? 'DIAKTIFKAN ✅' : 'DIMATIKAN ❌'}`, { show_alert: true });
    showSecurityMenu(ctx, true);
  });

  // =====================
  // Toggle: Deteksi Phishing ON/OFF
  // =====================
  bot.action('sec_toggle_phishing', (ctx) => {
    const userId = ctx.from.id;
    if (!isOwner(userId)) return ctx.answerCbQuery('🚫 Hanya owner.');

    const settings = getSecuritySettings();
    const newState = !settings.block_phishing;
    togglePhishing(newState);

    ctx.answerCbQuery(`🎣 Anti-Phishing ${newState ? 'AKTIF ✅' : 'NONAKTIF ❌'}`, { show_alert: true });
    showSecurityMenu(ctx, true);
  });

  // =====================
  // Toggle: Deteksi Web Bug ON/OFF
  // =====================
  bot.action('sec_toggle_webbug', (ctx) => {
    const userId = ctx.from.id;
    if (!isOwner(userId)) return ctx.answerCbQuery('🚫 Hanya owner.');

    const settings = getSecuritySettings();
    const newState = !settings.block_webbug;
    toggleWebBug(newState);

    ctx.answerCbQuery(`🐛 Anti-WebBug ${newState ? 'AKTIF ✅' : 'NONAKTIF ❌'}`, { show_alert: true });
    showSecurityMenu(ctx, true);
  });

  // =====================
  // Toggle: Scan on Deploy
  // =====================
  bot.action('sec_toggle_deploy', (ctx) => {
    const userId = ctx.from.id;
    if (!isOwner(userId)) return ctx.answerCbQuery('🚫 Hanya owner.');

    const settings = getSecuritySettings();
    const newState = !settings.scan_on_deploy;
    updateSecuritySettings({ scan_on_deploy: newState });

    ctx.answerCbQuery(`🚀 Scan Deploy ${newState ? 'AKTIF ✅' : 'NONAKTIF ❌'}`, { show_alert: true });
    showSecurityMenu(ctx, true);
  });

  // =====================
  // Toggle: Scan on Update
  // =====================
  bot.action('sec_toggle_update', (ctx) => {
    const userId = ctx.from.id;
    if (!isOwner(userId)) return ctx.answerCbQuery('🚫 Hanya owner.');

    const settings = getSecuritySettings();
    const newState = !settings.scan_on_update;
    updateSecuritySettings({ scan_on_update: newState });

    ctx.answerCbQuery(`🔄 Scan Update ${newState ? 'AKTIF ✅' : 'NONAKTIF ❌'}`, { show_alert: true });
    showSecurityMenu(ctx, true);
  });

  // =====================
  // Toggle: Notifikasi Owner
  // =====================
  bot.action('sec_toggle_notify', (ctx) => {
    const userId = ctx.from.id;
    if (!isOwner(userId)) return ctx.answerCbQuery('🚫 Hanya owner.');

    const settings = getSecuritySettings();
    const newState = !settings.notify_owner;
    updateSecuritySettings({ notify_owner: newState });

    ctx.answerCbQuery(`🔔 Notifikasi ${newState ? 'AKTIF ✅' : 'NONAKTIF ❌'}`, { show_alert: true });
    showSecurityMenu(ctx, true);
  });
};

/**
 * Tampilkan menu keamanan dengan status toggle
 */
function showSecurityMenu(ctx, isEdit) {
  const settings = getSecuritySettings();

  const onOff = (val) => val ? '✅ ON' : '❌ OFF';
  const toggleIcon = (val) => val ? '🟢' : '🔴';

  const message =
    `<blockquote>🛡️ Pengaturan Keamanan\n` +
    `━━━━━━━━━━━━━━━━━━━━\n\n` +
    `${toggleIcon(settings.enabled)} Keamanan Utama: <b>${onOff(settings.enabled)}</b>\n\n` +
    `━━━━━━━━━━━━━━━━━━━━\n\n` +
    `📋 Detail Fitur:\n\n` +
    `${toggleIcon(settings.block_phishing)} Anti-Phishing: ${onOff(settings.block_phishing)}\n` +
    `   ↳ Deteksi form login palsu, redirect\n\n` +
    `${toggleIcon(settings.block_webbug)} Anti-WebBug: ${onOff(settings.block_webbug)}\n` +
    `   ↳ Deteksi IP logger, tracker, grabber\n\n` +
    `${toggleIcon(settings.scan_on_deploy)} Scan Deploy: ${onOff(settings.scan_on_deploy)}\n` +
    `   ↳ Scan otomatis saat deploy baru\n\n` +
    `${toggleIcon(settings.scan_on_update)} Scan Update: ${onOff(settings.scan_on_update)}\n` +
    `   ↳ Scan otomatis saat update file\n\n` +
    `${toggleIcon(settings.notify_owner)} Notifikasi: ${onOff(settings.notify_owner)}\n` +
    `   ↳ Kirim alert ke owner jika ada ancaman\n\n` +
    `━━━━━━━━━━━━━━━━━━━━\n\n` +
    `⚙️ Skor blokir minimal: ${settings.min_block_score}\n` +
    `💡 Klik tombol untuk toggle ON/OFF</blockquote>`;

  const buttons = [
    [Markup.button.callback(
      `${settings.enabled ? '🟢' : '🔴'} Keamanan: ${onOff(settings.enabled)}`,
      'sec_toggle_main'
    )],
    [
      Markup.button.callback(
        `${settings.block_phishing ? '🟢' : '🔴'} Anti-Phishing`,
        'sec_toggle_phishing'
      ),
      Markup.button.callback(
        `${settings.block_webbug ? '🟢' : '🔴'} Anti-WebBug`,
        'sec_toggle_webbug'
      ),
    ],
    [
      Markup.button.callback(
        `${settings.scan_on_deploy ? '🟢' : '🔴'} Scan Deploy`,
        'sec_toggle_deploy'
      ),
      Markup.button.callback(
        `${settings.scan_on_update ? '🟢' : '🔴'} Scan Update`,
        'sec_toggle_update'
      ),
    ],
    [Markup.button.callback(
      `${settings.notify_owner ? '🔔' : '🔕'} Notifikasi`,
      'sec_toggle_notify'
    )],
    [Markup.button.callback('🏠 Menu Utama', 'menu_home')],
  ];

  const opts = {
    parse_mode: 'HTML',
    ...Markup.inlineKeyboard(buttons),
  };

  if (isEdit) {
    ctx.editMessageText(message, opts).catch(() => {});
  } else {
    ctx.reply(message, opts);
  }
}
