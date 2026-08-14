const crypto = require('crypto');
const db = require('../infrastructure/db');

const version = process.env.WHATSAPP_GRAPH_API_VERSION || 'v23.0';
const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

function verifySignature(rawBody, signature) {
  const secret = process.env.WHATSAPP_APP_SECRET;
  if (!secret) return process.env.NODE_ENV !== 'production';
  if (!signature || !signature.startsWith('sha256=')) return false;
  const expected = `sha256=${crypto.createHmac('sha256', secret).update(rawBody).digest('hex')}`;
  try { return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature)); } catch { return false; }
}

async function logOutbound(to, type, payload, providerId, status='SENT') {
  const id = providerId || `console-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
  await db.query(`INSERT INTO whatsapp_message_events(message_id,phone,direction,message_type,payload,status,provider_status,updated_at)
    VALUES($1,$2,'OUTBOUND',$3,$4::jsonb,$5,$5,NOW()) ON CONFLICT(message_id) DO NOTHING`,
    [id, String(to||''), type, JSON.stringify(payload||{}), status]).catch(()=>{});
  return id;
}

async function send(payload) {
  if (String(process.env.WHATSAPP_PROVIDER || '').toLowerCase() === 'webjs') {
    const localWeb = require('./local-web');
    const body = await localWeb.send(payload);
    const id = body?.messages?.[0]?.id;
    await logOutbound(payload.to, payload.type || 'unknown', payload, id, 'SENT');
    return body;
  }
  if (!phoneNumberId || !accessToken) {
    console.log('[whatsapp:console]', JSON.stringify(payload));
    const id = await logOutbound(payload.to, payload.type || 'unknown', payload, null, 'SENT');
    return { messages: [{ id }] };
  }
  const response = await fetch(`https://graph.facebook.com/${version}/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', ...payload }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body?.error?.message || `WhatsApp API ${response.status}`);
  const id = body?.messages?.[0]?.id;
  await logOutbound(payload.to, payload.type || 'unknown', payload, id, 'SENT');
  return body;
}

async function text(to, body) {
  return send({ to, type: 'text', text: { body: String(body).slice(0, 4096), preview_url: true } });
}

async function buttons(to, body, buttons) {
  const safe = (buttons || []).slice(0, 3);
  if (!safe.length) return text(to, body);
  return send({
    to,
    type: 'interactive',
    interactive: {
      type: 'button',
      body: { text: String(body).slice(0, 1024) },
      action: { buttons: safe.map((b) => ({ type: 'reply', reply: { id: String(b.id).slice(0, 256), title: String(b.title).slice(0, 20) } })) },
    },
  });
}

async function list(to, { header, body, button='Choose', sections=[] }) {
  const normalized = sections.slice(0,10).map((section) => ({
    title: String(section.title || 'Options').slice(0,24),
    rows: (section.rows || []).slice(0,10).map((row) => ({
      id: String(row.id).slice(0,200),
      title: String(row.title).slice(0,24),
      ...(row.description ? { description: String(row.description).slice(0,72) } : {}),
    })),
  })).filter((s)=>s.rows.length);
  if (!normalized.length) return text(to, body);
  return send({to,type:'interactive',interactive:{type:'list',...(header?{header:{type:'text',text:String(header).slice(0,60)}}:{}),body:{text:String(body).slice(0,1024)},action:{button:String(button).slice(0,20),sections:normalized}}});
}

async function template(to, name, { language='en', bodyParameters=[] }={}) {
  return send({to,type:'template',template:{name,language:{code:language},...(bodyParameters.length?{components:[{type:'body',parameters:bodyParameters.map((x)=>({type:'text',text:String(x)}))}]}:{})}});
}

async function updateDeliveryStatus(status) {
  const id = status?.id;
  if (!id) return;
  const mapped = String(status.status || '').toUpperCase();
  const ts = status.timestamp ? new Date(Number(status.timestamp) * 1000) : new Date();
  const err = status.errors?.[0];
  await db.query(`UPDATE whatsapp_message_events SET provider_status=$2,status=$2,provider_timestamp=$3,error_code=$4,error_message=$5,updated_at=NOW() WHERE message_id=$1`,
    [id,mapped,ts,err?.code?String(err.code):null,err?.title||err?.message||null]).catch(()=>{});
}

module.exports = { text, buttons, list, template, verifySignature, updateDeliveryStatus };
