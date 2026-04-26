const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('instagram')
    .setDescription('Unduh reel atau post Instagram')
    .addStringOption(option =>
      option.setName('url')
        .setDescription('Link Instagram yang ingin diunduh')
        .setRequired(true))
    .addBooleanOption(option =>
      option.setName('private')
        .setDescription('Kirim secara pribadi?')
        .setRequired(false)),

  async execute(interaction) {
    // Fitur dalam tahap pengembangan - dinonaktifkan sementara
    return interaction.reply({
      content: '⚠️ **Fitur Instagram Downloader sedang dalam tahap pengembangan.**\n\nSilakan gunakan perintah lain atau tunggu update selanjutnya.',
      ephemeral: true
    });
  },
};

