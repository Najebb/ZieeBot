const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'guildMemberAdd',
  async execute(member) {
    try {
      // Cari channel welcome (system channel atau channel bernama welcome/greetings)
      const guild = member.guild;
      let welcomeChannel = guild.systemChannel;

      if (!welcomeChannel) {
        welcomeChannel = guild.channels.cache.find(
          ch => ch.isTextBased() && /welcome|greetings|selamat-datang/.test(ch.name)
        );
      }

      if (!welcomeChannel) return; // Tidak ada channel welcome

      const embed = new EmbedBuilder()
        .setTitle(`👋 Selamat Datang di ${guild.name}!`)
        .setDescription(
          `Halo ${member.user}, selamat datang di server **${guild.name}**!\n\n` +
          `🤖 Gunakan "/help" untuk melihat semua command yang tersedia.\n` +
          `📊 Cek rank-mu dengan "/rank" dan naikkan level dengan aktif chat!\n` +
          `🎮 Mainkan minigame "/quiz" dan "/tebakangka" untuk dapat XP!`
        )
        .setColor('#5865f2')
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
        .setImage('https://cdn.discordapp.com/attachments/placeholder/banner.gif') // Placeholder banner
        .setFooter({ text: `Member ke-${guild.memberCount} • ZieeBot v2.0` })
        .setTimestamp();

      await welcomeChannel.send({ embeds: [embed] });
      console.log(`👋 Welcome message terkirim untuk ${member.user.tag} di ${guild.name}`);
    } catch (error) {
      console.error('❌ Error guildMemberAdd:', error.message);
    }
  },
};

