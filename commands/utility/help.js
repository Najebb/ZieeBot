const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Panduan lengkap semua perintah bot'),

  async execute(interaction) {
    await interaction.deferReply();

    const embed = new EmbedBuilder()
      .setTitle('📖 Panduan ZieeBot')
      .setDescription('Ketik `/` lalu pilih command.')
      .setColor('#5865f2')
      .setFooter({ text: 'ZieeBot | 24/7 Online 👾' })
      .setTimestamp();

    embed.addFields(
      {
        name: '🛡️ Moderasi & Admin',
        value: '`/ban` `/kick` `/clear` `/addxp`',
        inline: true
      },
      {
        name: '🎉 Fun',
        value: '`/8ball` `/avatar`',
        inline: true
      },
      {
        name: '🎮 Minigame',
        value: '`/tebakangka` `/quiz` — Tebak angka & Quiz, dapat XP!',
        inline: true
      },
      {
        name: 'ℹ️ Info',
        value: '`/ping` `/serverinfo` `/userinfo` `/botinfo`',
        inline: true
      },
      {
        name: '📱 Download',
        value: '`/tiktok` `/instagram`',
        inline: true
      },
      {
        name: '📊 Rank',
        value: '`/rank` `/leaderboard`',
        inline: true
      },
      {
        name: '⭐ Naik Level',
        value: 'Chat = 15-25 XP, cooldown 60s. Level x 100 = XP butuh.',
        inline: false
      },
      {
        name: '📝 Feedback',
        value: '`/feedback` — Report Bug, Saran, atau Request Fitur',
        inline: true
      },
      {
        name: '💤 Utility',
        value: '`/afk` — Set status AFK\n`!update` — Info update bot terbaru',
        inline: true
      },
      {
        name: '⏰ Schedule & Messaging',
        value: '`/schedule` — Pesan terjadwal\n`/announce` — Pengumuman ke channel\n`/dm` — Kirim DM ke user',
        inline: false
      },
      {
        name: '💡 Tips',
        value: 'Tambah `private:true` untuk hasil pribadi. Downloader hanya untuk publik.',
        inline: false
      }
    );

    await interaction.editReply({ embeds: [embed] });
  },
};
