module.exports = function cancelCommand(bot) {
  // =====================
  // /batal - Batalkan proses yang sedang berjalan
  // =====================
  bot.command('batal', (ctx) => {
    // Cek apakah ada proses yang sedang berjalan
    const hasActiveProcess = 
      ctx.session.deployState ||
      ctx.session.manageState ||
      ctx.session.deleteState;

    if (!hasActiveProcess) {
      return ctx.reply(
        '❌ Tidak ada proses yang sedang berjalan.\n\n' +
        'Gunakan /deploy untuk memulai deploy baru.',
        { parse_mode: 'Markdown' }
      );
    }

    // Dapatkan info proses yang dibatalkan
    let processInfo = '';
    if (ctx.session.deployState) {
      const platform = ctx.session.platform === 'vercel' ? '🔺 Vercel' : 
                      ctx.session.platform === 'netlify' ? '🟩 Netlify' : '';
      const projectName = ctx.session.projectName || '';
      
      if (platform && projectName) {
        processInfo = `\n\n📦 Project: *${projectName}*\n🌐 Platform: *${platform}*`;
      } else if (platform) {
        processInfo = `\n\n🌐 Platform: *${platform}*`;
      }
    } else if (ctx.session.manageState) {
      processInfo = '\n\n⚙️ Proses: *Manage Project*';
    } else if (ctx.session.deleteState) {
      processInfo = '\n\n⚙️ Proses: *Delete Project*';
    }

    // Reset semua session state
    ctx.session.deployState = null;
    ctx.session.platform = null;
    ctx.session.projectName = null;
    ctx.session.manageState = null;
    ctx.session.deleteState = null;
    ctx.session.selectedProject = null;
    ctx.session.updateType = null;

    ctx.reply(
      `✅ *Proses dibatalkan*${processInfo}\n\n` +
      'Kamu bisa memulai proses baru kapan saja:\n' +
      '• /deploy - Deploy website baru\n' +
      '• /manage - Kelola project\n' +
      '• /delete - Hapus project',
      { parse_mode: 'Markdown' }
    );
  });
};
