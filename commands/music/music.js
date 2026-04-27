const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../utils/database');

// ── In-memory queue per guild ─────────────────────────────────
const queues = new Map(); // guildId → { tracks, currentIndex, playing, volume, loop }

function getQueue(guildId) {
  if (!queues.has(guildId)) {
    queues.set(guildId, { tracks: [], currentIndex: 0, playing: false, volume: 80, loop: false });
  }
  return queues.get(guildId);
}

function saveToHistory(guildId, track) {
  if (db.dbType === 'sqlite') {
    db.prepare('INSERT INTO music_history (guild_id,title,url,duration,requested_by,played_at) VALUES (?,?,?,?,?,?)')
      .run(guildId, track.title, track.url || '', track.duration || '0:00', track.requestedBy || 'Unknown', Math.floor(Date.now()/1000));
    // Update play count
    const existing = db.prepare('SELECT id,play_count FROM music_tracks WHERE guild_id=? AND url=?').get(guildId, track.url || '');
    if (existing) {
      db.prepare('UPDATE music_tracks SET play_count=play_count+1, last_played=? WHERE id=?').run(Math.floor(Date.now()/1000), existing.id);
    } else {
      db.prepare('INSERT INTO music_tracks (guild_id,title,url,duration,play_count,last_played) VALUES (?,?,?,?,1,?)').run(guildId, track.title, track.url || '', track.duration || '0:00', Math.floor(Date.now()/1000));
    }
  } else {
    const history = db.all('music_history') || [];
    const id = history.length > 0 ? Math.max(...history.map(h => h.id||0)) + 1 : 1;
    history.unshift({ id, guild_id: guildId, ...track, played_at: Math.floor(Date.now()/1000) });
    db.save('music_history', history.slice(0, 200));

    const tracks = db.all('music_tracks') || [];
    const idx = tracks.findIndex(t => t.guild_id === guildId && t.url === (track.url||''));
    if (idx !== -1) { tracks[idx].play_count = (tracks[idx].play_count||0) + 1; tracks[idx].last_played = Math.floor(Date.now()/1000); }
    else { const tid = tracks.length > 0 ? Math.max(...tracks.map(t=>t.id||0)) + 1 : 1; tracks.push({ id: tid, guild_id: guildId, title: track.title, url: track.url||'', duration: track.duration||'0:00', play_count: 1, last_played: Math.floor(Date.now()/1000) }); }
    db.save('music_tracks', tracks);
  }
}

function fmtDuration(sec) {
  const m = Math.floor(sec/60), s = sec%60;
  return `${m}:${String(s).padStart(2,'0')}`;
}

// ── PLAY ─────────────────────────────────────────────────────
const playCmd = {
  data: new SlashCommandBuilder()
    .setName('play')
    .setDescription('🎵 Putar lagu dari YouTube/URL atau nama lagu')
    .addStringOption(o => o.setName('query').setDescription('Nama lagu atau URL YouTube').setRequired(true)),
  async execute(interaction) {
    const query = interaction.options.getString('query');
    const voiceChannel = interaction.member?.voice?.channel;
    if (!voiceChannel) return interaction.reply({ content: '❌ Kamu harus join voice channel dulu!', ephemeral: true });

    await interaction.deferReply();

    // Simulasi track (real implementation butuh ytdl-core / @discordjs/voice)
    const track = {
      title: query.startsWith('http') ? `Track dari URL` : query,
      url: query,
      duration: fmtDuration(Math.floor(Math.random() * 240) + 60),
      requestedBy: interaction.user.username,
      thumbnail: null
    };

    const q = getQueue(interaction.guild.id);
    q.tracks.push(track);
    if (!q.playing) {
      q.playing = true;
      q.currentIndex = q.tracks.length - 1;
      saveToHistory(interaction.guild.id, track);
    }

    const embed = new EmbedBuilder()
      .setTitle(q.tracks.length > 1 ? '➕ Ditambahkan ke Queue' : '▶️ Sekarang Diputar')
      .setDescription(`**${track.title}**`)
      .addFields(
        { name: '⏱️ Durasi', value: track.duration, inline: true },
        { name: '📋 Posisi', value: q.tracks.length > 1 ? `#${q.tracks.length} dalam queue` : 'Sedang diputar', inline: true },
        { name: '👤 Diminta oleh', value: track.requestedBy, inline: true }
      )
      .setColor('#8B0000').setTimestamp()
      .setFooter({ text: `🔊 Volume: ${q.volume}% | 🔁 Loop: ${q.loop ? 'ON' : 'OFF'}` });

    await interaction.editReply({ embeds: [embed] });
  }
};

// ── QUEUE ────────────────────────────────────────────────────
const queueCmd = {
  data: new SlashCommandBuilder().setName('queue').setDescription('📋 Lihat antrian lagu'),
  async execute(interaction) {
    const q = getQueue(interaction.guild.id);
    if (!q.tracks.length) return interaction.reply({ content: '📋 Queue kosong!', ephemeral: true });
    const embed = new EmbedBuilder()
      .setTitle('📋 Music Queue')
      .setColor('#8B0000');
    const current = q.tracks[q.currentIndex];
    if (current) embed.addFields({ name: '▶️ Sedang Diputar', value: `**${current.title}** (${current.duration})`, inline: false });
    const upcoming = q.tracks.slice(q.currentIndex + 1, q.currentIndex + 11);
    if (upcoming.length) {
      embed.addFields({ name: '📋 Antrian Selanjutnya', value: upcoming.map((t, i) => `\`${i+1}.\` ${t.title} — ${t.duration}`).join('\n'), inline: false });
    }
    embed.setFooter({ text: `Total: ${q.tracks.length} lagu | Volume: ${q.volume}%` });
    await interaction.reply({ embeds: [embed] });
  }
};

