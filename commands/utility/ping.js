const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Cek latency bot'),
  async execute(interaction) {
    // WAJIB deferReply dulu agar bisa editReply nanti (mencegah error "Unknown interaction")
    await interaction.deferReply();

    const latency = interaction.client.ws.ping;

    function formatUptime(ms) {
      const seconds = Math.floor(ms / 1000);
      const minutes = Math.floor(seconds / 60);
      const hours = Math.floor(minutes / 60);
      const days = Math.floor(hours / 24);
      return `${days}d ${hours%24}h ${minutes%60}m ${seconds%60}s`;
    }

    const uptime = formatUptime(interaction.client.uptime);
    const embed = new EmbedBuilder()
      .setTitle('🏓 Pong!')
      .addFields(
        { name: 'Latency', value: `${latency} ms`, inline: true },
        { name: 'API Latency', value: `${interaction.client.ws.ping} ms`, inline: true },
        { name: 'Uptime', value: `\`${uptime}\``, inline: false }
      )
      .setColor('#00ff00')
      .setFooter({ text: 'Made by ZieNith | Sponsored by ZieNith Team' });

    await interaction.editReply({ embeds: [embed] });
  },
};

