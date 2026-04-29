const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../utils/database');

function debugLog(hypothesisId, location, message, data = {}, runId = 'initial') {
  // #region agent log
  fetch('http://127.0.0.1:7697/ingest/45b316d8-784b-4f1c-9e4f-f17566cac14d',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'5f6549'},body:JSON.stringify({sessionId:'5f6549',runId,hypothesisId,location,message,data,timestamp:Date.now()})}).catch(()=>{});
  // #endregion
}

// ── Helpers ──────────────────────────────────────────────────
const DAILY_AMOUNT  = 500;
const DAILY_COOLDOWN = 86400000; // 24 jam
const WORK_MIN = 150, WORK_MAX = 450;
const WORK_COOLDOWN = 3600000; // 1 jam
const CRIME_MIN = 200, CRIME_MAX = 800;
const CRIME_FAIL_FINE = 300;
const CRIME_COOLDOWN = 7200000; // 2 jam

function getEcon(guildId, userId) {
  if (db.dbType === 'sqlite') {
    let row = db.prepare('SELECT * FROM economy WHERE guild_id=? AND user_id=?').get(guildId, userId);
    if (!row) {
      debugLog('E1', 'commands/economy/economy.js:getEcon:sqlite-create', 'Economy account auto-created (sqlite)', { guildId, userId });
      db.prepare('INSERT INTO economy (guild_id,user_id,balance,bank,last_daily,last_work,last_crime) VALUES (?,?,0,0,0,0,0)').run(guildId, userId);
      row = { guild_id: guildId, user_id: userId, balance: 0, bank: 0, last_daily: 0, last_work: 0, last_crime: 0 };
    }
    return row;
  } else {
    const all = db.all('economy') || [];
    let row = all.find(r => r.guild_id === guildId && r.user_id === userId);
    if (!row) {
      debugLog('E1', 'commands/economy/economy.js:getEcon:json-create', 'Economy account auto-created (json)', { guildId, userId });
      row = { guild_id: guildId, user_id: userId, balance: 0, bank: 0, last_daily: 0, last_work: 0, last_crime: 0 };
      all.push(row); db.save('economy', all);
    }
    return row;
  }
}

function hasEconAccount(guildId, userId) {
  if (db.dbType === 'sqlite') {
    return Boolean(db.prepare('SELECT 1 FROM economy WHERE guild_id=? AND user_id=?').get(guildId, userId));
  }
  const all = db.all('economy') || [];
  return all.some(r => r.guild_id === guildId && r.user_id === userId);
}

function createEconAccount(guildId, userId) {
  if (db.dbType === 'sqlite') {
    db.prepare('INSERT INTO economy (guild_id,user_id,balance,bank,last_daily,last_work,last_crime) VALUES (?,?,0,0,0,0,0)').run(guildId, userId);
  } else {
    const all = db.all('economy') || [];
    all.push({ guild_id: guildId, user_id: userId, balance: 0, bank: 0, last_daily: 0, last_work: 0, last_crime: 0 });
    db.save('economy', all);
  }
}

function requireRegisteredAccount(interaction) {
  const guildId = interaction.guild.id;
  const userId = interaction.user.id;
  if (hasEconAccount(guildId, userId)) return false;
  interaction.reply({
    content: '❌ Kamu belum punya akun economy. Daftar dulu pakai `/eco-register`.',
    ephemeral: true
  }).catch(() => {});
  return true;
}

function saveEcon(guildId, userId, data) {
  if (db.dbType === 'sqlite') {
    db.prepare('UPDATE economy SET balance=?,bank=?,last_daily=?,last_work=?,last_crime=? WHERE guild_id=? AND user_id=?')
      .run(data.balance, data.bank, data.last_daily, data.last_work, data.last_crime, guildId, userId);
  } else {
    const all = db.all('economy') || [];
    const idx = all.findIndex(r => r.guild_id === guildId && r.user_id === userId);
    if (idx !== -1) { all[idx] = { ...all[idx], ...data }; db.save('economy', all); }
  }
}

