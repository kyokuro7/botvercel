const { Markup } = require('telegraf');
const axios = require('axios');
const {
  listVercelProjects,
  renameVercelProject,
  updateVercelProject,
} = require('../deploy/vercel');
const {
  listNetlifySites,
  renameNetlifySite,
  updateNetlifySite,
} = require('../deploy/netlify');

module.exports = function manageCommand(bot) {
  // =====================
  // /manage - Pilih platform
  // =====================
  bot.command('manage', (ctx) => {
    ctx.session.manageState = null;
    ctx.session.managePlatform = null;
    ctx.session.manageProjectId = null;
    ctx.session.manageProjectName = null;
    ctx.session.manageProjectUrl = null;

    ctx.reply(
      '⚙️ *Kelola Project*\n\nPilih platform:',
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [
            Markup.button.callback('🔺 Vercel', 'mgr_platform_vercel'),
            Markup.button.callback('🟩 Netlify', 'mgr_platform_netlify'),
          ],
          [Markup.button.callback('❌ Batal', 'mgr_cancel')],
        ]),
      }
    );
  });

  // =====================
  // Pilih platform Vercel
  // =====================
  bot.action('mgr_platform_vercel', async (ctx) => {
    ctx.session.managePlatform = 'vercel';
    await ctx.editMessageText('⏳ Mengambil daftar project Vercel...');

    try {
      const projects = await listVercelProjects();
      if (projects.length === 0) {
        return ctx.editMessageText('📭 Tidak ada project Vercel yang ditemukan.');
      }

      // Simpan list project di session, button cukup pakai index
      ctx.session.manageProjectList = projects;

      const buttons = projects.map((p, i) => [
        Markup.button.callback(`🔺 ${p.name}`, `mgr_pick_${i}`),
      ]);
      buttons.push([Markup.button.callback('❌ Batal', 'mgr_cancel')]);

      ctx.editMessageText(
        '🔺 *Pilih project Vercel yang ingin dikelola:*',
        { parse_mode: 'Markdown', ...Markup.inlineKeyboard(buttons) }
      );
    } catch (err) {
      ctx.editMessageText(`❌ Gagal mengambil daftar project: ${err.message}`);
    }
  });

  // =====================
  // Pilih platform Netlify
  // =====================
  bot.action('mgr_platform_netlify', async (ctx) => {
    ctx.session.managePlatform = 'netlify';
    await ctx.editMessageText('⏳ Mengambil daftar site Netlify...');

    try {
      const sites = await listNetlifySites();
      if (sites.length === 0) {
        return ctx.editMessageText('📭 Tidak ada site Netlify yang ditemukan.');
      }

      // Simpan list site di session, button cukup pakai index
      ctx.session.manageProjectList = sites;

      const buttons = sites.map((s, i) => [
        Markup.button.callback(`🟩 ${s.name}`, `mgr_pick_${i}`),
      ]);
      buttons.push([Markup.button.callback('❌ Batal', 'mgr_cancel')]);

      ctx.editMessageText(
        '🟩 *Pilih site Netlify yang ingin dikelola:*',
        { parse_mode: 'Markdown', ...Markup.inlineKeyboard(buttons) }
      );
    } catch (err) {
      ctx.editMessageText(`❌ Gagal mengambil daftar site: ${err.message}`);
    }
  });

  // =====================
  // Pilih project berdasarkan index → tampilkan menu kelola
  // =====================
  bot.action(/^mgr_pick_(\d+)$/, (ctx) => {
    const index = parseInt(ctx.match[1]);
    const project = ctx.session.manageProjectList?.[index];
    if (!project) return ctx.editMessageText('❌ Project tidak ditemukan, coba lagi.');

    const platform = ctx.session.managePlatform;

    // Simpan project terpilih ke session
    ctx.session.manageProjectId = project.id;
    ctx.session.manageProjectName = project.name;
    ctx.session.manageProjectUrl = project.url || '';

    const platformLabel = platform === 'vercel' ? '🔺 Vercel' : '🟩 Netlify';

    ctx.editMessageText(
      `⚙️ *Kelola Project*\n\n` +
        `Platform: *${platformLabel}*\n` +
        `Project: *${project.name}*\n\n` +
        `Pilih aksi:`,
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('🔄 Update File', 'mgr_action_update')],
          [Markup.button.callback('✏️ Ganti Nama', 'mgr_action_rename')],
          [Markup.button.callback('🔗 Lihat URL', 'mgr_action_url')],
          [Markup.button.callback('❌ Batal', 'mgr_cancel')],
        ]),
      }
    );
  });

  // =====================
  // Aksi: Lihat URL
  // =====================
  bot.action('mgr_action_url', (ctx) => {
    const { manageProjectName, manageProjectUrl, managePlatform } = ctx.session;
    const platformLabel = managePlatform === 'vercel' ? '🔺 Vercel' : '🟩 Netlify';

    ctx.editMessageText(
      `🔗 *URL Project*\n\n` +
        `Platform: *${platformLabel}*\n` +
        `Project: *${manageProjectName}*\n\n` +
        `${manageProjectUrl || 'URL tidak tersedia'}`,
      {
        parse_mode: 'Markdown',
        // Tombol kembali pakai mgr_back, data project sudah ada di session
        ...Markup.inlineKeyboard([
          [Markup.button.callback('🔙 Kembali', 'mgr_back')],
        ]),
      }
    );
  });

  // =====================
  // Tombol kembali ke menu kelola
  // =====================
  bot.action('mgr_back', (ctx) => {
    const { managePlatform, manageProjectName, manageProjectUrl } = ctx.session;
    const platformLabel = managePlatform === 'vercel' ? '🔺 Vercel' : '🟩 Netlify';

    ctx.editMessageText(
      `⚙️ *Kelola Project*\n\n` +
        `Platform: *${platformLabel}*\n` +
        `Project: *${manageProjectName}*\n\n` +
        `Pilih aksi:`,
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('🔄 Update File', 'mgr_action_update')],
          [Markup.button.callback('✏️ Ganti Nama', 'mgr_action_rename')],
          [Markup.button.callback('🔗 Lihat URL', 'mgr_action_url')],
          [Markup.button.callback('❌ Batal', 'mgr_cancel')],
        ]),
      }
    );
  });

  // =====================
  // Aksi: Ganti Nama
  // =====================
  bot.action('mgr_action_rename', (ctx) => {
    ctx.session.manageState = 'waiting_new_name';
    const platformLabel = ctx.session.managePlatform === 'vercel' ? '🔺 Vercel' : '🟩 Netlify';

    ctx.editMessageText(
      `✏️ *Ganti Nama Project*\n\n` +
        `Platform: *${platformLabel}*\n` +
        `Project saat ini: *${ctx.session.manageProjectName}*\n\n` +
        `Ketik nama baru untuk project ini:`,
      { parse_mode: 'Markdown' }
    );
  });

  // =====================
  // Aksi: Update File
  // =====================
  bot.action('mgr_action_update', (ctx) => {
    ctx.session.manageState = 'waiting_update_file';
    const platformLabel = ctx.session.managePlatform === 'vercel' ? '🔺 Vercel' : '🟩 Netlify';

    ctx.editMessageText(
      `🔄 *Update File Project*\n\n` +
        `Platform: *${platformLabel}*\n` +
        `Project: *${ctx.session.manageProjectName}*\n\n` +
        `Kirim file baru kamu:\n` +
        `• File *.html* — untuk halaman tunggal\n` +
        `• File *.zip* — untuk multi-file (HTML + CSS + JS)`,
      { parse_mode: 'Markdown' }
    );
  });

  // =====================
  // Handler teks: terima nama baru
  // =====================
  bot.on('text', async (ctx, next) => {
    if (ctx.session.manageState !== 'waiting_new_name') return next();

    const newName = ctx.message.text.trim();
    if (!newName || newName.startsWith('/')) return next();
    if (newName.length < 2) {
      return ctx.reply('⚠️ Nama terlalu pendek. Minimal 2 karakter!');
    }

    const { managePlatform, manageProjectId, manageProjectName } = ctx.session;
    const loadingMsg = await ctx.reply('⏳ Mengganti nama project...');

    try {
      let result;
      if (managePlatform === 'vercel') {
        result = await renameVercelProject(manageProjectId, newName);
      } else {
        result = await renameNetlifySite(manageProjectId, newName);
      }

      ctx.session.manageState = null;
      ctx.session.manageProjectName = result.name;
      if (result.url) ctx.session.manageProjectUrl = result.url;

      await ctx.telegram.deleteMessage(ctx.chat.id, loadingMsg.message_id);

      const platformLabel = managePlatform === 'vercel' ? '🔺 Vercel' : '🟩 Netlify';
      ctx.reply(
        `✅ *Nama berhasil diubah!*\n\n` +
          `Platform: *${platformLabel}*\n` +
          `Nama lama: *${manageProjectName}*\n` +
          `Nama baru: *${result.name}*`,
        { parse_mode: 'Markdown' }
      );
    } catch (err) {
      await ctx.telegram.deleteMessage(ctx.chat.id, loadingMsg.message_id).catch(() => {});
      ctx.session.manageState = null;
      ctx.reply(`❌ Gagal mengganti nama: ${err.message}`);
    }
  });

  // =====================
  // Handler dokumen: terima file update (HTML atau ZIP)
  // =====================
  bot.on('document', async (ctx, next) => {
    if (ctx.session.manageState !== 'waiting_update_file') return next();

    const doc = ctx.message.document;
    const fileName = doc.file_name || '';
    const isHtml = fileName.endsWith('.html') || fileName.endsWith('.htm');
    const isZip = fileName.endsWith('.zip');

    if (!isHtml && !isZip) {
      return ctx.reply('⚠️ File harus berformat *.html*, *.htm*, atau *.zip* ya!', {
        parse_mode: 'Markdown',
      });
    }

    const { managePlatform, manageProjectId, manageProjectName } = ctx.session;
    const platformLabel = managePlatform === 'vercel' ? '🔺 Vercel' : '🟩 Netlify';
    const loadingMsg = await ctx.reply(
      `⏳ Sedang update project ke *${platformLabel}*...\n\nMohon tunggu sebentar!`,
      { parse_mode: 'Markdown' }
    );

    try {
      // Download file dari Telegram
      const fileLink = await ctx.telegram.getFileLink(doc.file_id);
      const fileRes = await axios.get(fileLink.href, { responseType: 'arraybuffer' });
      const fileBuffer = Buffer.from(fileRes.data);

      let result;

      if (isHtml) {
        const htmlContent = fileBuffer.toString('utf-8');
        const fileMap = { 'index.html': fileBuffer };

        if (managePlatform === 'vercel') {
          result = await updateVercelProject(manageProjectName, [
            { file: 'index.html', data: htmlContent, encoding: 'utf-8' },
          ]);
        } else {
          result = await updateNetlifySite(manageProjectId, fileMap);
        }
      } else {
        // ZIP: ekstrak lalu upload
        const fileMap = await extractZipToFileMap(fileBuffer);

        if (managePlatform === 'vercel') {
          const vercelFiles = Object.entries(fileMap).map(([path, buf]) => ({
            file: path,
            data: buf.toString('utf-8'),
            encoding: 'utf-8',
          }));
          result = await updateVercelProject(manageProjectName, vercelFiles);
        } else {
          result = await updateNetlifySite(manageProjectId, fileMap);
        }
      }

      ctx.session.manageState = null;
      if (result.url) ctx.session.manageProjectUrl = result.url;

      await ctx.telegram.deleteMessage(ctx.chat.id, loadingMsg.message_id);

      ctx.reply(
        `✅ *Project berhasil diupdate!*\n\n` +
          `Platform: *${platformLabel}*\n` +
          `Project: *${manageProjectName}*\n\n` +
          `🔗 URL: ${result.url}`,
        { parse_mode: 'Markdown' }
      );
    } catch (err) {
      await ctx.telegram.deleteMessage(ctx.chat.id, loadingMsg.message_id).catch(() => {});
      ctx.session.manageState = null;
      ctx.reply(`❌ Gagal update project: ${err.message}`);
    }
  });

  // =====================
  // Batal
  // =====================
  bot.action('mgr_cancel', (ctx) => {
    ctx.session.manageState = null;
    ctx.session.managePlatform = null;
    ctx.session.manageProjectId = null;
    ctx.session.manageProjectName = null;
    ctx.session.manageProjectUrl = null;

    ctx.editMessageText('❌ Pengelolaan project dibatalkan.');
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
      fileMap[relativePath] = content;
    }
  }

  return fileMap;
}
