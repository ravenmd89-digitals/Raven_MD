const fs = require('fs');
const path = require('path');
const pino = require('pino');

const {
default: makeWASocket,
useMultiFileAuthState,
DisconnectReason
} = require('@whiskeysockets/baileys');

const ROOT = path.join(__dirname, '..');
const AUTH = path.join(ROOT, 'data', 'auth');
const SETTINGS = path.join(ROOT, 'data', 'settings.json');

let sockRef = null;
let credsRef = null;
let socketStatus = 'starting';
let sessionLoggedOut = false;
let reconnecting = false;

let settings = {
autoreacts: false,
autostatus: false,
antidelete: false,
anticall: false
};

try {
settings = {
...settings,
...JSON.parse(fs.readFileSync(SETTINGS, 'utf8'))
};
} catch {}

function saveSettings() {
fs.mkdirSync(path.dirname(SETTINGS), { recursive: true });
fs.writeFileSync(SETTINGS, JSON.stringify(settings, null, 2));
}

function getCommands() {
const dir = path.join(ROOT, 'commands');

if (!fs.existsSync(dir)) return [];

return fs.readdirSync(dir)
.filter(file => file.endsWith('.js'))
.map(file => {
try {
return require(path.join(dir, file));
} catch (err) {
console.error("Failed loading command ${file}:", err.message);
return null;
}
})
.filter(Boolean);
}

function getText(message) {
let m = message;

for (let i = 0; i < 5 && m; i++) {
if (m.ephemeralMessage) m = m.ephemeralMessage.message;
else if (m.viewOnceMessage) m = m.viewOnceMessage.message;
else if (m.viewOnceMessageV2) m = m.viewOnceMessageV2.message;
else break;
}

return m?.conversation ||
m?.extendedTextMessage?.text ||
m?.imageMessage?.caption ||
m?.videoMessage?.caption ||
'';
}

async function startBot() {
fs.mkdirSync(AUTH, { recursive: true });

const { state, saveCreds } = await useMultiFileAuthState(AUTH);

credsRef = state.creds;
sessionLoggedOut = false;
socketStatus = 'starting';

async function connect() {
if (sessionLoggedOut) return;

const sock = makeWASocket({
  auth: state,
  logger: pino({ level: process.env.LOG_LEVEL || 'silent' }),
  browser: ['RAVEN MD BOT', 'Chrome', '1.0.0'],
  syncFullHistory: false,
  markOnlineOnConnect: false
});

sockRef = sock;
socketStatus = 'connecting';

sock.ev.on('creds.update', async update => {
  Object.assign(credsRef, update);
  await saveCreds();
});

sock.ev.on('connection.update', async update => {
  const { connection, lastDisconnect } = update;

  if (connection === 'open') {
    socketStatus = 'open';
    sessionLoggedOut = false;
    reconnecting = false;

    console.log('RAVEN MD BOT connected to WhatsApp.');

    try {
      const ownerNumber = (
        process.env.OWNER_NUMBER || '923003719761'
      ).replace(/\D/g, '');

      const ownerJid = `${ownerNumber}@s.whatsapp.net`;

      await sock.sendMessage(ownerJid, {
        text:
          '🦅 RAVEN MD BOT LINKED SUCCESSFULLY!\n\n' +
          'Send .menu to see commands.\n' +
          'Owner: ' + (process.env.OWNER_NAME || 'RANA FURQAN') + '\n' +
          'Developer: ' + (process.env.DEVELOPER || 'JOKER RKS')
      });
    } catch (err) {
      console.error('Owner notification failed:', err.message);
    }
  }

  if (connection === 'close') {
    socketStatus = 'closed';

    const code = lastDisconnect?.error?.output?.statusCode;

    console.error('WhatsApp connection closed. Status:', code ?? 'unknown');

    if (code === DisconnectReason.loggedOut) {
      sessionLoggedOut = true;
      socketStatus = 'loggedOut';
      reconnecting = false;

      console.error(
        'WhatsApp session logged out. Back up and clear data/auth, then pair again.'
      );
      return;
    }

    if (reconnecting) return;

    reconnecting = true;

    const delay = code === 515 ? 1500 : 3000;

    setTimeout(async () => {
      try {
        await connect();
      } catch (err) {
        socketStatus = 'closed';
        reconnecting = false;
        console.error('Reconnect failed:', err.stack || err);
      }
    }, delay);
  }
});

sock.ev.on('messages.upsert', async ({ messages, type }) => {
  if (type !== 'notify') return;

  for (const msg of messages || []) {
    if (!msg.message || msg.key?.fromMe) continue;

    const body = getText(msg.message);
    const prefix = process.env.PREFIX || '.';

    if (!body.startsWith(prefix)) continue;

    const parts = body.slice(prefix.length).trim().split(/\s+/);
    const name = (parts.shift() || '').toLowerCase();

    if (!name) continue;

    const command = getCommands().find(item => item.name === name);
    if (!command || typeof command.execute !== 'function') continue;

    const jid = msg.key.remoteJid;

    const reply = text =>
      sock.sendMessage(jid, { text: String(text) }, { quoted: msg });

    try {
      await command.execute({
        sock,
        message: msg,
        jid,
        args: parts,
        reply,
        config: {
          prefix,
          ownerName: process.env.OWNER_NAME || 'RANA FURQAN',
          ownerNumber: process.env.OWNER_NUMBER || '923003719761',
          developer: process.env.DEVELOPER || 'JOKER RKS'
        },
        setSetting: async (key, value) => {
          settings[key] = value;
          saveSettings();
        },
        getSetting: key => settings[key]
      });
    } catch (err) {
      console.error('Command error:', err.stack || err);
      await reply('Command error. Hosting logs check karein.');
    }
  }
});

sock.ev.on('call', async calls => {
  if (!settings.anticall) return;

  for (const call of calls || []) {
    if (call.status !== 'offer' || !call.from || !call.id) continue;

    try {
      if (typeof sock.rejectCall === 'function') {
        await sock.rejectCall(call.id, call.from);
      }

      await sock.sendMessage(call.from, {
        text: 'my boss are busy please call me latter'
      });
    } catch (err) {
      console.error('Anti-call error:', err.message);
    }
  }
});

}

await connect();
}

async function requestPairingCode(number) {
const clean = String(number || '').replace(/\D/g, '');

if (clean.length < 8 || clean.length > 15) {
throw new Error('Enter number with country code, digits only.');
}

if (sessionLoggedOut) {
throw new Error(
'WhatsApp session logged out. Back up and clear data/auth, then restart.'
);
}

if (!sockRef || !credsRef) {
throw new Error('WhatsApp socket is starting. Wait 10 seconds and retry.');
}

if (credsRef.registered) {
throw new Error('Session is already linked. Unlink it before pairing again.');
}

if (socketStatus !== 'connecting' && socketStatus !== 'open') {
throw new Error(
'WhatsApp socket is not ready. Check Railway logs and restart the service.'
);
}

return await sockRef.requestPairingCode(clean);
}

module.exports = {
startBot,
requestPairingCode
};
