const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('avatar')
    .setDescription('Lihat avatar user')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('User (kosong = kamu sendiri)')
        .setRequired(false)),
  async execute(interaction) {
    const user = interaction.options.getUser('user') || interaction.user;
    const avatarUrl = user.displayAvatarURL({ size: 4096, dynamic: true });

    const embed = new EmbedBuilder()
      .setTitle(`Avatar ${user.username}`)
      .setImage(avatarUrl)
      .setColor(user.hexAccentColor || '#0099ff')
      .setFooter({ text: `Diminta oleh ${interaction.user.username}` });

    await interaction.reply({ embeds: [embed] });
  },
};

