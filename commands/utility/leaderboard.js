const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getGuildUsers, getRankTitle } = require('../../utils/xpManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('Lihat peringkat top 10 di server ini')
    .addIntegerOption(option =>
      option.setName('jumlah')
        .setDescription('Jumlah user yang ditampilkan (default 10)')
        .setRequired(false)
        .setMinValue(3)
        .setMaxValue(25)),

  async execute(interaction) {
    await interaction.deferReply();

    const limit = interaction.options.getInteger('jumlah') || 10;
    const guildId = interaction.guild.id;

    const users = getGuildUsers(guildId);
    const userEntries = Object.entries(users);

    if (userEntries.length === 0) {
      return interaction.editReply('❌ Belum ada data rank di server ini. Chat dulu untuk mendapatkan XP!');
    }

    // Urutkan berdasarkan XP tertinggi
    const sorted = userEntries
      .map(([userId, data]) => ({ userId, ...data }))
      .sort((a, b) => b.xp - a.xp)
      .slice(0, limit);

    const embed = new EmbedBuilder()
      .setTitle(`🏆 Leaderboard - ${interaction.guild.name}`)
      .setColor('#f1c40f')
      .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
      .setFooter({ text: `Menampilkan top ${sorted.length} user` })
      .setTimestamp();

    const medals = ['🥇', '🥈', '🥉'];

    for (let i = 0; i < sorted.length; i++) {
      const user = sorted[i];
      const medal = medals[i] || `\`${i + 1}.\``;
      const rankTitle = getRankTitle(user.level);

      try {
        const member = await interaction.guild.members.fetch(user.userId);
        embed.addFields({
          name: `${medal} ${member.user.username}`,
          value: `Level ${user.level} ${rankTitle} • ${user.xp} XP • ${user.messages} pesan`,
          inline: false
        });
      } catch {
        embed.addFields({
          name: `${medal} User Tidak Dikenal`,
          value: `Level ${user.level} ${rankTitle} • ${user.xp} XP • ${user.messages} pesan`,
          inline: false
        });
      }
    }

    await interaction.editReply({ embeds: [embed] });
  },
};

