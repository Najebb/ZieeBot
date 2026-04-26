const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

// Simpan feedback di memory (akan hilang saat restart). 
// Untuk permanent, bisa pakai database atau kirim ke channel log.
const feedbackLog = [];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('feedback')
    .setDescription('Kirim Report Bug, Saran, atau Request Fitur')
    .addStringOption(option =>
      option.setName('tipe')
        .setDescription('Jenis feedback')
        .setRequired(true)
        .addChoices(
          { name: '🐞 Report Bug', value: 'bug' },
          { name: '💡 Saran', value: 'saran' },
          { name: '🚀 Request Fitur', value: 'request' }
        ))
    .addStringOption(option =>
      option.setName('pesan')
        .setDescription('Isi detail feedback kamu')
        .setRequired(true)
        .setMaxLength(1000))
    .addAttachmentOption(option =>
      option.setName('screenshot')
        .setDescription('Lampirkan screenshot (opsional)')
        .setRequired(false)),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const tipe = interaction.options.getString('tipe');
    const pesan = interaction.options.getString('pesan');
    const screenshot = interaction.options.getAttachment('screenshot');
    const user = interaction.user;

    // Format tipe
    const tipeLabels = { bug: '🐞 Report Bug', saran: '💡 Saran', request: '🚀 Request Fitur' };
    const tipeLabel = tipeLabels[tipe];

    // Embed untuk owner/log channel
    const logEmbed = new EmbedBuilder()
      .setTitle(tipeLabel)
      .setDescription(pesan)
      .setColor(tipe === 'bug' ? '#ff0000' : tipe === 'saran' ? '#5865f2' : '#00ff88')
      .addFields(
        { name: '👤 User', value: `${user.tag} (${user.id})`, inline: true },
        { name: '📅 Waktu', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
        { name: '📡 Server', value: interaction.guild ? interaction.guild.name : 'DM', inline: true }
      )
      .setThumbnail(user.displayAvatarURL({ dynamic: true }));

    if (screenshot) {
      logEmbed.setImage(screenshot.url);
    }

    // Kirim ke owner via DM
    const ownerId = process.env.OWNER_ID;
    if (ownerId) {
      try {
        const owner = await interaction.client.users.fetch(ownerId);
        await owner.send({ embeds: [logEmbed] });
      } catch (err) {
        console.error('❌ Gagal kirim feedback ke owner:', err.message);
      }
    }

    // Simpan ke log memory
    feedbackLog.push({
      id: feedbackLog.length + 1,
      tipe,
      pesan,
      userId: user.id,
      username: user.tag,
      timestamp: Date.now()
    });

    // Embed konfirmasi ke user
    const confirmEmbed = new EmbedBuilder()
      .setTitle('✅ Feedback Terkirim!')
      .setDescription(`Terima kasih! ${tipeLabel} kamu sudah diteruskan ke developer.`)
      .setColor('#57f287')
      .setFooter({ text: `ID: #${feedbackLog.length} • ${interaction.client.user.tag}` });

    await interaction.editReply({ embeds: [confirmEmbed] });
  }
};

