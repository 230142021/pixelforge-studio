'use strict';
require('dotenv').config();
const path = require('path');
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';
const { TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID } = process.env;

app.set('trust proxy', 1); // Render sits behind a proxy; needed for correct client IPs
app.disable('x-powered-by');
app.use(helmet({
  contentSecurityPolicy: { directives: {
    defaultSrc: ["'self'"], imgSrc: ["'self'", 'data:'], scriptSrc: ["'self'"],
    styleSrc: ["'self'"], connectSrc: ["'self'"], objectSrc: ["'none'"],
    frameAncestors: ["'none'"], upgradeInsecureRequests: null
  } }
}));
app.use(express.json({ limit: '10kb' }));
app.use(express.static(path.join(__dirname, 'public'), { maxAge: '1h' }));

const PROJECT_TYPES = ['Game design', '2D game', '3D game', 'Browser game', 'Multiplayer prototype', 'VR / interactive experience', 'Other'];
const BUDGETS = ['', 'Under $5,000', '$5,000 - $15,000', '$15,000 - $50,000', '$50,000+', 'Not sure yet'];
const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]+\.[^\s@]{2,}$/;
const str = (v) => (typeof v === 'string' ? v.trim() : '');

function validate(b) {
  const d = {
    name: str(b.name), email: str(b.email), contact: str(b.contact),
    projectType: str(b.projectType), budget: str(b.budget),
    timeline: str(b.timeline), message: str(b.message), consent: b.consent === true
  };
  const e = {};
  if (d.name.length < 2 || d.name.length > 100) e.name = 'Enter your name (2-100 characters).';
  if (!EMAIL_RE.test(d.email) || d.email.length > 150) e.email = 'Enter a valid email address.';
  if (d.contact.length > 100) e.contact = 'Keep this under 100 characters.';
  if (!PROJECT_TYPES.includes(d.projectType)) e.projectType = 'Choose a project type.';
  if (!BUDGETS.includes(d.budget)) e.budget = 'Choose a listed budget.';
  if (d.timeline.length > 100) e.timeline = 'Keep this under 100 characters.';
  if (d.message.length < 20 || d.message.length > 2000) e.message = 'Describe your project in 20-2000 characters.';
  if (!d.consent) e.consent = 'Consent is required to send your request.';
  return { d, e };
}

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 5, standardHeaders: true, legacyHeaders: false,
  message: { ok: false, error: 'Too many requests. Try again in a few minutes.' }
});

// Telegram plain text (no parse_mode), so user input can't inject markup.
const clean = (s) => s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');

app.post('/api/consultation', limiter, async (req, res) => {
  const body = req.body || {};
  // Spam: honeypot filled, or submitted faster than 3s after page load.
  const started = Number(body.startedAt);
  if (str(body.website) || !started || Date.now() - started < 3000) {
    return res.status(400).json({ ok: false, error: 'Submission rejected. Please try again.' });
  }
  const { d, e } = validate(body);
  if (Object.keys(e).length) return res.status(422).json({ ok: false, error: 'Please fix the highlighted fields.', fields: e });

  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.error('Telegram env vars missing');
    return res.status(503).json({ ok: false, error: 'Messaging is not configured on the server yet.' });
  }

  const text = clean([
    'New consultation request - PixelForge Studio',
    `Time (UTC): ${new Date().toISOString()}`, '',
    `Name: ${d.name}`, `Email: ${d.email}`,
    `Other contact: ${d.contact || '-'}`, `Project type: ${d.projectType}`,
    `Budget: ${d.budget || '-'}`, `Timeline: ${d.timeline || '-'}`, '',
    'Description:', d.message, '', 'Consent to process data: yes'
  ].join('\n')).slice(0, 4000);

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10000);
  try {
    const r = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text, disable_web_page_preview: true }),
      signal: ctrl.signal
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.ok) {
      console.error('Telegram error', r.status, j.error_code, j.description); // no secrets, no user data
      return res.status(502).json({ ok: false, error: 'Could not deliver your request. Please try again later.' });
    }
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Telegram request failed:', err.name);
    return res.status(err.name === 'AbortError' ? 504 : 502).json({ ok: false, error: 'Could not reach the messaging service. Please try again later.' });
  } finally { clearTimeout(timer); }
});

app.get('/healthz', (_req, res) => res.json({ ok: true }));
app.get('/', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.use('/api', (_req, res) => res.status(404).json({ ok: false, error: 'Not found' }));
app.use((err, _req, res, _next) => {
  if (err.type === 'entity.parse.failed' || err.type === 'entity.too.large') return res.status(400).json({ ok: false, error: 'Invalid request body.' });
  console.error('Unhandled error:', err.message);
  res.status(500).json({ ok: false, error: 'Server error.' });
});

app.listen(PORT, HOST, () => console.log(`PixelForge listening on ${HOST}:${PORT}`));