// ── SKIP ─────────────────────────────────────────────────────
const skipCmd = {
  data: new SlashCommandBuilder().setName('skip').setDescription('⏭️ Lewati lagu sekarang'),
  async execute(interaction) {
    const q = getQueue(interaction.guild.id);
    if (!q.playing) return interaction.reply({ content: '❌ Tidak ada lagu yang diputar!', ephemeral: true });
    q.currentIndex++;
    if (q.currentIndex >= q.tracks.length) {
      q.playing = false; q.currentIndex = 0; q.tracks = [];
      return interaction.reply({ content: '⏹️ Queue habis, musik berhenti.', ephemeral: false });
    }
    const next = q.tracks[q.currentIndex];
    saveToHistory(interaction.guild.id, next);
    await interaction.reply({ embeds: [new EmbedBuilder().setTitle('⏭️ Lagu Dilewati').setDescription(`Sekarang: **${next.title}**`).setColor('#8B0000')] });
  }
};

// ── STOP ─────────────────────────────────────────────────────
const stopCmd = {
  data: new SlashCommandBuilder().setName('stop').setDescription('⏹️ Hentikan musik & kosongkan queue'),
  async execute(interaction) {
    const q = getQueue(interaction.guild.id);
    q.tracks = []; q.playing = false; q.currentIndex = 0;
    await interaction.reply({ embeds: [new EmbedBuilder().setTitle('⏹️ Musik Dihentikan').setDescription('Queue dikosongkan.').setColor('#8B0000')] });
  }
};

// ── PAUSE / RESUME ───────────────────────────────────────────
const pauseCmd = {
  data: new SlashCommandBuilder().setName('pause').setDescription('⏸️ Pause / Resume musik'),
  async execute(interaction) {
    const q = getQueue(interaction.guild.id);
    if (!q.tracks.length) return interaction.reply({ content: '❌ Tidak ada lagu!', ephemeral: true });
    q.playing = !q.playing;
    await interaction.reply({ content: q.playing ? '▶️ Musik dilanjutkan!' : '⏸️ Musik di-pause!' });
  }
};

// ── VOLUME ───────────────────────────────────────────────────
const volumeCmd = {
  data: new SlashCommandBuilder()
    .setName('volume')
    .setDescription('🔊 Atur volume musik (0-100)')
    .addIntegerOption(o => o.setName('level').setDescription('Level volume 0-100').setRequired(true).setMinValue(0).setMaxValue(100)),
  async execute(interaction) {
    const level = interaction.options.getInteger('level');
    const q = getQueue(interaction.guild.id);
    q.volume = level;
    const icon = level === 0 ? '🔇' : level < 30 ? '🔈' : level < 70 ? '🔉' : '🔊';
    await interaction.reply({ content: `${icon} Volume diatur ke **${level}%**` });
  }
};

// ── LOOP ─────────────────────────────────────────────────────
const loopCmd = {
  data: new SlashCommandBuilder().setName('loop').setDescription('🔁 Toggle loop lagu saat ini'),
  async execute(interaction) {
    const q = getQueue(interaction.guild.id);
    q.loop = !q.loop;
    await interaction.reply({ content: `🔁 Loop **${q.loop ? 'AKTIF' : 'NONAKTIF'}**` });
  }
};

// ── NOWPLAYING ───────────────────────────────────────────────
const npCmd = {
  data: new SlashCommandBuilder().setName('nowplaying').setDescription('🎵 Info lagu yang sedang diputar'),
  async execute(interaction) {
    const q = getQueue(interaction.guild.id);
    if (!q.playing || !q.tracks.length) return interaction.reply({ content: '❌ Tidak ada lagu yang diputar!', ephemeral: true });
    const track = q.tracks[q.currentIndex];
    const embed = new EmbedBuilder()
      .setTitle('🎵 Now Playing')
      .setDescription(`**${track.title}**`)
      .addFields(
        { name: '⏱️ Durasi', value: track.duration, inline: true },
        { name: '🔊 Volume', value: `${q.volume}%`, inline: true },
        { name: '🔁 Loop', value: q.loop ? 'ON' : 'OFF', inline: true },
        { name: '👤 Diminta oleh', value: track.requestedBy || 'Unknown', inline: true },
        { name: '📋 Queue', value: `${q.tracks.length - q.currentIndex - 1} lagu menunggu`, inline: true }
      )
      .setColor('#8B0000').setTimestamp();
    await interaction.reply({ embeds: [embed] });
  }
};

// ── REMOVE ───────────────────────────────────────────────────
const removeCmd = {
  data: new SlashCommandBuilder()
    .setName('remove')
    .setDescription('🗑️ Hapus lagu dari queue')
    .addIntegerOption(o => o.setName('posisi').setDescription('Posisi di queue (dari 1)').setRequired(true).setMinValue(1)),
  async execute(interaction) {
    const pos = interaction.options.getInteger('posisi');
    const q = getQueue(interaction.guild.id);
    const realIdx = q.currentIndex + pos;
    if (realIdx >= q.tracks.length) return interaction.reply({ content: `❌ Tidak ada lagu di posisi ${pos}!`, ephemeral: true });
    const removed = q.tracks.splice(realIdx, 1)[0];
    await interaction.reply({ content: `🗑️ **${removed.title}** dihapus dari queue.` });
  }
};

// Export
module.exports = [playCmd, queueCmd, skipCmd, stopCmd, pauseCmd, volumeCmd, loopCmd, npCmd, removeCmd];
module.exports.getQueue = getQueue;
module.exports.queues = queues;
