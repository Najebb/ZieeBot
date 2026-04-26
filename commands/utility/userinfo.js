const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('userinfo')
    .setDescription('Info detail user')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('User (kosong = dirimu)')
        .setRequired(false)),
  async execute(interaction) {
    const user = interaction.options.getUser('user') || interaction.user;
    const member = await interaction.guild.members.fetch(user.id).catch(() => null) || interaction.member;

    const roleList = member ? member.roles.cache.size > 1 ? member.roles.cache.map(r => r.name).slice(1).join(', ') : 'Tidak ada' : 'N/A';

    const embed = new EmbedBuilder()
      .setTitle(`👤 User Info: ${user.tag}`)
      .setThumbnail(user.avatarURL({ dynamic: true, size: 256 }))
      .addFields(
        { name: 'User ID', value: `\`${user.id}\``, inline: true },
        { name: 'Akun Dibuat', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`, inline: true },
        { name: 'Bergabung Server', value: member ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>` : 'Tidak di server', inline: true },
        { name: 'Roles', value: roleList, inline: false },
        { name: 'Status', value: member ? member.presence?.status || 'Offline' : 'N/A', inline: true }
      )
      .setColor('Random')
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};

