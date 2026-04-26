const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('dm')
    .setDescription('📩 Kirim pesan DM ke user (Admin only)')
    .addUserOption(option =>
      option.setName('target')
        .setDescription('User yang akan dikirim DM')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('pesan')
        .setDescription('Isi pesan yang akan dikirim')
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false),

  async execute(interaction) {
    const target = interaction.options.getUser('target');
    const pesan = interaction.options.getString('pesan');

    await interaction.deferReply({ ephemeral: true });

    try {
      const embed = new EmbedBuilder()
        .setTitle('📩 Pesan dari Admin')
        .setDescription(pesan)
        .setColor('#0099ff')
        .setFooter({ text: `Dari: ${interaction.guild.name}`, iconURL: interaction.guild.iconURL() })
        .setTimestamp();

      await target.send({ embeds: [embed] });

      const successEmbed = new EmbedBuilder()
        .setTitle('✅ DM Terkirim')
        .setDescription(`Pesan berhasil dikirim ke ${target}`)
        .setColor('#00ff00')
        .setTimestamp();

      await interaction.editReply({ embeds: [successEmbed] });
    } catch (error) {
      await interaction.editReply({
        content: `❌ Gagal kirim DM ke ${target.tag}. User mungkin memblokir DM dari bot.`
      });
    }
  }
};

