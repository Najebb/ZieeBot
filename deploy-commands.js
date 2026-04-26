require('dotenv').config();
const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;

if (!token || !clientId) {
  console.error('❌ Silakan isi DISCORD_TOKEN dan CLIENT_ID di .env!');
  process.exit(1);
}

const commands = [];
const commandsPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(commandsPath);

for (const folder of commandFolders) {
  const folderPath = path.join(commandsPath, folder);
  const commandFiles = fs.readdirSync(folderPath).filter(file => file.endsWith('.js'));
  for (const file of commandFiles) {
    const filePath = path.join(folderPath, file);
    const command = require(filePath);
    if (command.data) {
      commands.push(command.data.toJSON());
    }
  }
}

const rest = new REST({ version: '10', timeout: 30000 }).setToken(token);

(async () => {
  try {
    console.log(`📤 Memulai refresh ${commands.length} slash commands...`);

    // HAPUS semua global commands biar tidak double
    console.log('🧹 Menghapus global commands lama...');
    await rest.put(Routes.applicationCommands(clientId), { body: [] });
    console.log('✅ Global commands dihapus (tidak akan double)');

    const guildIdsRaw = process.env.GUILD_ID || '';
    const guildIds = guildIdsRaw
      .split(',')
      .map(id => id.trim())
      .filter(id => /^\d{17,20}$/.test(id));

    // Deploy ke setiap guild (instant sync)
    for (const guildId of guildIds) {
      try {
        await rest.put(
          Routes.applicationGuildCommands(clientId, guildId),
          { body: commands },
        );
        console.log(`✅ Guild ${guildId}: ${commands.length} commands terdaftar (instant)!`);
      } catch (e) {
        console.error(`❌ Guild ${guildId}: gagal register -`, e.message);
      }
    }

    console.log(`\n📋 Total commands: ${commands.length}`);
    console.log('⚡ Commands sudah muncul SEKARANG di server yang terdaftar');
    console.log('💡 Jika ada double, tunggu 1 menit lalu reload Discord (Ctrl+R)');

  } catch (error) {
    console.error('❌ Error register commands:', error);
    if (error.code === 50001) {
      console.log('💡 Tips: Pastikan bot sudah di-invite dengan scope "applications.commands"');
    }
  }
})();

