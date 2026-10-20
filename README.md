<div align="center">

# 🦅 RAVEN MD BOT
### `BLUE × RED GLOW • WHATSAPP AUTOMATION`

<img src="https://i.imgur.com/QC7uZX8.jpeg" width="170" alt="RAVEN MD BOT logo">

**Owner:** RANA FURQAN · **Developer:** JOKER RKS

![Node.js](https://img.shields.io/badge/Node.js-20%2B-22c55e?style=for-the-badge)
![Baileys](https://img.shields.io/badge/Baileys-7.0.0--rc14-3b82f6?style=for-the-badge)
![RAVEN](https://img.shields.io/badge/RAVEN-MD%20BOT-ef4444?style=for-the-badge)

</div>

---

## ⚡ Quick launch

```bash
npm install
npm start
```

Deploy the repository on a Node.js host, open the deployed website, enter the WhatsApp number with country code, and press **GENERATE PAIRING CODE**. Then open WhatsApp → **Linked devices** → **Link a device** and enter the displayed code.

## 🗂️ Structure

```text
RAVEN-MD-BOT/
├── index.js
├── package.json
├── README.md
├── .env.example
├── commands/
│   ├── menu.js
│   ├── ping.js
│   ├── alive.js
│   ├── owner.js
│   ├── vv.js
│   ├── autoreacts.js
│   ├── autostatus.js
│   ├── antidelete.js
│   ├── anticall.js
│   └── play.js
├── lib/
└── public/
    └── index.html
```

**Rule:** one command = one `.js` file directly inside `commands/`. No individual command folders, no per-command `index.js`, no per-command README.

## 🎮 Commands

| Command | Purpose |
|---|---|
| `.menu` | Show menu |
| `.ping` | Ping response |
| `.alive` | Online status |
| `.owner` | Owner contact |
| `.autoreacts on/off` | Toggle setting |
| `.autostatus on/off` | Toggle setting |
| `.antidelete on/off` | Toggle setting |
| `.anticall on/off` | Toggle call rejection |
| `.vv` | Placeholder for later implementation |
| `.play <name>` | YouTube search link |

## 🔐 Environment

Copy `.env.example` to `.env` if your host supports environment files. Set `PORT`, `PREFIX`, `OWNER_NAME`, `OWNER_NUMBER`, and `DEVELOPER` in the host variables. Never share the `data/auth` session folder publicly.

## ⚠️ Notes

Pairing requires a supported Baileys build, valid deployment, outbound network access and a fresh WhatsApp session. JavaScript syntax can be checked with `npm run check`; live pairing has to be verified on the target host. Some commands are intentionally basic placeholders and can be expanded after the bot connects.

<div align="center">`RAVEN MD BOT` · RANA FURQAN × JOKER RKS</div>