function addTx(guildId, userId, type, amount, note) {
  if (db.dbType === 'sqlite') {
    db.prepare('INSERT INTO transactions (guild_id,user_id,type,amount,note,created_at) VALUES (?,?,?,?,?,?)').run(guildId, userId, type, amount, note, Math.floor(Date.now()/1000));
  } else {
    const all = db.all('transactions') || [];
    const id = all.length > 0 ? Math.max(...all.map(t => t.id||0)) + 1 : 1;
    all.unshift({ id, guild_id: guildId, user_id: userId, type, amount, note, created_at: Math.floor(Date.now()/1000) });
    db.save('transactions', all.slice(0, 500)); // keep last 500
  }
}

function fmtZN(n) { return `⚡ ${n.toLocaleString('id-ID')} ZN`; }
function fmtMs(ms) {
  const h = Math.floor(ms/3600000), m = Math.floor((ms%3600000)/60000), s = Math.floor((ms%60000)/1000);
  return h > 0 ? `${h}j ${m}m` : m > 0 ? `${m}m ${s}d` : `${s}d`;
}

// ── BALANCE ──────────────────────────────────────────────────
const balanceCmd = {
  data: new SlashCommandBuilder()
    .setName('balance')
    .setDescription('💰 Cek saldo ZN kamu atau user lain')
    .addUserOption(o => o.setName('user').setDescription('User yang dicek').setRequired(false)),
  async execute(interaction) {
    if (requireRegisteredAccount(interaction)) return;
    const target = interaction.options.getUser('user') || interaction.user;
    if (!hasEconAccount(interaction.guild.id, target.id)) {
      return interaction.reply({ content: `❌ ${target.username} belum terdaftar di economy.`, ephemeral: true });
    }
    const econ = getEcon(interaction.guild.id, target.id);
    const embed = new EmbedBuilder()
      .setTitle(`💰 Saldo ${target.username}`)
      .setThumbnail(target.displayAvatarURL({ dynamic: true }))
      .addFields(
        { name: '👛 Dompet', value: fmtZN(econ.balance), inline: true },
        { name: '🏦 Bank', value: fmtZN(econ.bank), inline: true },
        { name: '💎 Total', value: fmtZN(econ.balance + econ.bank), inline: true }
      )
      .setColor('#8B0000').setTimestamp();
    await interaction.reply({ embeds: [embed] });
  }
};

// ── DAILY ────────────────────────────────────────────────────
const dailyCmd = {
  data: new SlashCommandBuilder().setName('daily').setDescription('🎁 Ambil reward harian kamu'),
  async execute(interaction) {
    if (requireRegisteredAccount(interaction)) return;
    const { id: userId } = interaction.user;
    const { id: guildId } = interaction.guild;
    const econ = getEcon(guildId, userId);
    const now = Date.now();
    const diff = now - (econ.last_daily || 0);
    if (diff < DAILY_COOLDOWN) {
      return interaction.reply({ content: `⏳ Daily cooldown: **${fmtMs(DAILY_COOLDOWN - diff)}** lagi.`, ephemeral: true });
    }
    econ.balance += DAILY_AMOUNT;
    econ.last_daily = now;
    saveEcon(guildId, userId, econ);
    addTx(guildId, userId, 'daily', DAILY_AMOUNT, 'Daily claim');
    const embed = new EmbedBuilder()
      .setTitle('🎁 Daily Reward!')
      .setDescription(`Kamu mendapat ${fmtZN(DAILY_AMOUNT)}!\n💛 Saldo: ${fmtZN(econ.balance)}`)
      .setColor('#8B0000').setTimestamp();
    await interaction.reply({ embeds: [embed] });
  }
};

