const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

// AFK storage: userId => { reason, since }
const afkUsers = new Map();

module.exports = {
  data: new SlashCommandBuilder()
    .setName('afk')
    .setDescription('💤 Set status AFK, bot akan auto-reply jika di-mention')
    .addStringOption(option =>
      option.setName('alasan')
        .setDescription('Alasan AFK (opsional)')
        .setRequired(false)),

  async execute(interaction) {
    const reason = interaction.options.getString('alasan') || 'Tidak ada alasan';
    const since = Date.now();

    afkUsers.set(interaction.user.id, { reason, since });

    const embed = new EmbedBuilder()
      .setTitle('💤 AFK Aktif')
      .setDescription(`${interaction.user} sekarang AFK\n📝 Alasan: **${reason}**`)
      .setColor('#95a5a6')
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },

  // Helper functions untuk messageCreate event
  isAfk(userId) {
    return afkUsers.has(userId);
  },

  getAfk(userId) {
    return afkUsers.get(userId);
  },

  removeAfk(userId) {
    return afkUsers.delete(userId);
  }
};

