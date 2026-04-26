const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('tiktok')
    .setDescription('Unduh video TikTok tanpa watermark')
    .addStringOption(option =>
      option.setName('url')
        .setDescription('Link video TikTok')
        .setRequired(true))
    .addBooleanOption(option =>
      option.setName('private')
        .setDescription('Kirim secara pribadi?')
        .setRequired(false)),

  async execute(interaction) {
    // Fitur dalam tahap pengembangan - dinonaktifkan sementara
    return interaction.reply({
      content: '⚠️ **Fitur TikTok Downloader sedang dalam tahap pengembangan.**\n\nSilakan gunakan perintah lain atau tunggu update selanjutnya.',
      ephemeral: true
    });
  },
};

