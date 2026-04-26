const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { addXp } = require('../../utils/xpManager');

// Active games storage (in-memory)
const activeGames = new Map();

module.exports = {
  data: new SlashCommandBuilder()
    .setName('tebakangka')
    .setDescription('🎮 Minigame tebak angka 1-100, dapat XP reward!')
    .addIntegerOption(option =>
      option.setName('angka')
        .setDescription('Tebak angka 1-100')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(100)),

  async execute(interaction) {
    const userId = interaction.user.id;
    const guildId = interaction.guild.id;
    const guess = interaction.options.getInteger('angka');

    // Check if user already has active game
    if (!activeGames.has(userId)) {
      // Start new game
      const target = Math.floor(Math.random() * 100) + 1;
      activeGames.set(userId, {
        target,
        attempts: 0,
        guildId,
        maxAttempts: 7
      });
    }

    const game = activeGames.get(userId);

    // Validate same guild
    if (game.guildId !== guildId) {
      return interaction.reply({
        content: '❌ Kamu sudah punya game aktif di server lain! Selesaikan dulu atau tunggu.',
        ephemeral: true
      });
    }

    game.attempts++;

    if (guess === game.target) {
      // WIN!
      const xpReward = Math.max(50 - (game.attempts * 5), 10); // Less attempts = more XP
      addXp(guildId, userId, xpReward);
      activeGames.delete(userId);

      const embed = new EmbedBuilder()
        .setTitle('🎉 BENAR!')
        .setDescription(`**${interaction.user}** menebak angka **${game.target}** dengan **${game.attempts}** percobaan!\n🎁 Dapat **${xpReward} XP**!`)
        .setColor('#57f287')
        .setFooter({ text: 'Minigame by Jebb Bot' })
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    }

    if (game.attempts >= game.maxAttempts) {
      // Game Over
      const target = game.target;
      activeGames.delete(userId);

      const embed = new EmbedBuilder()
        .setTitle('💥 GAME OVER!')
        .setDescription(`Kamu sudah mencoba **${game.maxAttempts}x**\nAngka yang benar adalah **${target}**\nCoba lagi dengan `/tebakangka`!`)
        .setColor('#ff0000')
        .setFooter({ text: 'Minigame by Jebb Bot' })
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    }

    // Wrong guess — give clue
    const clue = guess > game.target ? '⬇️ Terlalu **BESAR**!' : '⬆️ Terlalu **KECIL**!';
    const embed = new EmbedBuilder()
      .setTitle('❌ Salah!')
      .setDescription(`${clue}\nPercobaan: **${game.attempts}/${game.maxAttempts}**`)
      .setColor('#ff9900')
      .setFooter({ text: 'Ketik /tebakangka lagi untuk menebak!' })
      .setTimestamp();

    return interaction.reply({ embeds: [embed], ephemeral: true });
  }
};

