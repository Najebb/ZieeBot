require('dotenv').config();
const fs = require('fs');
const path = require('path');
const https = require('https');
const { Client, Collection, GatewayIntentBits } = require('discord.js');

// ========================
// Validasi Environment Variables
// ========================
const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;

console.log('🔍 Environment check:');
console.log('  - DISCORD_TOKEN:', token ? '✅ ada (' + token.substring(0, 15) + '...)' : '❌ TIDAK ADA!');
console.log('  - CLIENT_ID:', clientId ? '✅ ada (' + clientId.substring(0, 15) + '...)' : '❌ TIDAK ADA!');
console.log('  - NODE_VERSION:', process.version);

if (!token) {
  console.error('');
  console.error('❌❌❌ ERROR KRITIS ❌❌❌');
  console.error('DISCORD_TOKEN tidak ditemukan di environment variables!');
  console.error('');
  console.error('💡 Cara fix:');
  console.error('   1. Buka panel hosting → tab "Environment"');
  console.error('   2. Tambah variable: DISCORD_TOKEN = token_bot_kamu');
  console.error('   3. Restart server');
  console.error('');
} else if (token.length < 50) {
  console.error('⚠️ WARNING: DISCORD_TOKEN terlalu pendek, mungkin tidak valid!');
}

// ========================
// Inisialisasi Client Discord
// ========================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
  rest: { timeout: 30000, retries: 2 }
});

client.commands = new Collection();

function debugLog(hypothesisId, location, message, data = {}, runId = 'initial') {
  // #region agent log
  fetch('http://127.0.0.1:7697/ingest/45b316d8-784b-4f1c-9e4f-f17566cac14d',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'2257f3'},body:JSON.stringify({sessionId:'2257f3',runId,hypothesisId,location,message,data,timestamp:Date.now()})}).catch(()=>{});
  // #endregion
}

// ========================
// Load Events
// ========================
try {
  const eventsPath = path.join(__dirname, 'events');
  const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));
  for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    const event = require(filePath);
    if (event.once) {
      client.once(event.name, (...args) => event.execute(...args, client));
    } else {
      client.on(event.name, (...args) => event.execute(...args, client));
    }
    console.log(`📥 Event loaded: ${event.name}`);
  }
} catch (err) {
  console.error('❌ Error loading events:', err.message);
}

// ========================
// Load Commands
// ========================
try {
  const commandsPath = path.join(__dirname, 'commands');
  const commandFolders = fs.readdirSync(commandsPath);
  let commandCount = 0;
  for (const folder of commandFolders) {
    const folderPath = path.join(commandsPath, folder);
    const commandFiles = fs.readdirSync(folderPath).filter(file => file.endsWith('.js'));
    for (const file of commandFiles) {
      const filePath = path.join(folderPath, file);
      const exported = require(filePath);
      const commandList = Array.isArray(exported) ? exported : [exported];
      for (const command of commandList) {
        if (command?.data?.name) {
          client.commands.set(command.data.name, command);
          commandCount++;
        }
      }
    }
  }
  console.log(`📥 Commands loaded: ${commandCount} commands`);
} catch (err) {
  console.error('❌ Error loading commands:', err.message);
}

// ========================
// Login Discord dengan Timeout
// ========================
let loginAttempts = 0;
const maxAttempts = 3;

function loginWithTimeout(token, timeoutMs = 30000) {
  return Promise.race([
    client.login(token),
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Login timeout — WebSocket tidak merespons')), timeoutMs)
    )
  ]);
}

async function doLogin() {
  debugLog('H3', 'index.js:doLogin:entry', 'doLogin invoked', {
    loginAttempts,
    maxAttempts,
    hasToken: Boolean(token)
  });

  if (!token) {
    console.error('⛔ DISCORD_TOKEN tidak ada.');
    return;
  }

  loginAttempts++;
  console.log(`\n🤖 Bot Jebb mencoba login... (attempt ${loginAttempts}/${maxAttempts})`);

  try {
    await loginWithTimeout(token, 30000);
    debugLog('H1', 'index.js:doLogin:success', 'Discord login promise resolved', {
      userTag: client.user?.tag || null
    });
    console.log('✅ Login ke Discord berhasil!');
    loginAttempts = 0;
  } catch (error) {
    debugLog('H3', 'index.js:doLogin:error', 'Discord login failed', {
      errorMessage: error.message
    });
    console.error(`\n❌ Login gagal (attempt ${loginAttempts}/${maxAttempts}):`);
    console.error('   Error:', error.message);

    if (error.message.includes('TOKEN_INVALID')) {
      console.error('   💡 Token tidak valid! Reset token di Discord Developer Portal.');
    } else if (error.message.includes('disallowed intent')) {
      console.error('   💡 Aktifkan Privileged Gateway Intents di Discord Developer Portal.');
    }

    if (loginAttempts < maxAttempts) {
      const delay = loginAttempts * 15000;
      console.log(`   🔄 Retry dalam ${delay/1000} detik...`);
      setTimeout(doLogin, delay);
    } else {
      console.error('\n⛔ Max attempts reached. Bot tetap jalan untuk health check & web.');
    }
  }
}

client.on('debug', (info) => {
  if (info.includes('Ready') || info.includes('Session')) console.log(`[DEBUG] ${info}`);
});
client.on('warn', (info) => console.warn(`[WARN] ${info}`));
client.on('error', (error) => console.error(`[ERROR] ${error.message}`));

// ========================
// EXPRESS SERVER (Web + API)
// ========================
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || process.env.SERVER_PORT || 8080;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname))); // Serve static files (index.html, css, js)

// Store discord client untuk diakses API
app.set('discordClient', client);

// Auth Routes
app.use('/auth', require('./routes/auth').router);

// API Routes
app.use('/api', require('./routes/api'));

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: client.readyAt ? 'online' : 'starting',
    bot: client.user?.tag || 'not logged in',
    commands: client.commands.size,
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🌐 Web server berjalan di port ${PORT}`);
  console.log(`   → Dashboard: http://localhost:${PORT}`);
  console.log(`   → API: http://localhost:${PORT}/api/mahasiswa`);
});

// Mulai login Discord
doLogin();

// Keep alive
setInterval(() => {
  const status = client.user?.tag || 'belum login';
  console.log(`[${new Date().toLocaleTimeString('id-ID')}] Bot: ${status} | Uptime: ${Math.floor(process.uptime()/60)}m`);
}, 60000);

process.on('unhandledRejection', (error) => console.error('❌ Unhandled Rejection:', error));
process.on('uncaughtException', (error) => console.error('❌ Uncaught Exception:', error));
