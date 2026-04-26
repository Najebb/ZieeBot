const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { addXp } = require('../../utils/xpManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('addxp')
    .setDescription('Tambahkan XP ke user (Owner Only)')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('User yang akan ditambahkan XP')
        .setRequired(true))
    .addIntegerOption(option =>
      option.setName('jumlah')
        .setDescription('Jumlah XP yang ditambahkan')
        .setRequired(true)
        .setMinValue(1))
    .setDMPermission(false),

  async execute(interaction) {
    // Hanya owner bot yang bisa pakai command ini
    if (interaction.user.id !== process.env.OWNER_ID) {
      return interaction.reply({
        content: '❌ **Command ini hanya bisa digunakan oleh owner bot!**',
        ephemeral: true
      });
    }

    await interaction.deferReply({ ephemeral: true });

    const target = interaction.options.getUser('user');
    const amount = interaction.options.getInteger('jumlah');

    const result = addXp(interaction.guild.id, target.id, amount);

    const embed = new EmbedBuilder()
      .setTitle('✅ XP Ditambahkan (Private)')
      .setDescription(`**${target.username}** telah menerima **${amount} XP**`)
      .addFields(
        { name: '⭐ Level', value: `${result.userData.level}`, inline: true },
        { name: '🏆 Total XP', value: `${result.userData.xp}`, inline: true }
      )
      .setColor('#57f287')
      .setFooter({ text: 'ZieNith Rank System' })
      .setTimestamp();

    if (result.leveledUp) {
      embed.addFields({
        name: '🎉 Naik Level!',
        value: `Dari Level ${result.oldLevel} → **Level ${result.newLevel}**`,
        inline: false
      });
    }

    await interaction.editReply({ embeds: [embed] });
  },
};

