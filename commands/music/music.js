const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  entersState,
} = require('@discordjs/voice');
const play = require('play-dl');
const db = require('../../utils/database');

function debugLog(hypothesisId, location, message, data = {}, runId = 'initial') {
  // #region agent log
  fetch('http://127.0.0.1:7697/ingest/45b316d8-784b-4f1c-9e4f-f17566cac14d',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'5f6549'},body:JSON.stringify({sessionId:'5f6549',runId,hypothesisId,location,message,data,timestamp:Date.now()})}).catch(()=>{});
  // #endregion
}

// ── In-memory queue per guild ─────────────────────────────────
const queues = new Map(); // guildId → { tracks, currentIndex, playing, volume, loop, currentDurationSec }
const voiceRuntime = new Map(); // guildId → { player, connection, currentTrack }

function getQueue(guildId) {
  if (!queues.has(guildId)) {
    queues.set(guildId, { tracks: [], currentIndex: 0, playing: false, volume: 80, loop: false, currentDurationSec: 0 });
  }
  return queues.get(guildId);
}

function getRuntime(guildId) {
  if (!voiceRuntime.has(guildId)) {
    const player = createAudioPlayer();
    voiceRuntime.set(guildId, { player, connection: null, currentTrack: null });
  }
  return voiceRuntime.get(guildId);
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
    history.unshift({
      id,
      guild_id: guildId,
      title: track.title,
      url: track.url || '',
      duration: track.duration || '0:00',
      requested_by: track.requestedBy || 'Unknown',
      played_at: Math.floor(Date.now()/1000)
    });
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

function parseDurationToSec(text) {
  if (!text) return 0;
  const parts = text.split(':').map(Number);
  if (parts.some(Number.isNaN)) return 0;
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return 0;
}

async function resolveTrack(query) {
  if (play.yt_validate(query) === 'video') {
    const info = await play.video_basic_info(query);
    const details = info.video_details;
    return {
      title: details.title || 'Unknown title',
      url: details.url || query,
      duration: details.durationRaw || fmtDuration(Number(details.durationInSec || 0)),
    };
  }
  const result = await play.search(query, { limit: 1 });
  if (!result.length) throw new Error('Lagu tidak ditemukan dari query tersebut.');
  const top = result[0];
  return {
    title: top.title || query,
    url: top.url,
    duration: top.durationRaw || fmtDuration(Number(top.durationInSec || 0)),
  };
}

async function playCurrent(guildId) {
  const q = getQueue(guildId);
  const runtime = getRuntime(guildId);
  const track = q.tracks[q.currentIndex];
  if (!track || !runtime.connection) return;

  try {
    debugLog('H6', 'commands/music/music.js:playCurrent:start', 'Attempting to stream current track', {
      guildId,
      title: track.title,
      url: track.url
    }, 'post-fix');
    const source = await play.stream(track.url, { discordPlayerCompatibility: true });
    const resource = createAudioResource(source.stream, { inputType: source.type, inlineVolume: true });
    if (resource.volume) resource.volume.setVolume(Math.max(0, Math.min(2, (q.volume || 80) / 100)));

    runtime.currentTrack = track;
    q.playing = true;
    q.currentDurationSec = parseDurationToSec(track.duration);
    saveToHistory(guildId, track);
    runtime.player.play(resource);
    debugLog('H6', 'commands/music/music.js:playCurrent:success', 'Track stream started successfully', {
      guildId,
      title: track.title
    }, 'post-fix');
  } catch (error) {
    q.playing = false;
    debugLog('H7', 'commands/music/music.js:playCurrent:error', 'Failed to stream track', {
      guildId,
      errorMessage: error.message
    }, 'post-fix');
    throw error;
  }
}

async function nextTrack(guildId) {
  const q = getQueue(guildId);
  const runtime = getRuntime(guildId);
  if (!q.tracks.length) return;
  if (q.loop && q.currentIndex < q.tracks.length) {
    await playCurrent(guildId);
    return;
  }
  q.currentIndex += 1;
  if (q.currentIndex >= q.tracks.length) {
    q.tracks = [];
    q.currentIndex = 0;
    q.playing = false;
    q.currentDurationSec = 0;
    runtime.currentTrack = null;
    return;
  }
  await playCurrent(guildId);
}

function bindPlayerEvents(guildId) {
  const runtime = getRuntime(guildId);
  if (runtime._bound) return;
  runtime._bound = true;
  runtime.player.on(AudioPlayerStatus.Idle, () => {
    nextTrack(guildId).catch((e) => {
      debugLog('H4', 'commands/music/music.js:player:idle-next-error', 'Failed to continue next track', { guildId, errorMessage: e.message });
    });
  });
  runtime.player.on('error', (error) => {
    debugLog('H4', 'commands/music/music.js:player:error', 'Audio player error', { guildId, errorMessage: error.message });
    const q = getQueue(guildId);
    q.playing = false;
  });
  runtime.player.on(AudioPlayerStatus.Playing, () => {
    debugLog('H8', 'commands/music/music.js:player:playing', 'Audio player entered Playing state', { guildId }, 'post-fix');
  });
}

// ── PLAY ─────────────────────────────────────────────────────
const playCmd = {
  data: new SlashCommandBuilder()
    .setName('play')
    .setDescription('🎵 Putar lagu dari YouTube/URL atau nama lagu')
    .addStringOption(o => o.setName('query').setDescription('Nama lagu atau URL YouTube').setRequired(true)),
  async execute(interaction) {
    const query = interaction.options.getString('query');
    const interactionVoiceId = interaction.member?.voice?.channelId || null;
    debugLog('H1', 'commands/music/music.js:play:entry', 'Play command entry voice snapshot', {
      guildId: interaction.guild?.id || null,
      userId: interaction.user?.id || null,
      interactionVoiceId,
      memberPresent: Boolean(interaction.member),
      memberType: interaction.member?.constructor?.name || typeof interaction.member
    });

    let memberVoiceId = null;
    try {
      const member = await interaction.guild.members.fetch(interaction.user.id);
      memberVoiceId = member?.voice?.channelId || null;
      debugLog('H2', 'commands/music/music.js:play:fetched-member', 'Fetched guild member voice state', {
        guildId: interaction.guild?.id || null,
        userId: interaction.user?.id || null,
        memberVoiceId
      });
    } catch (error) {
      debugLog('H3', 'commands/music/music.js:play:fetch-member-error', 'Failed to fetch member voice state', {
        errorMessage: error.message
      });
    }

    const voiceChannel = interaction.member?.voice?.channel || interaction.guild.members.cache.get(interaction.user.id)?.voice?.channel || null;
    if (!voiceChannel) return interaction.reply({ content: '❌ Kamu harus join voice channel dulu!', ephemeral: true });

    try {
      await interaction.deferReply();
      const guildId = interaction.guild.id;
      const q = getQueue(guildId);
      const runtime = getRuntime(guildId);
      bindPlayerEvents(guildId);

      const trackMeta = await resolveTrack(query);
      const track = {
        title: trackMeta.title,
        url: trackMeta.url,
        duration: trackMeta.duration,
        requestedBy: interaction.user.username,
        requestedById: interaction.user.id,
        thumbnail: null
      };

      q.tracks.push(track);

      if (!runtime.connection || runtime.connection.joinConfig.channelId !== voiceChannel.id) {
        runtime.connection?.destroy();
        runtime.connection = joinVoiceChannel({
          channelId: voiceChannel.id,
          guildId: interaction.guild.id,
          adapterCreator: interaction.guild.voiceAdapterCreator,
        });
        runtime.connection.subscribe(runtime.player);
        try {
          await entersState(runtime.connection, VoiceConnectionStatus.Ready, 20_000);
        } catch (error) {
          debugLog('H5', 'commands/music/music.js:play:join-timeout', 'Voice connection failed to reach Ready state', {
            guildId,
            channelId: voiceChannel.id,
            errorMessage: error.message
          }, 'post-fix');
          throw new Error('Koneksi voice timeout. Cek permission Connect/Speak bot di voice channel.');
        }
        // #region agent log
        fetch('http://127.0.0.1:7697/ingest/45b316d8-784b-4f1c-9e4f-f17566cac14d',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'5f6549'},body:JSON.stringify({sessionId:'5f6549',runId:'post-fix',hypothesisId:'H5',location:'commands/music/music.js:play:join-voice',message:'Voice connection ready',data:{guildId,channelId:voiceChannel.id},timestamp:Date.now()})}).catch(()=>{});
        // #endregion
      }

      if (!q.playing) {
        if (q.currentIndex >= q.tracks.length) q.currentIndex = 0;
        await playCurrent(guildId);
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
    } catch (error) {
      debugLog('H9', 'commands/music/music.js:play:execute-error', 'Play command failed', {
        errorMessage: error.message
      }, 'post-fix');
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ content: `❌ Gagal memutar lagu: ${error.message}`, embeds: [] }).catch(() => {});
      } else {
        await interaction.reply({ content: `❌ Gagal memutar lagu: ${error.message}`, ephemeral: true }).catch(() => {});
      }
    }
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
    const guildId = interaction.guild.id;
    const q = getQueue(guildId);
    const runtime = getRuntime(guildId);
    if (!q.playing) return interaction.reply({ content: '❌ Tidak ada lagu yang diputar!', ephemeral: true });
    runtime.player.stop(true);
    await interaction.reply({ embeds: [new EmbedBuilder().setTitle('⏭️ Lagu Dilewati').setDescription('Memutar lagu berikutnya.').setColor('#8B0000')] });
  }
};

