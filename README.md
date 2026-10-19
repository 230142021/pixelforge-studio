# PixelForge Studio (fictional demo company)

Portfolio site (HTML/CSS/vanilla JS) with an Express backend that forwards the consultation form to a Telegram bot. No database needed: each submission is delivered straight to Telegram, so nothing is stored on the server.

## Structure
```
server.js          Express server, validation, rate limit, Telegram call
package.json       npm start -> node server.js
.env.example       variable names (copy to .env locally)
public/index.html  page   | styles.css | script.js
public/data/projects.json   EDIT THIS to replace sample projects
```

## 1. Run locally
macOS/Linux:
```bash
npm install
cp .env.example .env
npm start
```
Windows PowerShell:
```powershell
npm install
Copy-Item .env.example .env
npm start
```
Edit `.env`, then open http://localhost:3000. Requires Node 18 or newer.

## 2. Create the Telegram bot
1. In Telegram, open **@BotFather**, send `/newbot`, pick a name and a username ending in `bot`.
2. Copy the token it gives you into `TELEGRAM_BOT_TOKEN`. Treat it like a password.
3. Open your new bot and press **Start** (send any message). Bots cannot message you first.
4. Get your chat ID: message **@userinfobot** (it replies with your numeric ID), or open `https://api.telegram.org/bot<TOKEN>/getUpdates` in your own browser after messaging the bot and read `message.chat.id`. Do not share that URL or paste it anywhere public.
5. Put the number in `TELEGRAM_CHAT_ID`.

Test: submit the form on localhost. A message should arrive in Telegram. The form shows success only if Telegram confirms delivery.

## 3. Push to GitHub
Create an empty repository on github.com (no README), then:
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR-USER/pixelforge-studio.git
git push -u origin main
```
Check first that `.env` does not appear in `git status`. **Never commit secrets.** If a token leaks, revoke it in @BotFather (`/revoke`).

## 4. Deploy on Render
1. render.com -> **New +** -> **Web Service** -> connect GitHub -> choose the repo.
2. Settings: Runtime **Node**, Branch `main`, Build Command `npm install`, Start Command `npm start`.
3. **Environment** -> add `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID`. (Do not set `PORT`; Render provides it.)
4. Click **Create Web Service**. When the deploy finishes, your public URL is shown at the top of the service page, like `https://pixelforge-studio.onrender.com`. Render serves it over HTTPS; always share the `https://` link.
5. Free instances sleep when idle, so the first request can take about a minute.
Health check path (optional): `/healthz`.

## 5. Manual test checklist
- Desktop and mobile widths: layout, nav, keyboard Tab order, visible focus, skip link.
- Submit empty form: errors appear, nothing is sent.
- Bad email, short description, no consent: each blocked in the browser; test the server too: `curl -X POST localhost:3000/api/consultation -H "Content-Type: application/json" -d "{}"` returns 400.
- Valid submit: loading state, success message, Telegram message arrives, double-click sends only one.
- Failure: set a wrong token, restart, submit: the form shows an error (HTTP 502), never success.
- Missing env vars: HTTP 503. Send 6 submissions within 15 minutes: the 6th gets 429.

## Troubleshooting
- **Build fails**: confirm `package.json` is at the repo root, Node 18+, Build Command is `npm install`.
- **503 "not configured"**: env vars missing or misspelled in Render; redeploy after saving.
- **502 from Telegram (logs show 401)**: wrong token. **400 "chat not found"**: wrong chat ID, or you never pressed Start on the bot. **403**: bot was blocked.
- **Form errors / 400**: submitted under 3 seconds after load, or honeypot filled; 422: validation failed; 429: rate limited.
- **Blank page on Render**: check Logs; the server must listen on `process.env.PORT` (it does, on 0.0.0.0).

## Replace demo content
Edit `public/data/projects.json` (title, description, tech, `repo`, `demo` URLs; empty URLs show "not set"). Edit team, contact and social links in `public/index.html`. Gallery images are original SVG illustrations; swap in your own licensed images under `public/img/`.
