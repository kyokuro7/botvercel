const { Markup } = require('telegraf');
const { listVercelProjects, deleteVercelProject } = require('../deploy/vercel');
const { listNetlifySites, deleteNetlifySite } = require('../deploy/netlify');

module.exports = function deleteCommand(bot) {
  // =====================
  // /delete - Pilih platform (Owner Only)
  // =====================
  bot.command('delete', (ctx) => {
    const userId = ctx.from.id;
    const { isOwner } = require('../database/userDb');
    
    // Hanya owner yang bisa akses
    if (!isOwner(userId)) {
      return ctx.reply('🚫 Perintah ini hanya untuk owner.');
    }

    ctx.session.deleteState = null;
    ctx.session.deletePlatform = null;
    ctx.session.deleteProjectId = null;
    ctx.session.deleteProjectName = null;

    ctx.reply(
      '🗑️ *Hapus Project*\n\nPilih platform:',
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [
            Markup.button.callback('🔺 Vercel', 'del_platform_vercel'),
            Markup.button.callback('🟩 Netlify', 'del_platform_netlify'),
          ],
          [Markup.button.callback('❌ Batal', 'del_cancel')],
        ]),
      }
    );
  });

  // =====================
  // Pilih platform Vercel
  // =====================
  bot.action('del_platform_vercel', async (ctx) => {
    ctx.session.deletePlatform = 'vercel';
    await ctx.editMessageText('⏳ Mengambil daftar project Vercel...');

    try {
      const projects = await listVercelProjects();
      if (projects.length === 0) {
        return ctx.editMessageText('📭 Tidak ada project Vercel yang ditemukan.');
      }

      // Simpan list di session, button pakai index
      ctx.session.deleteProjectList = projects;
      ctx.session.deleteState = 'waiting_project_select';

      const buttons = projects.map((p, i) => [
        Markup.button.callback(`🔺 ${p.name}`, `del_pick_${i}`),
      ]);
      buttons.push([Markup.button.callback('❌ Batal', 'del_cancel')]);

      ctx.editMessageText(
        '🔺 *Pilih project Vercel yang ingin dihapus:*',
        { parse_mode: 'Markdown', ...Markup.inlineKeyboard(buttons) }
      );
    } catch (err) {
      ctx.editMessageText(`❌ Gagal mengambil daftar project: ${err.message}`);
    }
  });

  // =====================
  // Pilih platform Netlify
  // =====================
  bot.action('del_platform_netlify', async (ctx) => {
    ctx.session.deletePlatform = 'netlify';
    await ctx.editMessageText('⏳ Mengambil daftar site Netlify...');

    try {
      const sites = await listNetlifySites();
      if (sites.length === 0) {
        return ctx.editMessageText('📭 Tidak ada site Netlify yang ditemukan.');
      }

      // Simpan list di session, button pakai index
      ctx.session.deleteProjectList = sites;
      ctx.session.deleteState = 'waiting_project_select';

      const buttons = sites.map((s, i) => [
        Markup.button.callback(`🟩 ${s.name}`, `del_pick_${i}`),
      ]);
      buttons.push([Markup.button.callback('❌ Batal', 'del_cancel')]);

      ctx.editMessageText(
        '🟩 *Pilih site Netlify yang ingin dihapus:*',
        { parse_mode: 'Markdown', ...Markup.inlineKeyboard(buttons) }
      );
    } catch (err) {
      ctx.editMessageText(`❌ Gagal mengambil daftar site: ${err.message}`);
    }
  });

  // =====================
  // Pilih project berdasarkan index → tampilkan konfirmasi
  // =====================
  bot.action(/^del_pick_(\d+)$/, (ctx) => {
    const index = parseInt(ctx.match[1]);
    const project = ctx.session.deleteProjectList?.[index];
    if (!project) return ctx.editMessageText('❌ Project tidak ditemukan, coba lagi.');

    const platform = ctx.session.deletePlatform;

    // Simpan project terpilih ke session
    ctx.session.deleteProjectId = project.id;
    ctx.session.deleteProjectName = project.name;
    ctx.session.deleteState = 'waiting_confirm';

    const platformLabel = platform === 'vercel' ? '🔺 Vercel' : '🟩 Netlify';

    ctx.editMessageText(
      `⚠️ *Konfirmasi Hapus*\n\n` +
        `Platform: *${platformLabel}*\n` +
        `Project: *${project.name}*\n\n` +
        `Yakin ingin menghapus project ini?\n` +
        `_Tindakan ini tidak bisa dibatalkan!_`,
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [
            Markup.button.callback('✅ Ya, Hapus!', 'del_confirm_yes'),
            Markup.button.callback('❌ Batal', 'del_cancel'),
          ],
        ]),
      }
    );
  });

  // =====================
  // Konfirmasi: Ya → Hapus
  // =====================
  bot.action('del_confirm_yes', async (ctx) => {
    const platform = ctx.session.deletePlatform;
    const projectId = ctx.session.deleteProjectId;
    const projectName = ctx.session.deleteProjectName;

    await ctx.editMessageText('⏳ Sedang menghapus project...');

    try {
      if (platform === 'vercel') {
        await deleteVercelProject(projectId);
      } else {
        await deleteNetlifySite(projectId);
      }

      // Reset session
      ctx.session.deleteState = null;
      ctx.session.deletePlatform = null;
      ctx.session.deleteProjectId = null;
      ctx.session.deleteProjectName = null;

      const platformLabel = platform === 'vercel' ? '🔺 Vercel' : '🟩 Netlify';
      ctx.editMessageText(
        `✅ *Project berhasil dihapus!*\n\n` +
          `Platform: *${platformLabel}*\n` +
          `Project: *${projectName}*`,
        { parse_mode: 'Markdown' }
      );
    } catch (err) {
      ctx.editMessageText(`❌ Gagal menghapus project: ${err.message}`);
    }
  });

  // =====================
  // Batal
  // =====================
  bot.action('del_cancel', (ctx) => {
    ctx.session.deleteState = null;
    ctx.session.deletePlatform = null;
    ctx.session.deleteProjectId = null;
    ctx.session.deleteProjectName = null;

    ctx.editMessageText('❌ Penghapusan dibatalkan.');
  });
};
