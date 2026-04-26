const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Ban member dari server')
    .addUserOption(option =>
      option.setName('target')
        .setDescription('Member yang akan di-ban')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Alasan ban')
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .setDMPermission(false),
  async execute(interaction) {
    const target = interaction.options.getUser('target');
    const reason = interaction.options.getString('reason') || 'Tidak ada alasan';

    await interaction.reply({ content: `Mem-ban ${target.tag}...`, ephemeral: true });

    try {
      await interaction.guild.members.ban(target, { reason });
      const embed = new EmbedBuilder()
        .setTitle('✅ Member Dibanned')
        .setDescription(`**${target.tag}** telah di-ban dari server.`)
        .addFields(
          { name: 'Alasan', value: reason, inline: true },
          { name: 'Moderator', value: interaction.user.tag, inline: true }
        )
        .setColor('#ff0000')
        .setTimestamp();
      await interaction.editReply({ content: null, embeds: [embed] });
    } catch (error) {
      await interaction.editReply({ content: '❌ Gagal ban member: ' + error.message });
    }
  },
};