// ── STOP ─────────────────────────────────────────────────────
const stopCmd = {
  data: new SlashCommandBuilder().setName('stop').setDescription('⏹️ Hentikan musik & kosongkan queue'),
  async execute(interaction) {
    const guildId = interaction.guild.id;
    const q = getQueue(guildId);
    const runtime = getRuntime(guildId);
    q.tracks = []; q.playing = false; q.currentIndex = 0;
    runtime.player.stop(true);
    runtime.connection?.destroy();
    runtime.connection = null;
    await interaction.reply({ embeds: [new EmbedBuilder().setTitle('⏹️ Musik Dihentikan').setDescription('Queue dikosongkan.').setColor('#8B0000')] });
  }
};

// ── PAUSE / RESUME ───────────────────────────────────────────
const pauseCmd = {
  data: new SlashCommandBuilder().setName('pause').setDescription('⏸️ Pause / Resume musik'),
  async execute(interaction) {
    const guildId = interaction.guild.id;
    const q = getQueue(guildId);
    const runtime = getRuntime(guildId);
    if (!q.tracks.length) return interaction.reply({ content: '❌ Tidak ada lagu!', ephemeral: true });
    if (q.playing) {
      runtime.player.pause();
      q.playing = false;
    } else {
      runtime.player.unpause();
      q.playing = true;
    }
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
