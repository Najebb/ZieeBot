module.exports = {
  name: 'interactionCreate',
  async execute(interaction, client) {
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
      await command.execute(interaction);
    } catch (error) {
      console.error('Error command:', error);

      try {
        if (interaction.deferred) {
          await interaction.editReply({ content: '❌ Terjadi kesalahan saat menjalankan command!' });
        } else if (!interaction.replied) {
          await interaction.reply({ content: '❌ Terjadi kesalahan saat menjalankan command!', ephemeral: true });
        }
      } catch (replyError) {
        console.error('Gagal kirim error message:', replyError);
      }
    }
  },
};