// ── WORK ─────────────────────────────────────────────────────
const workJobs = ['ngoding','desain logo','nulis laporan','debug server','jadi ojol','jualan online','main saham'];
const workCmd = {
  data: new SlashCommandBuilder().setName('work').setDescription('💼 Kerja dan dapatkan ZN'),
  async execute(interaction) {
    if (requireRegisteredAccount(interaction)) return;
    const { id: userId } = interaction.user;
    const { id: guildId } = interaction.guild;
    const econ = getEcon(guildId, userId);
    const now = Date.now();
    const diff = now - (econ.last_work || 0);
    if (diff < WORK_COOLDOWN) {
      return interaction.reply({ content: `⏳ Work cooldown: **${fmtMs(WORK_COOLDOWN - diff)}** lagi.`, ephemeral: true });
    }
    const earned = Math.floor(Math.random() * (WORK_MAX - WORK_MIN + 1)) + WORK_MIN;
    const job = workJobs[Math.floor(Math.random() * workJobs.length)];
    econ.balance += earned;
    econ.last_work = now;
    saveEcon(guildId, userId, econ);
    addTx(guildId, userId, 'work', earned, `Work: ${job}`);
    const embed = new EmbedBuilder()
      .setTitle('💼 Kerja Selesai!')
      .setDescription(`Kamu **${job}** dan mendapat ${fmtZN(earned)}!\n💛 Saldo: ${fmtZN(econ.balance)}`)
      .setColor('#8B0000').setTimestamp();
    await interaction.reply({ embeds: [embed] });
  }
};

// ── CRIME ────────────────────────────────────────────────────
const crimeCmd = {
  data: new SlashCommandBuilder().setName('crime').setDescription('🔫 Lakukan kejahatan (risiko tinggi!)'),
  async execute(interaction) {
    if (requireRegisteredAccount(interaction)) return;
    const { id: userId } = interaction.user;
    const { id: guildId } = interaction.guild;
    const econ = getEcon(guildId, userId);
    const now = Date.now();
    const diff = now - (econ.last_crime || 0);
    if (diff < CRIME_COOLDOWN) {
      return interaction.reply({ content: `⏳ Crime cooldown: **${fmtMs(CRIME_COOLDOWN - diff)}** lagi.`, ephemeral: true });
    }
    econ.last_crime = now;
    const success = Math.random() < 0.5;
    if (success) {
      const earned = Math.floor(Math.random() * (CRIME_MAX - CRIME_MIN + 1)) + CRIME_MIN;
      econ.balance += earned;
      saveEcon(guildId, userId, econ);
      addTx(guildId, userId, 'crime_success', earned, 'Crime berhasil');
      const embed = new EmbedBuilder().setTitle('🔫 Crime Berhasil!')
        .setDescription(`Kamu berhasil dan mendapat ${fmtZN(earned)}!\n💛 Saldo: ${fmtZN(econ.balance)}`)
        .setColor('#8B0000').setTimestamp();
      await interaction.reply({ embeds: [embed] });
    } else {
      const fine = Math.min(econ.balance, CRIME_FAIL_FINE);
      econ.balance -= fine;
      saveEcon(guildId, userId, econ);
      addTx(guildId, userId, 'crime_fail', -fine, 'Crime gagal, kena denda');
      const embed = new EmbedBuilder().setTitle('🚔 Ketahuan!')
        .setDescription(`Crime gagal! Kamu didenda ${fmtZN(fine)}!\n💛 Saldo: ${fmtZN(econ.balance)}`)
        .setColor('#FF1744').setTimestamp();
      await interaction.reply({ embeds: [embed] });
    }
  }
};

// ── GAMBLE ───────────────────────────────────────────────────
const gambleCmd = {
  data: new SlashCommandBuilder()
    .setName('gamble')
    .setDescription('🎰 Taruh ZN di coinflip!')
    .addIntegerOption(o => o.setName('jumlah').setDescription('Jumlah ZN').setRequired(true).setMinValue(10)),
  async execute(interaction) {
    if (requireRegisteredAccount(interaction)) return;
    const { id: userId } = interaction.user;
    const { id: guildId } = interaction.guild;
    const amount = interaction.options.getInteger('jumlah');
    const econ = getEcon(guildId, userId);
    if (econ.balance < amount) return interaction.reply({ content: `❌ Saldo tidak cukup! Punya: ${fmtZN(econ.balance)}`, ephemeral: true });
    const win = Math.random() < 0.5;
    if (win) {
      econ.balance += amount;
      addTx(guildId, userId, 'gamble_win', amount, 'Coinflip menang');
      const embed = new EmbedBuilder().setTitle('🎰 Menang!')
        .setDescription(`🪙 HEADS — Kamu menang ${fmtZN(amount)}!\n💛 Saldo: ${fmtZN(econ.balance)}`)
        .setColor('#8B0000');
      await interaction.reply({ embeds: [embed] });
    } else {
      econ.balance -= amount;
      addTx(guildId, userId, 'gamble_lose', -amount, 'Coinflip kalah');
      const embed = new EmbedBuilder().setTitle('🎰 Kalah!')
        .setDescription(`🪙 TAILS — Kamu kalah ${fmtZN(amount)}!\n💛 Saldo: ${fmtZN(econ.balance)}`)
        .setColor('#FF1744');
      await interaction.reply({ embeds: [embed] });
    }
    saveEcon(guildId, userId, econ);
  }
};

