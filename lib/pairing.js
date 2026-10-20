const express = require('express');
const path = require('path');
const { requestPairingCode } = require('./bot');

function startPairingSite(port) {
const app = express();

app.use(express.json({ limit: '10kb' }));
app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/health', (req, res) => {
res.json({
ok: true,
name: 'RAVEN MD BOT'
});
});

app.post('/pair', async (req, res) => {
try {
const number = req.body?.number;

  if (!number) {
    return res.status(400).json({
      ok: false,
      error: 'Country code ke saath WhatsApp number enter karo.'
    });
  }

  const code = await requestPairingCode(number);

  return res.json({
    ok: true,
    code: String(code).match(/.{1,4}/g)?.join('-') || String(code)
  });
} catch (err) {
  console.error('Pairing request failed:', err?.stack || err);

  const message = err?.message || 'Pairing failed. Please try again later.';

  const status = /rate.?limit|too many requests/i.test(message)
    ? 429
    : 400;

  return res.status(status).json({
    ok: false,
    error: message
  });
}

});

app.use((err, req, res, next) => {
console.error('Website request error:', err.message);

if (res.headersSent) return next(err);

return res.status(400).json({
  ok: false,
  error: 'Invalid request. Please refresh the website and try again.'
});

});

app.listen(port, '0.0.0.0', () => {
console.log("RAVEN MD BOT pairing website listening on ${port}");
});
}

module.exports = { startPairingSite };
