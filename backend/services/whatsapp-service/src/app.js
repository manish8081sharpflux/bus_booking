const express = require('express');
const crypto = require('crypto');
const db = require('./infrastructure/db');
const meta = require('./services/meta');
const conversation = require('./services/conversation');
const rateLimit = require('../../shared/middleware/rateLimit');
const requestTimeout = require('../../shared/middleware/requestTimeout');
const productionSecurity = require('../../shared/middleware/productionSecurity');

const app = express();
app.set('trust proxy', 1);
app.use(requestTimeout(15000));
app.use(productionSecurity());
app.use(rateLimit({ windowMs: 60_000, max: Number(process.env.WHATSAPP_WEBHOOK_RATE_LIMIT_PER_MINUTE || 1200), skip: (req) => req.path === '/health' }));
app.use(express.json({ limit: '1mb', verify: (req, _res, buf) => { req.rawBody = Buffer.from(buf); } }));

app.get('/health', (_req, res) => res.json({ service: 'whatsapp-service', status: 'ok' }));

app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) return res.status(200).send(challenge);
  return res.sendStatus(403);
});

function extractMessageText(message) {
  if (message.type === 'text') return message.text?.body || '';
  if (message.type === 'interactive') return message.interactive?.button_reply?.id || message.interactive?.list_reply?.id || '';
  if (message.type === 'button') return message.button?.payload || message.button?.text || '';
  return '';
}

app.post('/webhook', async (req, res) => {
  try {
    if (!meta.verifySignature(req.rawBody || Buffer.from(''), req.get('x-hub-signature-256'))) return res.sendStatus(401);
    res.sendStatus(200);
    const entries = req.body?.entry || [];
    for (const entry of entries) for (const change of entry.changes || []) {
      const value = change.value || {};
      for (const delivery of value.statuses || []) await meta.updateDeliveryStatus(delivery);
      for (const message of value.messages || []) {
        const messageId = message.id;
        const from = message.from;
        if (!messageId || !from) continue;
        const inserted = await db.query(`INSERT INTO whatsapp_message_events(message_id,phone,direction,message_type,payload,status) VALUES($1,$2,'INBOUND',$3,$4::jsonb,'RECEIVED') ON CONFLICT(message_id) DO NOTHING RETURNING message_id`, [messageId, from, message.type || 'unknown', JSON.stringify(message)]);
        if (!inserted.rowCount) continue;
        const text = extractMessageText(message);
        if (!text) { await meta.text(from, 'For now I can help with text-based bus booking. Send BOOK to begin.'); continue; }
        conversation.handle(from, text).catch((error) => {
          console.error('WhatsApp conversation error', error);
          meta.text(from, `Sorry, I couldn't continue that step: ${error.message}\nSend RESET to start again.`).catch(console.error);
        });
      }
    }
  } catch (error) { console.error('WhatsApp webhook error', error); }
});

module.exports = app;