// ── ROB ──────────────────────────────────────────────────────
const robCmd = {
  data: new SlashCommandBuilder()
    .setName('rob')
    .setDescription('🦹 Rampok user lain!')
    .addUserOption(o => o.setName('target').setDescription('User yang dirampok').setRequired(true)),
  async execute(interaction) {
    if (requireRegisteredAccount(interaction)) return;
    const { id: userId } = interaction.user;
    const { id: guildId } = interaction.guild;
    const target = interaction.options.getUser('target');
    if (target.id === userId) return interaction.reply({ content: '❌ Tidak bisa rampok diri sendiri!', ephemeral: true });
    const robber = getEcon(guildId, userId);
    const victim = getEcon(guildId, target.id);
    if (victim.balance < 100) return interaction.reply({ content: `❌ ${target.username} terlalu miskin untuk dirampok!`, ephemeral: true });
    const success = Math.random() < 0.45;
    if (success) {
      const stolen = Math.floor(victim.balance * 0.2);
      robber.balance += stolen; victim.balance -= stolen;
      saveEcon(guildId, userId, robber); saveEcon(guildId, target.id, victim);
      addTx(guildId, userId, 'rob_success', stolen, `Rob dari ${target.username}`);
      addTx(guildId, target.id, 'robbed', -stolen, `Dirampok oleh ${interaction.user.username}`);
      const embed = new EmbedBuilder().setTitle('🦹 Rampok Berhasil!')
        .setDescription(`Kamu berhasil mencuri ${fmtZN(stolen)} dari **${target.username}**!\n💛 Saldo: ${fmtZN(robber.balance)}`)
        .setColor('#8B0000');
      await interaction.reply({ embeds: [embed] });
    } else {
      const fine = Math.min(robber.balance, 200);
      robber.balance -= fine;
      saveEcon(guildId, userId, robber);
      addTx(guildId, userId, 'rob_fail', -fine, `Rob gagal, denda`);
      const embed = new EmbedBuilder().setTitle('🚔 Rampok Gagal!')
        .setDescription(`Ketahuan! Kamu didenda ${fmtZN(fine)}!\n💛 Saldo: ${fmtZN(robber.balance)}`)
        .setColor('#FF1744');
      await interaction.reply({ embeds: [embed] });
    }
  }
};

// ── DEPOSIT / WITHDRAW ───────────────────────────────────────
const depositCmd = {
  data: new SlashCommandBuilder()
    .setName('deposit')
    .setDescription('🏦 Simpan ZN ke bank')
    .addIntegerOption(o => o.setName('jumlah').setDescription('Jumlah atau "all"').setRequired(true).setMinValue(1)),
  async execute(interaction) {
    if (requireRegisteredAccount(interaction)) return;
    const { id: userId } = interaction.user;
    const { id: guildId } = interaction.guild;
    const amount = interaction.options.getInteger('jumlah');
    const econ = getEcon(guildId, userId);
    if (econ.balance < amount) return interaction.reply({ content: `❌ Saldo tidak cukup!`, ephemeral: true });
    econ.balance -= amount; econ.bank += amount;
    saveEcon(guildId, userId, econ);
    addTx(guildId, userId, 'deposit', -amount, 'Deposit ke bank');
    await interaction.reply({ embeds: [new EmbedBuilder().setTitle('🏦 Deposit Berhasil!').setDescription(`Disimpan: ${fmtZN(amount)}\n💛 Dompet: ${fmtZN(econ.balance)} | 🏦 Bank: ${fmtZN(econ.bank)}`).setColor('#8B0000')] });
  }
};

