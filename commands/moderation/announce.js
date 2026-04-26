const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('announce')
    .setDescription('📢 Kirim pesan ke channel (pengirim disembunyikan)')
    .addChannelOption(option =>
      option.setName('channel')
        .setDescription('Channel tujuan')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true))
    .addStringOption(option =>
      option.setName('pesan')
        .setDescription('Isi pesan yang akan dikirim')
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false),

  async execute(interaction) {
    const channel = interaction.options.getChannel('channel');
    const pesan = interaction.options.getString('pesan');

    try {
      // Kirim pesan biasa tanpa embed, tanpa sebut nama pengirim
      await channel.send({ content: pesan });

      await interaction.reply({
        content: `✅ Pesan berhasil dikirim ke ${channel}!`,
        ephemeral: true
      });
    } catch (error) {
      await interaction.reply({
        content: `❌ Gagal kirim ke ${channel}: ${error.message}`,
        ephemeral: true
      });
    }
  }
};

