const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { addXp, isOnCooldown, setCooldown } = require('../utils/xpManager');
const afk = require('../commands/utility/afk');

// 📜 History Update Bot — urut dari yang paling lama ke paling baru
const updateHistory = [
  {
    version: 'v1.0',
    title: '🔄 Update Bot Jebb v1.0',
    desc: '**Rilis Perdana:**\n• Slash Commands dasar\n• Sistem XP & Leaderboard\n• Auto-status rotating\n• Heartbeat monitoring',
    color: '#ff9900'
  },
  {
    version: 'v1.1',
    title: '🔄 Update Bot Jebb v1.1',
    desc: '**Fitur Utama:**\n• Moderasi, Fun, Utility\n• **TikTok/IG Downloader** (/tiktok /instagram)\n• **Sistem Rank & Level** (/rank /leaderboard)\n• Status Online 24/7 👾',
    color: '#5865f2'
  },
  {
    version: 'v1.2',
    title: '🔄 Update Bot Jebb v1.2',
    desc: '**Fitur Baru:**\n• Sistem `/feedback` — Report, Saran & Request\n• `/help` diperbarui\n• Status footer timestamp otomatis\n• Bug fix `/ping`\n• `!update` sekarang bisa di-slide!',
    color: '#00ff88'
  },
  {
    version: 'v1.3',
    title: '🔄 Update Bot Jebb v1.3',
    desc: '**Fitur Baru:**\n• 🎮 Minigame `/tebakangka` & `/quiz` — Dapat XP!\n• 📢 `/announce` & `/dm` — Kirim pesan ke channel & DM\n• ⏰ `/schedule` — Kirim pesan terjadwal\n• 💤 `/afk` — Status AFK dengan auto-reply\n• 👋 Welcome message otomatis saat member baru join',
    color: '#e91e63'
  },
  {
    version: 'v1.4',
    title: '🔄 Update Bot Jebb v1.4',
    desc: '**Fitur Baru:**\n• 🎓 **Web Dashboard Akademik** — CRUD mahasiswa, jadwal, tugas via web\n• 🔐 **Sistem Login Dashboard** — Register & login publik dengan JWT\n• 🖼️ **Bot Banner Profile** — Banner animasi di profil bot\n• 👋 **Welcome Message** — Sambutan otomatis saat member baru join\n• 📊 **Dashboard Overview** — Statistik real-time mahasiswa & tugas',
    color: '#9b59b6'
  }
];

function formatFooter(client) {
  const now = new Date();
  const timeStr = now.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  return `${client.user.tag} • Today at ${timeStr}`;
}

function createUpdateEmbed(pageIndex, client) {
  const data = updateHistory[pageIndex];
  return new EmbedBuilder()
    .setTitle(data.title)
    .setDescription(data.desc)
    .setColor(data.color)
    .setFooter({ text: `${formatFooter(client)} • ${pageIndex + 1}/${updateHistory.length}` });
}

function createUpdateButtons(pageIndex) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('update_prev')
      .setLabel('⬅️ Prev')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(pageIndex === 0),
    new ButtonBuilder()
      .setCustomId('update_next')
      .setLabel('Next ➡️')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(pageIndex === updateHistory.length - 1)
  );
}

module.exports = {
  name: 'messageCreate',
  async execute(message, client) {
    if (message.author.bot) return;

    // Sistem XP Rank - Tambah XP saat user chat
    if (!message.guild) return; // Hanya di server, bukan DM

    const guildId = message.guild.id;
    const userId = message.author.id;

    // Cek jika user yang chat sudah AFK → hapus AFK
    if (afk.isAfk(userId)) {
      afk.removeAfk(userId);
      const embed = new EmbedBuilder()
        .setDescription(`👋 Selamat datang kembali ${message.author}! AFK-mu sudah dinonaktifkan.`)
        .setColor('#57f287');
      message.channel.send({ embeds: [embed] }).catch(() => {});
    }

    // Cek jika ada user yang di-mention sedang AFK
    if (message.mentions.users.size > 0) {
      message.mentions.users.forEach((mentionedUser) => {
        if (afk.isAfk(mentionedUser.id)) {
          const afkData = afk.getAfk(mentionedUser.id);
          const duration = Math.floor((Date.now() - afkData.since) / 60000); // menit
          const embed = new EmbedBuilder()
            .setDescription(`💤 ${mentionedUser} sedang AFK\n📝 Alasan: **${afkData.reason}**\n⏰ Selama: **${duration} menit**`)
            .setColor('#95a5a6');
          message.channel.send({ embeds: [embed] }).catch(() => {});
        }
      });
    }

    if (!isOnCooldown(guildId, userId)) {
      const xpAmount = Math.floor(Math.random() * 11) + 15; // Random 15-25 XP
      const result = addXp(guildId, userId, xpAmount);

      if (result.leveledUp) {
        // Kirim notifikasi naik level (plain text mention, tanpa embed)
        message.channel.send(
          `${message.author} Gacor naek level ${result.newLevel} lee`
        ).catch(() => {});
      }

      setCooldown(guildId, userId);
    }

    // Prefix command (!update)
    if (!message.content.startsWith('!')) return;

    const args = message.content.slice(1).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    if (command === 'update') {
      let page = updateHistory.length - 1; // Mulai dari update terbaru (v1.4)
      const embed = createUpdateEmbed(page, client);
      const buttons = createUpdateButtons(page);

      const msg = await message.reply({ embeds: [embed], components: [buttons] });

      // Collector untuk tombol slide
      const collector = msg.createMessageComponentCollector({
        filter: i => i.user.id === message.author.id,
        time: 60000 // 1 menit
      });

      collector.on('collect', async i => {
        if (i.customId === 'update_prev') page--;
        if (i.customId === 'update_next') page++;

        const newEmbed = createUpdateEmbed(page, client);
        const newButtons = createUpdateButtons(page);
        await i.update({ embeds: [newEmbed], components: [newButtons] });
      });

      collector.on('end', () => {
        msg.edit({ components: [] }).catch(() => {});
      });
    }
  },
};