const withdrawCmd = {
  data: new SlashCommandBuilder()
    .setName('withdraw')
    .setDescription('🏧 Ambil ZN dari bank')
    .addIntegerOption(o => o.setName('jumlah').setDescription('Jumlah ZN').setRequired(true).setMinValue(1)),
  async execute(interaction) {
    if (requireRegisteredAccount(interaction)) return;
    const { id: userId } = interaction.user;
    const { id: guildId } = interaction.guild;
    const amount = interaction.options.getInteger('jumlah');
    const econ = getEcon(guildId, userId);
    if (econ.bank < amount) return interaction.reply({ content: `❌ Saldo bank tidak cukup!`, ephemeral: true });
    econ.bank -= amount; econ.balance += amount;
    saveEcon(guildId, userId, econ);
    addTx(guildId, userId, 'withdraw', amount, 'Tarik dari bank');
    await interaction.reply({ embeds: [new EmbedBuilder().setTitle('🏧 Tarik Berhasil!').setDescription(`Ditarik: ${fmtZN(amount)}\n💛 Dompet: ${fmtZN(econ.balance)} | 🏦 Bank: ${fmtZN(econ.bank)}`).setColor('#8B0000')] });
  }
};

// ── TRANSFER ─────────────────────────────────────────────────
const transferCmd = {
  data: new SlashCommandBuilder()
    .setName('transfer')
    .setDescription('💸 Kirim ZN ke user lain')
    .addUserOption(o => o.setName('target').setDescription('Penerima').setRequired(true))
    .addIntegerOption(o => o.setName('jumlah').setDescription('Jumlah ZN').setRequired(true).setMinValue(1)),
  async execute(interaction) {
    if (requireRegisteredAccount(interaction)) return;
    const { id: userId } = interaction.user;
    const { id: guildId } = interaction.guild;
    const target = interaction.options.getUser('target');
    const amount = interaction.options.getInteger('jumlah');
    if (target.id === userId) return interaction.reply({ content: '❌ Tidak bisa transfer ke diri sendiri!', ephemeral: true });
    const sender = getEcon(guildId, userId);
    if (sender.balance < amount) return interaction.reply({ content: `❌ Saldo tidak cukup!`, ephemeral: true });
    const receiver = getEcon(guildId, target.id);
    sender.balance -= amount; receiver.balance += amount;
    saveEcon(guildId, userId, sender); saveEcon(guildId, target.id, receiver);
    addTx(guildId, userId, 'transfer_out', -amount, `Transfer ke ${target.username}`);
    addTx(guildId, target.id, 'transfer_in', amount, `Transfer dari ${interaction.user.username}`);
    await interaction.reply({ embeds: [new EmbedBuilder().setTitle('💸 Transfer Berhasil!').setDescription(`Terkirim ${fmtZN(amount)} ke **${target.username}**\n💛 Saldo kamu: ${fmtZN(sender.balance)}`).setColor('#8B0000')] });
  }
};

// ── SHOP ─────────────────────────────────────────────────────
const shopCmd = {
  data: new SlashCommandBuilder().setName('shop').setDescription('🛒 Lihat item di toko'),
  async execute(interaction) {
    if (requireRegisteredAccount(interaction)) return;
    const { id: guildId } = interaction.guild;
    let items = [];
    if (db.dbType === 'sqlite') {
      items = db.prepare('SELECT * FROM shop_items WHERE guild_id=? AND (stock=-1 OR stock>0)').all(guildId);
    } else {
      items = (db.all('shop_items') || []).filter(i => i.guild_id === guildId && (i.stock === -1 || i.stock > 0));
    }
    if (!items.length) return interaction.reply({ content: '🛒 Toko kosong saat ini.', ephemeral: true });
    const embed = new EmbedBuilder().setTitle('🛒 Toko ZieeBot').setColor('#8B0000');
    items.forEach(i => embed.addFields({ name: `${i.name} — ⚡ ${i.price.toLocaleString('id-ID')} ZN`, value: `${i.description || 'Tidak ada deskripsi'} | Stok: ${i.stock === -1 ? '∞' : i.stock}\nBeli: \`/buy ${i.id}\``, inline: false }));
    await interaction.reply({ embeds: [embed] });
  }
};

