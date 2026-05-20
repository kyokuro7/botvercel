const { Markup } = require('telegraf');
const { getAllUsers, isOwner } = require('../database/userDb');

module.exports = (bot) => {
  // Command /broadcast (owner only)
  bot.command('broadcast', (ctx) => {
    const userId = ctx.from.id;

    // Cek owner
    if (!isOwner(userId)) {
      return ctx.reply('🚫 Fitur ini hanya untuk owner.');
    }

    ctx.session.broadcastState = 'waiting_message';

    ctx.reply(
      '<blockquote>📢 Broadcast ke Semua User\n' +
      '━━━━━━━━━━━━━━━━━━━━\n\n' +
      'Ketik pesan yang ingin kamu broadcast ke semua user.\n\n' +
      '💡 Tips:\n' +
      '• Bisa menggunakan HTML formatting\n' +
      '• Emoji akan terkirim\n' +
      '• Ketik /batal untuk membatalkan</blockquote>',
      {
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('❌ Batal', 'broadcast_cancel')],
        ]),
      }
    );
  });

  // Tombol broadcast dari menu
  bot.action('menu_broadcast', (ctx) => {
    const userId = ctx.from.id;

    // Cek owner
    if (!isOwner(userId)) {
      return ctx.answerCbQuery('🚫 Fitur ini hanya untuk owner.', { show_alert: true });
    }

    ctx.session.broadcastState = 'waiting_message';

    ctx.editMessageText(
      '<blockquote>📢 Broadcast ke Semua User\n' +
      '━━━━━━━━━━━━━━━━━━━━\n\n' +
      'Ketik pesan yang ingin kamu broadcast ke semua user.\n\n' +
      '💡 Tips:\n' +
      '• Bisa menggunakan HTML formatting\n' +
      '• Emoji akan terkirim\n' +
      '• Ketik /batal untuk membatalkan</blockquote>',
      {
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('❌ Batal', 'broadcast_cancel')],
        ]),
      }
    ).catch(() => {});
  });

  // Tombol cancel broadcast
  bot.action('broadcast_cancel', (ctx) => {
    ctx.session.broadcastState = null;
    ctx.answerCbQuery('✅ Broadcast dibatalkan.');
    
    ctx.editMessageText(
      '<blockquote>❌ Broadcast Dibatalkan\n' +
      '━━━━━━━━━━━━━━━━━━━━\n\n' +
      'Broadcast telah dibatalkan.</blockquote>',
      {
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('🏠 Menu Utama', 'menu_home')],
        ]),
      }
    ).catch(() => {});
  });

  // Handler untuk pesan broadcast
  bot.on('text', async (ctx, next) => {
    const userId = ctx.from.id;

    // Cek apakah sedang dalam state broadcast
    if (ctx.session.broadcastState === 'waiting_message' && isOwner(userId)) {
      const message = ctx.message.text;

      // Tampilkan preview
      ctx.session.broadcastMessage = message;
      ctx.session.broadcastState = 'confirm';

      await ctx.reply(
        '<blockquote>📋 Preview Pesan Broadcast\n' +
        '━━━━━━━━━━━━━━━━━━━━</blockquote>\n\n' +
        message +
        '\n\n<blockquote>━━━━━━━━━━━━━━━━━━━━\n' +
        'Apakah kamu yakin ingin mengirim pesan ini\n' +
        'ke semua user?</blockquote>',
        {
          parse_mode: 'HTML',
          ...Markup.inlineKeyboard([
            [
              Markup.button.callback('✅ Kirim', 'broadcast_confirm'),
              Markup.button.callback('❌ Batal', 'broadcast_cancel'),
            ],
          ]),
        }
      );

      return;
    }

    // Lanjut ke handler berikutnya
    return next();
  });

  // Konfirmasi broadcast
  bot.action('broadcast_confirm', async (ctx) => {
    const userId = ctx.from.id;

    if (!isOwner(userId)) {
      return ctx.answerCbQuery('🚫 Unauthorized', { show_alert: true });
    }

    const message = ctx.session.broadcastMessage;
    if (!message) {
      return ctx.answerCbQuery('❌ Pesan tidak ditemukan.', { show_alert: true });
    }

    ctx.answerCbQuery('📤 Mengirim broadcast...');

    // Update UI
    await ctx.editMessageText(
      '<blockquote>⏳ Mengirim Broadcast...\n' +
      '━━━━━━━━━━━━━━━━━━━━\n\n' +
      'Sedang mengirim pesan ke semua user.\n' +
      'Mohon tunggu...</blockquote>',
      { parse_mode: 'HTML' }
    ).catch(() => {});

    // Ambil semua user
    const users = getAllUsers();
    const userIds = Object.keys(users);

    let success = 0;
    let failed = 0;

    // Kirim ke semua user
    for (const uid of userIds) {
      try {
        await ctx.telegram.sendMessage(uid, message, { parse_mode: 'HTML' });
        success++;
        
        // Delay untuk avoid rate limit
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error) {
        failed++;
        console.error(`Gagal kirim ke ${uid}:`, error.message);
      }
    }

    // Reset state
    ctx.session.broadcastState = null;
    ctx.session.broadcastMessage = null;

    // Laporan hasil
    await ctx.telegram.sendMessage(
      userId,
      '<blockquote>✅ Broadcast Selesai!\n' +
      '━━━━━━━━━━━━━━━━━━━━\n\n' +
      `📊 Statistik:\n` +
      `• Total user    : ${userIds.length}\n` +
      `• Berhasil      : ${success}\n` +
      `• Gagal         : ${failed}\n\n` +
      `Pesan berhasil dikirim!</blockquote>`,
      {
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('🏠 Menu Utama', 'menu_home')],
        ]),
      }
    );
  });
};
