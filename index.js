require('dotenv').config();

const { startBot } = require('./lib/bot');
const { startPairingSite } = require('./lib/pairing');

const port = Number(process.env.PORT || 3000);

startPairingSite(port);

startBot().catch(err => {
console.error(
'RAVEN MD BOT startup error:',
err?.stack || err
);

process.exitCode = 1;
});
