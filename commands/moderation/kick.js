const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Kick member dari server')
    .addUserOption(option =>
      option.setName('target')
        .setDescription('Member yang akan di-kick')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Alasan kick')
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
    .setDMPermission(false),
  async execute(interaction) {
    const target = interaction.options.getMember('target');
    const reason = interaction.options.getString('reason') || 'Tidak ada alasan';

    if (!target.kickable) {
      return interaction.reply({ content: '❌ Saya tidak bisa kick member ini!', ephemeral: true });
    }

    await interaction.reply({ content: `Mem-kick ${target.user.tag}...`, ephemeral: true });

    try {
      await target.kick(reason);
      const embed = new EmbedBuilder()
        .setTitle('✅ Member Dikick')
        .setDescription(`**${target.user.tag}** telah di-kick dari server.`)
        .addFields(
          { name: 'Alasan', value: reason, inline: true },
          { name: 'Moderator', value: interaction.user.tag, inline: true }
        )
        .setColor('#ff9900')
        .setTimestamp();
      await interaction.editReply({ content: null, embeds: [embed] });
    } catch (error) {
      await interaction.editReply({ content: '❌ Gagal kick member: ' + error.message });
    }
  },
};

