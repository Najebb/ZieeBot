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
    const exported = require(filePath);
    // #region agent log
    fetch('http://127.0.0.1:7697/ingest/45b316d8-784b-4f1c-9e4f-f17566cac14d',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'5f6549'},body:JSON.stringify({sessionId:'5f6549',runId:'initial',hypothesisId:'H1',location:'deploy-commands.js:file-load',message:'Loaded command module',data:{file,exportType:Array.isArray(exported)?'array':typeof exported},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    const commandList = Array.isArray(exported) ? exported : [exported];
    let addedCount = 0;
    for (const command of commandList) {
      if (command?.data?.name) {
        commands.push(command.data.toJSON());
        addedCount++;
      }
    }
    if (addedCount === 0) {
      // #region agent log
      fetch('http://127.0.0.1:7697/ingest/45b316d8-784b-4f1c-9e4f-f17566cac14d',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'5f6549'},body:JSON.stringify({sessionId:'5f6549',runId:'initial',hypothesisId:'H2',location:'deploy-commands.js:skip-module',message:'Module skipped because no valid slash command found',data:{file,moduleCount:commandList.length},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
    } else {
      // #region agent log
      fetch('http://127.0.0.1:7697/ingest/45b316d8-784b-4f1c-9e4f-f17566cac14d',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'5f6549'},body:JSON.stringify({sessionId:'5f6549',runId:'initial',hypothesisId:'H5',location:'deploy-commands.js:add-module',message:'Commands extracted from module',data:{file,addedCount,moduleCount:commandList.length},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
    }
  }
}

const rest = new REST({ version: '10', timeout: 30000 }).setToken(token);

(async () => {
  try {
    // #region agent log
    fetch('http://127.0.0.1:7697/ingest/45b316d8-784b-4f1c-9e4f-f17566cac14d',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'5f6549'},body:JSON.stringify({sessionId:'5f6549',runId:'initial',hypothesisId:'H3',location:'deploy-commands.js:pre-register',message:'Prepared command payload',data:{total:commands.length,names:commands.map(c=>c.name)},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
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
        // #region agent log
        fetch('http://127.0.0.1:7697/ingest/45b316d8-784b-4f1c-9e4f-f17566cac14d',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'5f6549'},body:JSON.stringify({sessionId:'5f6549',runId:'initial',hypothesisId:'H4',location:'deploy-commands.js:guild-success',message:'Guild command registration success',data:{guildId,total:commands.length},timestamp:Date.now()})}).catch(()=>{});
        // #endregion
        console.log(`✅ Guild ${guildId}: ${commands.length} commands terdaftar (instant)!`);
      } catch (e) {
        // #region agent log
        fetch('http://127.0.0.1:7697/ingest/45b316d8-784b-4f1c-9e4f-f17566cac14d',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'5f6549'},body:JSON.stringify({sessionId:'5f6549',runId:'initial',hypothesisId:'H4',location:'deploy-commands.js:guild-fail',message:'Guild command registration failed',data:{guildId,error:e.message},timestamp:Date.now()})}).catch(()=>{});
        // #endregion
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

