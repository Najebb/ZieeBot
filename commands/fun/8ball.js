const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const responses = [
  'Ya pasti!',
  'Mungkin iya',
  'Kemungkinan besar',
  'Tanya lagi nanti',
  'Tidak yakin',
  'Kemungkinan tidak',
  'Tidak',
  'Jangan harap',
  'Pertanyaan bodoh!'
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('8ball')
    .setDescription('Tanya sesuatu ke bola ajaib 8ball')
    .addStringOption(option =>
      option.setName('pertanyaan')
        .setDescription('Pertanyaanmu')
        .setRequired(true)),
  async execute(interaction) {
    const question = interaction.options.getString('pertanyaan');
    const response = responses[Math.floor(Math.random() * responses.length)];

    const embed = new EmbedBuilder()
      .setTitle('🎱 8BALL')
      .addFields(
        { name: 'Pertanyaan', value: question, inline: false },
        { name: 'Jawaban', value: response, inline: false }
      )
      .setColor('#8B4513')
      .setFooter({ text: 'Tanya lagi!' });

    await interaction.reply({ embeds: [embed] });
  },
};

