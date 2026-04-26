const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { getUserData, getLevelProgress, getRankTitle } = require('../../utils/xpManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rank')
    .setDescription('Cek rank dan level Anda atau user lain')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('User yang ingin dicek (kosongkan untuk diri sendiri)')
        .setRequired(false)),

  async execute(interaction) {
    await interaction.deferReply();

    const target = interaction.options.getUser('user') || interaction.user;
    const member = await interaction.guild.members.fetch(target.id).catch(() => null);

    if (!member) {
      return interaction.editReply('❌ User tidak ditemukan di server ini.');
    }

    const userData = getUserData(interaction.guild.id, target.id);
    const progress = getLevelProgress(userData.xp, userData.level);
    const rankTitle = getRankTitle(userData.level);
    const percentage = Math.min(100, Math.floor((progress.current / progress.needed) * 100));

    const embed = new EmbedBuilder()
      .setTitle(`📊 Rank ${target.username}`)
      .setThumbnail(target.displayAvatarURL({ dynamic: true }))
      .addFields(
        { name: '🏷️ Rank', value: rankTitle, inline: true },
        { name: '⭐ Level', value: `${userData.level}`, inline: true },
        { name: '💬 Pesan', value: `${userData.messages}`, inline: true },
        { name: '📈 XP Progress', value: `${progress.current} / ${progress.needed} XP (${percentage}%)`, inline: false },
        { name: '🏆 Total XP', value: `${userData.xp}`, inline: true }
      )
      .setColor('#5865f2')
      .setFooter({ text: 'ZieNith Rank System' })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};

