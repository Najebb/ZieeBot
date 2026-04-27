let readyExecuteCount = 0;

module.exports = {
  name: 'ready',
  once: true,
  execute(client) {
    readyExecuteCount += 1;
    // #region agent log
    fetch('http://127.0.0.1:7697/ingest/45b316d8-784b-4f1c-9e4f-f17566cac14d',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'2257f3'},body:JSON.stringify({sessionId:'2257f3',runId:'initial',hypothesisId:'H2',location:'events/ready.js:execute:start',message:'ready event execute called',data:{readyExecuteCount,userTag:client.user?.tag||null},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    console.log(`✅ ${client.user.tag} sudah online dan siap!`);
    console.log(`📊 Aktif di ${client.guilds.cache.size} server dengan ${client.users.cache.size} users.`);

    // Rotating status: Uptime, Owner, Sponsor
    let statusIndex = 0;

    // Helper format uptime
    function formatUptime(ms) {
      const seconds = Math.floor(ms / 1000);
      const minutes = Math.floor(seconds / 60);
      const hours = Math.floor(minutes / 60);
      const days = Math.floor(hours / 24);
      return `${days}h ${hours%24}j ${minutes%60}m ${seconds%60}d`;
    }

    // Helper waktu WIB (Asia/Jakarta)
    function getWIBTime() {
      return new Date().toLocaleTimeString('id-ID', {
        timeZone: 'Asia/Jakarta',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
    }

    const statuses = [
      { name: 'ZieeBot:3 | /help', type: 2, state: '👨‍💻 Developed by Najebb' },  // LISTENING
      { name: 'Made by ZieNith', type: 4, state: '👨‍💻 Developed by Najebb' },  // CUSTOM
      { name: '🚀 ZieNith Features!', type: 3, state: '👨‍💻 Developed by Najebb' },  // PLAYING
      { getName: () => `⏱️ ${formatUptime(client.uptime)} | ${getWIBTime()} WIB`, type: 0, state: '👨‍💻 Developed by Najebb' } // WATCHING — Uptime + Waktu Jakarta
    ];

    setInterval(() => {
      statusIndex = (statusIndex + 1) % statuses.length;
      const currentStatus = statuses[statusIndex];
      const name = currentStatus.getName ? currentStatus.getName() : currentStatus.name;
      client.user.setActivity(name, { type: currentStatus.type, state: currentStatus.state });
    }, 10000); // Rotate 10 detik

    // ========================
    // BANNER PROFILE - Info & Log
    // ========================
    const bannerUrl = process.env.BANNER_URL || `http://localhost:${process.env.PORT || 8080}/zieebot-banner-animated.html`;
    console.log(`🖼️  Banner Profile: ${bannerUrl}`);
    console.log(`   → Banner tersedia di dashboard dan bisa diakses publik.`);

    // ========================
    // HEARTBEAT - Ping setiap 1 jam ke Owner
    // ========================
    // Bot akan kirim pesan ke owner setiap 1 jam untuk konfirmasi bot masih hidup
    // Kalau owner tidak dapat pesan = bot mungkin mati
    // Format: embed dengan uptime, server count, memory usage, dll
    const HEARTBEAT_INTERVAL = 60 * 60 * 1000; // 1 jam dalam ms

    setInterval(async () => {
      const ownerId = process.env.OWNER_ID;
      if (!ownerId) {
        console.warn('⚠️ OWNER_ID tidak di-set. Heartbeat tidak dikirim.');
        return;
      }

      try {
        const owner = await client.users.fetch(ownerId);

        // Hitung uptime
        const uptime = process.uptime();
        const hours = Math.floor(uptime / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);
        const seconds = Math.floor(uptime % 60);

        // Memory usage
        const memUsed = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);

        const { EmbedBuilder } = require('discord.js');
        const embed = new EmbedBuilder()
          .setTitle('💓 Heartbeat - Bot Status')
          .setDescription(`Bot **${client.user.tag}** masih aktif dan berjalan normal!`)
          .addFields(
            { name: '⏱️ Uptime', value: `${hours}j ${minutes}m ${seconds}d`, inline: true },
            { name: '🖥️ Server', value: `${client.guilds.cache.size}`, inline: true },
            { name: '👥 Users', value: `${client.users.cache.size}`, inline: true },
            { name: '💾 Memory', value: `${memUsed} MB`, inline: true },
            { name: '📅 Waktu', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
            { name: '📡 Hosting', value: 'WipsByte', inline: true }
          )
          .setColor('#00ff00')
          .setFooter({ text: 'Heartbeat setiap 1 jam • Jebb Bot' })
          .setTimestamp();

        await owner.send({ embeds: [embed] });
        console.log('💓 Heartbeat terkirim ke owner.');
      } catch (error) {
        console.error('❌ Gagal kirim heartbeat ke owner:', error.message);
      }
    }, HEARTBEAT_INTERVAL);

    // Kirim heartbeat pertama setelah 5 detik bot online
    setTimeout(async () => {
      const ownerId = process.env.OWNER_ID;
      if (!ownerId) return;
      try {
        const owner = await client.users.fetch(ownerId);
        const { EmbedBuilder } = require('discord.js');
        const embed = new EmbedBuilder()
          .setTitle('🚀 Bot Online!')
          .setDescription(`Bot **${client.user.tag}** sudah online dan siap digunakan!`)
          .addFields(
            { name: '🖥️ Server', value: `${client.guilds.cache.size}`, inline: true },
            { name: '👥 Users', value: `${client.users.cache.size}`, inline: true },
            { name: '💓 Heartbeat', value: 'Aktif (setiap 1 jam)', inline: true }
          )
          .setColor('#5865f2')
          .setFooter({ text: 'Jebb Bot • ZieNith' })
          .setTimestamp();
        await owner.send({ embeds: [embed] });
        console.log('🚀 Pesan online terkirim ke owner.');
      } catch (error) {
        console.error('❌ Gagal kirim pesan online ke owner:', error.message);
      }
    }, 5000);
  },
};

