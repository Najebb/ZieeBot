const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');

// Simpan scheduled tasks (in-memory, hilang saat restart)
const scheduledTasks = new Map();

module.exports = {
  data: new SlashCommandBuilder()
    .setName('schedule')
    .setDescription('⏰ Kirim pesan terjadwal ke channel atau DM')
    .addSubcommand(sub =>
      sub.setName('channel')
        .setDescription('Kirim pesan ke channel di waktu tertentu')
        .addChannelOption(opt => opt.setName('channel').setDescription('Channel tujuan').addChannelTypes(ChannelType.GuildText).setRequired(true))
        .addStringOption(opt => opt.setName('pesan').setDescription('Isi pesan').setRequired(true))
        .addStringOption(opt => opt.setName('waktu').setDescription('Format: YYYY-MM-DD HH:mm (contoh: 2024-12-25 14:30)').setRequired(true))
        .addStringOption(opt => opt.setName('judul').setDescription('Judul embed').setRequired(false)))
    .addSubcommand(sub =>
      sub.setName('dm')
        .setDescription('Kirim DM ke user di waktu tertentu')
        .addUserOption(opt => opt.setName('user').setDescription('User tujuan').setRequired(true))
        .addStringOption(opt => opt.setName('pesan').setDescription('Isi pesan').setRequired(true))
        .addStringOption(opt => opt.setName('waktu').setDescription('Format: YYYY-MM-DD HH:mm').setRequired(true)))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const waktuStr = interaction.options.getString('waktu');
    const pesan = interaction.options.getString('pesan');

    // Parse waktu
    const targetTime = new Date(waktuStr.replace(' ', 'T'));
    if (isNaN(targetTime.getTime())) {
      return interaction.reply({
        content: '❌ Format waktu salah! Gunakan: `2024-12-25 14:30`',
        ephemeral: true
      });
    }

    const now = Date.now();
    const delay = targetTime.getTime() - now;

    if (delay <= 0) {
      return interaction.reply({
        content: '❌ Waktu harus di masa depan!',
        ephemeral: true
      });
    }

    // Buat task ID
    const taskId = Math.random().toString(36).substring(2, 10);

    if (sub === 'channel') {
      const channel = interaction.options.getChannel('channel');
      const judul = interaction.options.getString('judul') || '⏰ Pesan Terjadwal';

      const timeout = setTimeout(async () => {
        const embed = new EmbedBuilder()
          .setTitle(judul)
          .setDescription(pesan)
          .setColor('#5865f2')
          .setTimestamp()
          .setFooter({ text: `Dijadwalkan oleh ${interaction.user.tag}` });

        try {
          await channel.send({ embeds: [embed] });
        } catch (err) {
          console.error('Schedule channel gagal:', err);
        }
        scheduledTasks.delete(taskId);
      }, delay);

      scheduledTasks.set(taskId, { timeout, type: 'channel', target: channel.name, time: waktuStr });

      await interaction.reply({
        content: `✅ Pesan akan dikirim ke ${channel} pada **${waktuStr}** (ID: \`${taskId}\`)`,
        ephemeral: true
      });

    } else if (sub === 'dm') {
      const user = interaction.options.getUser('user');

      const timeout = setTimeout(async () => {
        const embed = new EmbedBuilder()
          .setTitle('📩 Pesan Terjadwal')
          .setDescription(pesan)
          .setColor('#5865f2')
          .setTimestamp()
          .setFooter({ text: `Dijadwalkan oleh ${interaction.user.tag} dari ${interaction.guild.name}` });

        try {
          await user.send({ embeds: [embed] });
        } catch (err) {
          console.error('Schedule DM gagal:', err);
        }
        scheduledTasks.delete(taskId);
      }, delay);

      scheduledTasks.set(taskId, { timeout, type: 'dm', target: user.tag, time: waktuStr });

      await interaction.reply({
        content: `✅ DM akan dikirim ke **${user.tag}** pada **${waktuStr}** (ID: \`${taskId}\`)`,
        ephemeral: true
      });
    }
  }
};
