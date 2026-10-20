const fs=require('fs'),path=require('path'),pino=require('pino');
const {default:makeWASocket,useMultiFileAuthState,DisconnectReason,fetchLatestBaileysVersion}=require('@whiskeysockets/baileys');
const ROOT=path.join(__dirname,'..'),AUTH=path.join(ROOT,'data','auth'),SETTINGS=path.join(ROOT,'data','settings.json');
let sockRef=null, isRegistered=false, settings={autoreacts:false,autostatus:false,antidelete:false,anticall:false};
try{settings=JSON.parse(fs.readFileSync(SETTINGS,'utf8'));}catch{}
function saveSettings(){fs.mkdirSync(path.dirname(SETTINGS),{recursive:true});fs.writeFileSync(SETTINGS,JSON.stringify(settings,null,2));}
function getCommands(){return fs.readdirSync(path.join(ROOT,'commands')).filter(x=>x.endsWith('.js')).map(x=>require(path.join(ROOT,'commands',x)));}
function getText(m){m=m?.ephemeralMessage?.message||m?.viewOnceMessage?.message||m?.viewOnceMessageV2?.message||m;return m?.conversation||m?.extendedTextMessage?.text||m?.imageMessage?.caption||m?.videoMessage?.caption||'';}
async function startBot(){
 fs.mkdirSync(AUTH,{recursive:true});const {state,saveCreds}=await useMultiFileAuthState(AUTH);isRegistered=!!state.creds.registered;let reconnecting=false;
 async function connect(){
  const latest=await fetchLatestBaileysVersion().catch(()=>null);
  const sock=makeWASocket({...(latest?.version?{version:latest.version}:{}),auth:state,logger:pino({level:process.env.LOG_LEVEL||'silent'}),browser:['RAVEN MD BOT','Chrome','1.0.0'],syncFullHistory:false});
  sockRef=sock;sock.ev.on('creds.update',saveCreds);
  sock.ev.on('connection.update',async u=>{
   if(u.connection==='open'){reconnecting=false;isRegistered=true;console.log('RAVEN MD BOT connected to WhatsApp.');try{const owner=(process.env.OWNER_NUMBER||'923003719761').replace(/\D/g,'')+'@s.whatsapp.net';await sock.sendMessage(owner,{text:'🦅 RAVEN MD BOT LINKED SUCCESSFULLY!\n\nSend .menu to see commands.\nOwner: '+(process.env.OWNER_NAME||'RANA FURQAN')+'\nDeveloper: '+(process.env.DEVELOPER||'JOKER RKS')});}catch(e){console.error('Owner notification failed:',e.message);}}
   if(u.connection==='close'&&!reconnecting){const code=u.lastDisconnect?.error?.output?.statusCode;reconnecting=true;if(code===DisconnectReason.loggedOut){console.error('Session logged out; remove data/auth and pair again.');return;}setTimeout(()=>connect().catch(e=>{reconnecting=false;console.error(e);}),code===515?1200:2500);}
  });
  sock.ev.on('messages.upsert',async({messages,type})=>{if(type!=='notify')return;for(const msg of messages||[]){if(!msg.message||msg.key?.fromMe)continue;const body=getText(msg.message),prefix=process.env.PREFIX||'.';if(!body.startsWith(prefix))continue;const parts=body.slice(prefix.length).trim().split(/\s+/),name=(parts.shift()||'').toLowerCase(),cmd=getCommands().find(c=>c.name===name);if(!cmd)continue;const jid=msg.key.remoteJid,reply=t=>sock.sendMessage(jid,{text:String(t)},{quoted:msg});try{await cmd.execute({sock,message:msg,jid,args:parts,reply,config:{prefix,ownerName:process.env.OWNER_NAME||'RANA FURQAN',ownerNumber:process.env.OWNER_NUMBER||'923003719761',developer:process.env.DEVELOPER||'JOKER RKS'},setSetting:async(k,v)=>{settings[k]=v;saveSettings();},getSetting:k=>settings[k]});}catch(e){console.error('Command error:',e);await reply('Command error. Hosting logs check karein.');}}});
  sock.ev.on('call',async calls=>{if(!settings.anticall)return;for(const c of calls||[]){if(c.status==='offer'&&c.from){try{await sock.rejectCall(c.id,c.from);await sock.sendMessage(c.from,{text:'my boss are busy please call me latter'});}catch(e){console.error('Anti-call:',e.message);}}}});
 }
 await connect();
}
async function requestPairingCode(number){const clean=String(number||'').replace(/\D/g,'');if(clean.length<8||clean.length>15)throw new Error('Enter number with country code, digits only.');if(!sockRef)throw new Error('WhatsApp socket is starting. Wait 5 seconds and try again.');if(sockRef.authState?.creds?.registered)throw new Error('This session is already linked.');return await sockRef.requestPairingCode(clean);}
module.exports={startBot,requestPairingCode};
