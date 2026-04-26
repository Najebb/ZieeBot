const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

function formatUptime(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  return `${days}d ${hours%24}h ${minutes%60}m ${seconds%60}s`;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('botinfo')
    .setDescription('Info lengkap bot Jebb'),
  async execute(interaction) {
    const uptime = formatUptime(interaction.client.uptime);
    const embed = new EmbedBuilder()
      .setTitle('🤖 BotInfo Jebb Bot')
      .setDescription('Bot Discord multi-purpose dengan slash commands!')
      .addFields(
        { name: 'Uptime', value: `\`${uptime}\``, inline: true },
        { name: 'Servers', value: `${interaction.client.guilds.cache.size}`, inline: true },
        { name: 'Users', value: `${interaction.client.users.cache.size}`, inline: true },
        { name: 'Creator', value: 'ZieNith', inline: true },
        { name: 'Sponsor', value: 'ZieNith Team', inline: true }
      )
      .setColor('#00ff88')
      .setFooter({ text: 'Made by ZieNith | Sponsored by ZieNith Team' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