// ── BUY ──────────────────────────────────────────────────────
const buyCmd = {
  data: new SlashCommandBuilder()
    .setName('buy')
    .setDescription('🛍️ Beli item dari toko')
    .addIntegerOption(o => o.setName('id').setDescription('ID item').setRequired(true)),
  async execute(interaction) {
    if (requireRegisteredAccount(interaction)) return;
    const { id: userId } = interaction.user;
    const { id: guildId } = interaction.guild;
    const itemId = interaction.options.getInteger('id');
    let item;
    if (db.dbType === 'sqlite') {
      item = db.prepare('SELECT * FROM shop_items WHERE id=? AND guild_id=?').get(itemId, guildId);
    } else {
      item = (db.all('shop_items') || []).find(i => i.id === itemId && i.guild_id === guildId);
    }
    if (!item) return interaction.reply({ content: '❌ Item tidak ditemukan!', ephemeral: true });
    if (item.stock === 0) return interaction.reply({ content: '❌ Stok habis!', ephemeral: true });
    const econ = getEcon(guildId, userId);
    if (econ.balance < item.price) return interaction.reply({ content: `❌ ZN tidak cukup! Butuh: ${item.price.toLocaleString('id-ID')} ZN`, ephemeral: true });
    econ.balance -= item.price;
    saveEcon(guildId, userId, econ);
    if (item.stock > 0) {
      if (db.dbType === 'sqlite') {
        db.prepare('UPDATE shop_items SET stock=stock-1 WHERE id=?').run(itemId);
      } else {
        const all = db.all('shop_items') || [];
        const idx = all.findIndex(i => i.id === itemId); if (idx !== -1) { all[idx].stock--; db.save('shop_items', all); }
      }
    }
    // Beri role jika ada
    if (item.role_id) {
      const member = await interaction.guild.members.fetch(userId).catch(() => null);
      if (member) await member.roles.add(item.role_id).catch(() => {});
    }
    addTx(guildId, userId, 'shop_buy', -item.price, `Beli ${item.name}`);
    await interaction.reply({ embeds: [new EmbedBuilder().setTitle('🛍️ Pembelian Berhasil!').setDescription(`Kamu membeli **${item.name}** seharga ${item.price.toLocaleString('id-ID')} ZN\n💛 Saldo: ${fmtZN(econ.balance)}`).setColor('#8B0000')] });
  }
};

const registerCmd = {
  data: new SlashCommandBuilder()
    .setName('eco-register')
    .setDescription('🪪 Daftar akun economy kamu'),
  async execute(interaction) {
    const guildId = interaction.guild.id;
    const userId = interaction.user.id;
    if (hasEconAccount(guildId, userId)) {
      return interaction.reply({ content: '✅ Akun economy kamu sudah terdaftar.', ephemeral: true });
    }
    createEconAccount(guildId, userId);
    debugLog('E2', 'commands/economy/economy.js:register:create', 'Economy account created by slash command', { guildId, userId }, 'post-fix');
    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle('🪪 Registrasi Economy Berhasil')
          .setDescription(`Akun economy untuk ${interaction.user} sudah dibuat.\nSekarang kamu bisa pakai command economy seperti \`/daily\` dan \`/balance\`.`)
          .setColor('#8B0000')
          .setTimestamp()
      ]
    });
  }
};

// ── Export semua command ──────────────────────────────────────
module.exports = [registerCmd, balanceCmd, dailyCmd, workCmd, crimeCmd, gambleCmd, robCmd, depositCmd, withdrawCmd, transferCmd, shopCmd, buyCmd];
