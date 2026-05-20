const { Markup } = require('telegraf');
const {
  isOwner,
  addEventChannel,
  getActiveEventChannels,
  getAllEventChannels,
  deactivateEventChannel,
  deleteEventChannel,
  getUnjoinedEventChannels,
  getDeployRemaining,
  addDeployLimit,
  getAllUsers,
  getUser,
} = require('../database/userDb');
const { checkChannelMembership } = require('../middleware/channelVerify');

module.exports = function eventCommand(bot) {
  // =====================
  // /event - User lihat channel event yang bisa di-join untuk dapat limit
  // =====================
  bot.command('event', (ctx) => {
    const userId = ctx.from.id;
    const unjoinedChannels = getUnjoinedEventChannels(userId);

    if (unjoinedChannels.length === 0) {
      return ctx.reply(
        '📭 *Tidak ada event channel baru saat ini*\n\n' +
          'Kamu sudah join semua channel event yang tersedia\\.\n' +
          'Tunggu owner menambahkan channel baru ya\\!',
        { parse_mode: 'MarkdownV2' }
      );
    }

    // Tampilkan channel yang belum di-join
    const buttons = unjoinedChannels.map((ch) => [
      Markup.button.url(`📢 ${ch.title}`, ch.url),
      Markup.button.callback('✅ Verifikasi', `verify_event_${ch.channel_id}`),
    ]);

    const channelList = unjoinedChannels.map((ch, i) =>
      `${i + 1}\\. 📢 *${escapeMarkdown(ch.title)}*\n   🎁 Reward: \\+2 deploy limit`
    ).join('\n\n');

    ctx.reply(
      `🎉 *Event Channel Tersedia*\n\n` +
        `━━━━━━━━━━━━━━━━━━━━\n\n` +
        `Join channel di bawah untuk mendapatkan limit deploy tambahan\\!\n\n` +
        `${channelList}\n\n` +
        `━━━━━━━━━━━━━━━━━━━━\n\n` +
        `📋 *Cara klaim:*\n` +
        `1️⃣ Klik tombol channel untuk join\n` +
        `2️⃣ Klik "✅ Verifikasi" setelah join\n` +
        `3️⃣ Dapatkan \\+2 deploy limit\\!`,
      {
        parse_mode: 'MarkdownV2',
        ...Markup.inlineKeyboard(buttons),
      }
    );
  });

  // =====================
  // /limit - User cek sisa deploy limit
  // =====================
  bot.command('limit', (ctx) => {
    const userId = ctx.from.id;
    const user = getUser(userId);
    const remaining = getDeployRemaining(userId);
    const unjoinedChannels = getUnjoinedEventChannels(userId);

    const emoji = remaining > 0 ? '✅' : '❌';
    const statusText = remaining > 0
      ? `Kamu masih punya *${remaining}* deploy tersisa.`
      : `Limit deploy kamu sudah habis!`;

    let extraText = '';
    if (unjoinedChannels.length > 0) {
      extraText = `\n\n💡 *Ada ${unjoinedChannels.length} channel event* yang bisa kamu join untuk dapat limit tambahan!\nKetik /event untuk melihat.`;
    } else if (remaining <= 0) {
      extraText = '\n\n⏳ Tunggu owner menambahkan event channel baru ya!';
    }

    ctx.reply(
      `📊 *Deploy Limit*\n\n` +
        `━━━━━━━━━━━━━━━━━━━━\n\n` +
        `${emoji} ${statusText}\n\n` +
        `📈 *Statistik:*\n` +
        `• Total limit: ${user.deploy_limit}\n` +
        `• Sudah dipakai: ${user.deploy_used}\n` +
        `• Sisa: ${remaining}\n` +
        `${extraText}`,
      { parse_mode: 'Markdown' }
    );
  });

  // =====================
  // OWNER COMMANDS
  // =====================

  // /addchannel <channel_id> | <title> | <url>
  bot.command('addchannel', async (ctx) => {
    const userId = ctx.from.id;
    if (!isOwner(userId)) {
      return ctx.reply('🚫 Hanya owner yang bisa menambah channel event.');
    }

    const text = ctx.message.text.replace('/addchannel ', '').trim();
    const parts = text.split('|').map((s) => s.trim());

    if (parts.length < 1 || !parts[0] || parts[0] === '/addchannel') {
      return ctx.reply(
        '⚠️ *Format:*\n\n' +
          '`/addchannel @username | Nama Channel | https://t.me/xxx`\n\n' +
          '*Contoh:*\n' +
          '`/addchannel @excellchannel | Excell Channel | https://t.me/excellchannel`\n\n' +
          '• *Channel ID* = @username atau ID numerik channel\n' +
          '• *Nama* = nama channel (opsional)\n' +
          '• *URL* = link t.me (opsional)\n\n' +
          '⚠️ Pastikan bot sudah jadi admin di channel tersebut!',
        { parse_mode: 'Markdown' }
      );
    }

    const [channelId, channelTitle, channelUrl] = parts;

    const result = addEventChannel({
      channelId,
      channelTitle: channelTitle || channelId,
      channelUrl: channelUrl || `https://t.me/${channelId.replace('@', '')}`,
    });

    if (!result.success) {
      return ctx.reply(`❌ ${result.reason}`);
    }

    const ch = result.channel;

    // Notifikasi ke semua user yang sudah join main channel
    const users = getAllUsers();
    const userIds = Object.keys(users).filter((uid) => users[uid].joined_main_channel);
    let notified = 0;

    for (const uid of userIds) {
      // Skip owner
      if (parseInt(uid) === userId) continue;

      try {
        await ctx.telegram.sendMessage(
          uid,
          `🎉 *Event Channel Baru\\!*\n\n` +
            `━━━━━━━━━━━━━━━━━━━━\n\n` +
            `📢 *${escapeMarkdown(ch.title)}*\n\n` +
            `Join channel ini untuk mendapatkan *\\+2 limit deploy* gratis\\!\n\n` +
            `━━━━━━━━━━━━━━━━━━━━`,
          {
            parse_mode: 'MarkdownV2',
            ...Markup.inlineKeyboard([
              [Markup.button.url('📢 Join Channel', ch.url)],
              [Markup.button.callback('✅ Verifikasi', `verify_event_${ch.channel_id}`)],
            ]),
          }
        );
        notified++;
      } catch (err) {
        // User mungkin sudah block bot
      }
    }

    ctx.reply(
      `✅ *Channel Event Berhasil Ditambahkan!*\n\n` +
        `━━━━━━━━━━━━━━━━━━━━\n\n` +
        `📢 *Channel:* ${ch.title}\n` +
        `🆔 *ID:* \`${ch.channel_id}\`\n` +
        `🔗 *URL:* ${ch.url}\n` +
        `🆔 *Internal ID:* \`${ch.id}\`\n\n` +
        `━━━━━━━━━━━━━━━━━━━━\n\n` +
        `📤 Notifikasi terkirim ke ${notified} user.\n\n` +
        `User bisa klaim dengan join channel lalu /event → Verifikasi.`,
      { parse_mode: 'Markdown' }
    );
  });

  // /channels - Owner lihat semua channel event
  bot.command('channels', (ctx) => {
    const userId = ctx.from.id;
    if (!isOwner(userId)) {
      return ctx.reply('🚫 Hanya owner.');
    }

    const channels = getAllEventChannels();

    if (channels.length === 0) {
      return ctx.reply(
        '📭 Belum ada channel event.\n\nGunakan `/addchannel` untuk menambah.',
        { parse_mode: 'Markdown' }
      );
    }

    const list = channels.map((ch, i) => {
      const status = ch.active ? '🟢 Aktif' : '🔴 Nonaktif';
      return (
        `${i + 1}. *${ch.title}* ${status}\n` +
        `   🆔 Channel: \`${ch.channel_id}\`\n` +
        `   🔗 ${ch.url}\n` +
        `   🏷️ Internal ID: \`${ch.id}\``
      );
    }).join('\n\n');

    ctx.reply(
      `📋 *Semua Channel Event*\n\n` +
        `━━━━━━━━━━━━━━━━━━━━\n\n` +
        `${list}\n\n` +
        `━━━━━━━━━━━━━━━━━━━━\n\n` +
        `*Command Owner:*\n` +
        `• \`/addchannel\` - Tambah channel event\n` +
        `• \`/stopchannel ID\` - Nonaktifkan channel\n` +
        `• \`/delchannel ID\` - Hapus channel\n` +
        `• \`/addlimit UserID Jumlah\` - Beri limit manual\n` +
        `• \`/users\` - Lihat semua user\n` +
        `• \`/broadcast Pesan\` - Kirim pesan ke semua`,
      { parse_mode: 'Markdown' }
    );
  });

  // /stopchannel <internalId>
  bot.command('stopchannel', (ctx) => {
    const userId = ctx.from.id;
    if (!isOwner(userId)) return ctx.reply('🚫 Hanya owner.');

    const channelInternalId = ctx.message.text.split(' ')[1];
    if (!channelInternalId) {
      return ctx.reply('⚠️ Gunakan: `/stopchannel INTERNAL_ID`', { parse_mode: 'Markdown' });
    }

    const ch = deactivateEventChannel(channelInternalId);
    if (!ch) return ctx.reply('❌ Channel tidak ditemukan.');

    ctx.reply(`✅ Channel *${ch.title}* berhasil dinonaktifkan.`, { parse_mode: 'Markdown' });
  });

  // /delchannel <internalId>
  bot.command('delchannel', (ctx) => {
    const userId = ctx.from.id;
    if (!isOwner(userId)) return ctx.reply('🚫 Hanya owner.');

    const channelInternalId = ctx.message.text.split(' ')[1];
    if (!channelInternalId) {
      return ctx.reply('⚠️ Gunakan: `/delchannel INTERNAL_ID`', { parse_mode: 'Markdown' });
    }

    const ch = deleteEventChannel(channelInternalId);
    if (!ch) return ctx.reply('❌ Channel tidak ditemukan.');

    ctx.reply(`✅ Channel *${ch.title}* berhasil dihapus.`, { parse_mode: 'Markdown' });
  });

  // /addlimit <userId> <amount>
  bot.command('addlimit', (ctx) => {
    const userId = ctx.from.id;
    if (!isOwner(userId)) return ctx.reply('🚫 Hanya owner.');

    const args = ctx.message.text.split(' ').slice(1);
    if (args.length < 2) {
      return ctx.reply(
        '⚠️ *Format:* `/addlimit USER_ID JUMLAH`\n\nContoh: `/addlimit 123456789 5`',
        { parse_mode: 'Markdown' }
      );
    }

    const targetUserId = parseInt(args[0]);
    const amount = parseInt(args[1]);

    if (!targetUserId || !amount || amount < 1) {
      return ctx.reply('⚠️ User ID dan jumlah harus angka valid (minimal 1).');
    }

    const user = addDeployLimit(targetUserId, amount);
    const remaining = user.deploy_limit - user.deploy_used;

    ctx.reply(
      `✅ *Limit berhasil ditambahkan!*\n\n` +
        `👤 User ID: \`${targetUserId}\`\n` +
        `➕ Ditambah: +${amount}\n` +
        `📊 Total sisa: ${remaining} deploy`,
      { parse_mode: 'Markdown' }
    );
  });

  // /users - Owner lihat semua user
  bot.command('users', (ctx) => {
    const userId = ctx.from.id;
    if (!isOwner(userId)) return ctx.reply('🚫 Hanya owner.');

    const users = getAllUsers();
    const userList = Object.values(users);

    if (userList.length === 0) {
      return ctx.reply('📭 Belum ada user terdaftar.');
    }

    const displayUsers = userList.slice(-20);
    const list = displayUsers.map((u, i) => {
      const name = u.first_name || u.username || 'Unknown';
      const remaining = Math.max(0, u.deploy_limit - u.deploy_used);
      const channelStatus = u.joined_main_channel ? '✅' : '❌';
      const eventCount = (u.joined_event_channels || []).length;
      return `${i + 1}. ${name} (\`${u.id}\`)\n   📢 Main: ${channelStatus} | 🎯 Event: ${eventCount} | 📊 Limit: ${remaining}/${u.deploy_limit}`;
    }).join('\n\n');

    ctx.reply(
      `👥 *Daftar User* (${userList.length} total)\n\n` +
        `━━━━━━━━━━━━━━━━━━━━\n\n` +
        `${list}\n\n` +
        `━━━━━━━━━━━━━━━━━━━━\n\n` +
        `_Menampilkan 20 user terakhir_`,
      { parse_mode: 'Markdown' }
    );
  });

  // /broadcast <message>
  bot.command('broadcast', async (ctx) => {
    const userId = ctx.from.id;
    if (!isOwner(userId)) return ctx.reply('🚫 Hanya owner.');

    const message = ctx.message.text.replace('/broadcast ', '').trim();
    if (!message || message === '/broadcast') {
      return ctx.reply('⚠️ Gunakan: `/broadcast Pesan yang ingin dikirim`', { parse_mode: 'Markdown' });
    }

    const users = getAllUsers();
    const userIds = Object.keys(users);
    let sent = 0;
    let failed = 0;

    const loadingMsg = await ctx.reply(`⏳ Mengirim broadcast ke ${userIds.length} user...`);

    for (const uid of userIds) {
      try {
        await ctx.telegram.sendMessage(uid, `📢 *Pengumuman*\n\n${message}`, {
          parse_mode: 'Markdown',
        });
        sent++;
      } catch {
        failed++;
      }
    }

    await ctx.telegram.deleteMessage(ctx.chat.id, loadingMsg.message_id).catch(() => {});

    ctx.reply(
      `✅ *Broadcast selesai!*\n\n` +
        `📤 Terkirim: ${sent}\n` +
        `❌ Gagal: ${failed}\n` +
        `👥 Total: ${userIds.length}`,
      { parse_mode: 'Markdown' }
    );
  });
};

/**
 * Escape karakter khusus MarkdownV2
 */
function escapeMarkdown(text) {
  return String(text).replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, '\\$&');
}
