const { Markup } = require('telegraf');
const axios = require('axios');
const { deployToVercel, deployZipToVercel } = require('../deploy/vercel');
const { deployToNetlify, deployZipToNetlify } = require('../deploy/netlify');
const { getDeployRemaining, useDeployLimit, isOwner } = require('../database/userDb');

module.exports = function deployCommand(bot) {
  // =====================
  // /deploy - Tampilkan pilihan platform (cek limit dulu)
  // =====================
  bot.command('deploy', (ctx) => {
    const userId = ctx.from.id;
    const remaining = getDeployRemaining(userId);

    // Owner bypass limit
    if (!isOwner(userId) && remaining <= 0) {
      return ctx.reply(
        '❌ *Limit Deploy Habis!*\n\n' +
          'Kamu tidak punya sisa limit deploy.\n\n' +
          '💡 *Cara dapat limit tambahan:*\n' +
          '• Join channel event = +2 limit per channel\n' +
          '• Ketik /event untuk lihat channel tersedia',
        {
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard([
            [Markup.button.callback('🎯 Lihat Event', 'menu_event')],
          ]),
        }
      );
    }

    ctx.session.deployState = null;
    ctx.session.platform = null;
    ctx.session.projectName = null;

    ctx.reply(
      `🚀 *Deploy Website*\n\n` +
      `📊 Sisa limit: *${remaining}* deploy\n\n` +
      `Pilih platform yang ingin kamu gunakan:`,
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [
            Markup.button.callback('🔺 Vercel', 'platform_vercel'),
            Markup.button.callback('🟩 Netlify', 'platform_netlify'),
          ],
          [Markup.button.callback('❌ Batal', 'deploy_cancel')],
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
      '🔺 *Vercel* dipilih\\!\n\n' +
      '━━━━━━━━━━━━━━━━━━━━\n\n' +
      'Sekarang, ketik *nama project* kamu:\n\n' +
      '📝 Contoh:\n' +
      '• `my-website`\n' +
      '• `portofolio`\n' +
      '• `landing-page`',
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
      '🟩 *Netlify* dipilih\\!\n\n' +
      '━━━━━━━━━━━━━━━━━━━━\n\n' +
      'Sekarang, ketik *nama project* kamu:\n\n' +
      '📝 Contoh:\n' +
      '• `my-website`\n' +
      '• `portofolio`\n' +
      '• `landing-page`',
      { parse_mode: 'Markdown' }
    );
  });

  // =====================
  // Handler teks: terima nama project
  // =====================
  bot.on('text', async (ctx, next) => {
    if (ctx.session.deployState !== 'waiting_project_name') return next();

    const projectName = ctx.message.text.trim();
    if (!projectName || projectName.startsWith('/')) return next();
    if (projectName.length < 2) {
      return ctx.reply('⚠️ Nama project terlalu pendek. Minimal 2 karakter ya!');
    }

    ctx.session.projectName = projectName;
    ctx.session.deployState = 'waiting_html';

    const platform = ctx.session.platform === 'vercel' ? '🔺 Vercel' : '🟩 Netlify';

    ctx.reply(
      `✅ *Nama project:* ${projectName}\n` +
      `🌐 *Platform:* ${platform}\n\n` +
      `━━━━━━━━━━━━━━━━━━━━\n\n` +
      `📤 *Kirim file kamu:*\n\n` +
      `• 📄 File *\\.html* — halaman tunggal\n` +
      `• 📦 File *\\.zip* — multi\\-file\n` +
      `  _(HTML \\+ CSS \\+ JS \\+ gambar)_\n\n` +
      `⚡ Siap untuk di\\-deploy\\!`,
      { parse_mode: 'Markdown' }
    );
  });

  // =====================
  // Handler dokumen: terima file HTML atau ZIP
  // =====================
  bot.on('document', async (ctx, next) => {
    if (ctx.session.deployState !== 'waiting_html') return next();

    const doc = ctx.message.document;
    const fileName = doc.file_name || '';
    const isHtml = fileName.endsWith('.html') || fileName.endsWith('.htm');
    const isZip = fileName.endsWith('.zip');

    if (!isHtml && !isZip) {
      return ctx.reply(
        '⚠️ File harus berformat *.html*, *.htm*, atau *.zip* ya!',
        { parse_mode: 'Markdown' }
      );
    }

    const platform = ctx.session.platform;
    const projectName = ctx.session.projectName;
    const platformLabel = platform === 'vercel' ? 'Vercel 🔺' : 'Netlify 🟩';
    const fileType = isZip ? '📦 ZIP (multi-file)' : '📄 HTML';

    const loadingMsg = await ctx.reply(
      `⏳ Sedang deploy *${fileType}* ke *${platformLabel}*...\n\nMohon tunggu sebentar!`,
      { parse_mode: 'Markdown' }
    );

    try {
      // Download file dari Telegram
      const fileLink = await ctx.telegram.getFileLink(doc.file_id);
      const fileRes = await axios.get(fileLink.href, { responseType: 'arraybuffer' });
      const fileBuffer = Buffer.from(fileRes.data);

      let result;

      if (isHtml) {
        // Deploy file HTML tunggal
        const htmlContent = fileBuffer.toString('utf-8');
        if (platform === 'vercel') {
          result = await deployToVercel(projectName, htmlContent);
        } else {
          result = await deployToNetlify(projectName, htmlContent);
        }
      } else {
        // Deploy ZIP multi-file
        const fileMap = await extractZipToFileMap(fileBuffer);

        // Pastikan ada index.html di dalam ZIP
        const hasIndex = Object.keys(fileMap).some(
          (f) => f === 'index.html' || f.endsWith('/index.html')
        );
        if (!hasIndex) {
          await ctx.telegram.deleteMessage(ctx.chat.id, loadingMsg.message_id);
          return ctx.reply(
            '⚠️ ZIP kamu harus mengandung file *index.html* ya!',
            { parse_mode: 'Markdown' }
          );
        }

        if (platform === 'vercel') {
          result = await deployZipToVercel(projectName, fileMap);
        } else {
          result = await deployZipToNetlify(projectName, fileMap);
        }
      }

      // Kurangi limit deploy (owner bypass)
      const userId = ctx.from.id;
      if (!isOwner(userId)) {
        const limitResult = useDeployLimit(userId);
        var remainingAfter = limitResult.remaining;
      } else {
        var remainingAfter = '∞';
      }

      ctx.session.deployState = null;
      ctx.session.platform = null;
      ctx.session.projectName = null;

      await ctx.telegram.deleteMessage(ctx.chat.id, loadingMsg.message_id);

      ctx.reply(
        `✅ *Deploy Berhasil!*\n\n` +
          `━━━━━━━━━━━━━━━━━━━━\n\n` +
          `📦 *Project:* ${projectName}\n` +
          `🌐 *Platform:* ${platformLabel}\n` +
          `📁 *Tipe:* ${fileType}\n\n` +
          `━━━━━━━━━━━━━━━━━━━━\n\n` +
          `🔗 *URL Website:*\n${result.url}\n\n` +
          `📊 *Sisa limit:* ${remainingAfter} deploy\n\n` +
          `🎉 _Website kamu sudah live!_`,
        { parse_mode: 'Markdown' }
      );
    } catch (err) {
      console.error('Deploy error:', err.message);

      ctx.session.deployState = null;
      ctx.session.platform = null;
      ctx.session.projectName = null;

      await ctx.telegram.deleteMessage(ctx.chat.id, loadingMsg.message_id).catch(() => {});

      ctx.reply(
        `❌ *Deploy Gagal!*\n\nPenyebab: ${err.message}\n\nCoba lagi dengan /deploy`,
        { parse_mode: 'Markdown' }
      );
    }
  });

  // =====================
  // Batal
  // =====================
  bot.action('deploy_cancel', (ctx) => {
    ctx.session.deployState = null;
    ctx.session.platform = null;
    ctx.session.projectName = null;
    ctx.editMessageText('❌ Deploy dibatalkan.');
  });
};

/**
 * Ekstrak ZIP buffer menjadi fileMap { 'path': Buffer }
 */
async function extractZipToFileMap(zipBuffer) {
  const JSZip = require('jszip');
  const zip = await JSZip.loadAsync(zipBuffer);
  const fileMap = {};

  for (const [relativePath, zipEntry] of Object.entries(zip.files)) {
    if (!zipEntry.dir) {
      const content = await zipEntry.async('nodebuffer');
      // Normalisasi path: hapus leading slash atau folder wrapper
      const cleanPath = relativePath.replace(/^\//, '');
      fileMap[cleanPath] = content;
    }
  }

  return fileMap;
}
