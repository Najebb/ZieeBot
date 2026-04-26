const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('clear')
    .setDescription('Hapus sejumlah message')
    .addIntegerOption(option =>
      option.setName('jumlah')
        .setDescription('Jumlah message yang dihapus (1-100)')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(100))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .setDMPermission(false),
  async execute(interaction) {
    const amount = interaction.options.getInteger('jumlah');

    await interaction.reply({ content: `Menghapus ${amount} message...`, ephemeral: true });

    try {
      const messages = await interaction.channel.bulkDelete(amount + 1, true);
      const embed = new EmbedBuilder()
        .setTitle('🧹 Messages Dihapus')
        .setDescription(`✅ Dihapus **${messages.size - 1}** message.`)
        .setColor('#00ff00')
        .setTimestamp();
      setTimeout(() => interaction.editReply({ content: null, embeds: [embed] }), 3000);
    } catch (error) {
      await interaction.editReply({ content: '❌ Gagal hapus message: ' + error.message });
    }
  },
};

