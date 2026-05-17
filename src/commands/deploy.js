const { Markup } = require('telegraf');
const { deployToVercel } = require('../deploy/vercel');
const { deployToNetlify } = require('../deploy/netlify');

module.exports = function deployCommand(bot) {
  // =====================
  // /deploy - Tampilkan pilihan platform
  // =====================
  bot.command('deploy', (ctx) => {
    // Reset session state
    ctx.session.deployState = null;
    ctx.session.platform = null;
    ctx.session.projectName = null;

    ctx.reply(
      '🚀 *Deploy Website*\n\nPilih platform yang ingin kamu gunakan:',
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [
            Markup.button.callback('🔺 Vercel', 'platform_vercel'),
            Markup.button.callback('🟩 Netlify', 'platform_netlify'),
          ],
        ]),
      }
    );
  });

  // =====================
  // Callback: pilih Vercel
  // =====================
  bot.action('platform_vercel', (ctx) => {
    ctx.session.platform = 'vercel';
    ctx.session.deployState = 'waiting_project_name';

    ctx.editMessageText(
      '🔺 *Vercel* dipilih!\n\nSekarang, ketik *nama project* kamu:\n_(contoh: my-website, portofolio, landing-page)_',
      { parse_mode: 'Markdown' }
    );
  });

  // =====================
  // Callback: pilih Netlify
  // =====================
  bot.action('platform_netlify', (ctx) => {
    ctx.session.platform = 'netlify';
    ctx.session.deployState = 'waiting_project_name';

    ctx.editMessageText(
      '🟩 *Netlify* dipilih!\n\nSekarang, ketik *nama project* kamu:\n_(contoh: my-website, portofolio, landing-page)_',
      { parse_mode: 'Markdown' }
    );
  });

  // =====================
  // Handler: terima pesan teks
  // =====================
  bot.on('text', async (ctx, next) => {
    const state = ctx.session.deployState;

    // Hanya proses jika sedang dalam flow deploy
    if (state !== 'waiting_project_name') {
      return next();
    }

    const projectName = ctx.message.text.trim();

    // Validasi nama project
    if (!projectName || projectName.startsWith('/')) {
      return next();
    }

    if (projectName.length < 2) {
      return ctx.reply('⚠️ Nama project terlalu pendek. Minimal 2 karakter ya!');
    }

    // Simpan nama project, minta HTML
    ctx.session.projectName = projectName;
    ctx.session.deployState = 'waiting_html';

    const platform = ctx.session.platform === 'vercel' ? '🔺 Vercel' : '🟩 Netlify';

    ctx.reply(
      `✅ Nama project: *${projectName}*\nPlatform: *${platform}*\n\n` +
        `Sekarang kirim *file HTML* kamu (.html)\n` +
        `_(Kamu bisa kirim file langsung dari Telegram)_`,
      { parse_mode: 'Markdown' }
    );
  });

  // =====================
  // Handler: terima file dokumen (HTML)
  // =====================
  bot.on('document', async (ctx) => {
    const state = ctx.session.deployState;

    if (state !== 'waiting_html') {
      return ctx.reply('❓ Ketik /deploy dulu untuk mulai deploy ya!');
    }

    const doc = ctx.message.document;

    // Validasi ekstensi file
    const fileName = doc.file_name || '';
    if (!fileName.endsWith('.html') && !fileName.endsWith('.htm')) {
      return ctx.reply('⚠️ File harus berformat *.html* atau *.htm* ya!', {
        parse_mode: 'Markdown',
      });
    }

    const platform = ctx.session.platform;
    const projectName = ctx.session.projectName;

    // Kirim pesan loading
    const loadingMsg = await ctx.reply(
      `⏳ Sedang memproses deploy ke *${platform === 'vercel' ? 'Vercel 🔺' : 'Netlify 🟩'}*...\n\nMohon tunggu sebentar!`,
      { parse_mode: 'Markdown' }
    );

    try {
      // Download file HTML dari Telegram
      const fileLink = await ctx.telegram.getFileLink(doc.file_id);
      const axios = require('axios');
      const htmlRes = await axios.get(fileLink.href, { responseType: 'text' });
      const htmlContent = htmlRes.data;

      let result;

      if (platform === 'vercel') {
        result = await deployToVercel(projectName, htmlContent);
      } else {
        result = await deployToNetlify(projectName, htmlContent);
      }

      // Reset session setelah berhasil
      ctx.session.deployState = null;
      ctx.session.platform = null;
      ctx.session.projectName = null;

      // Hapus pesan loading
      await ctx.telegram.deleteMessage(ctx.chat.id, loadingMsg.message_id);

      // Kirim hasil sukses
      ctx.reply(
        `✅ *Deploy Berhasil!*\n\n` +
          `📦 Project: *${projectName}*\n` +
          `🌐 Platform: *${platform === 'vercel' ? 'Vercel 🔺' : 'Netlify 🟩'}*\n\n` +
          `🔗 URL Website kamu:\n${result.url}\n\n` +
          `_Selamat! Website kamu sudah live_ 🎉`,
        { parse_mode: 'Markdown' }
      );
    } catch (err) {
      console.error('Deploy error:', err.message);

      // Reset session saat error
      ctx.session.deployState = null;
      ctx.session.platform = null;
      ctx.session.projectName = null;

      // Hapus pesan loading
      await ctx.telegram
        .deleteMessage(ctx.chat.id, loadingMsg.message_id)
        .catch(() => {});

      ctx.reply(
        `❌ *Deploy Gagal!*\n\n` +
          `Penyebab: ${err.message}\n\n` +
          `Coba lagi dengan /deploy`,
        { parse_mode: 'Markdown' }
      );
    }
  });
};
