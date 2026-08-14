async function sendWebhook(url,payload){const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});const b=await r.text();if(!r.ok)throw new Error(`Provider HTTP ${r.status}: ${b.slice(0,200)}`);return {status:r.status,body:b.slice(0,1000)}}
const digits=(v)=>String(v||'').replace(/\D/g,'');
const waNumber=(v)=>{const n=digits(v);if(n.length===10)return `91${n}`;return n};

async function sendMetaWhatsApp({to,templateKey,payload}){
  const token=process.env.WHATSAPP_ACCESS_TOKEN, phoneId=process.env.WHATSAPP_PHONE_NUMBER_ID, version=process.env.WHATSAPP_GRAPH_API_VERSION||'v23.0';
  if(!token||!phoneId) throw new Error('WHATSAPP_ACCESS_TOKEN / WHATSAPP_PHONE_NUMBER_ID are not configured');
  const bodyText=templateKey==='BOOKING_CONFIRMED'
    ? `✅ BusGo booking confirmed\nPNR: ${payload?.bookingReference||'-'}\n\nOpen BusGo to view your full ticket.`
    : templateKey==='BOOKING_RESCHEDULED'
      ? `🚌 Your BusGo journey was rescheduled.\nPNR: ${payload?.bookingReference||'-'}\nCheck BusGo for the updated trip details.`
      : templateKey==='TRIP_CANCELLED'
        ? `⚠️ Your BusGo trip was cancelled.\nPNR: ${payload?.bookingReference||'-'}\nRefund updates will be shared when available.`
        : `BusGo update: ${templateKey}\n${JSON.stringify(payload||{})}`;
  const r=await fetch(`https://graph.facebook.com/${version}/${phoneId}/messages`,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({messaging_product:'whatsapp',to:waNumber(to),type:'text',text:{body:bodyText,preview_url:false}})});
  const b=await r.json().catch(()=>({})); if(!r.ok) throw new Error(b?.error?.message||`Meta WhatsApp HTTP ${r.status}`); return {provider:'META',id:b?.messages?.[0]?.id||null,response:b};
}

async function send({channel,to,templateKey,payload}){
  const provider=(process.env[`${channel}_PROVIDER`]||'CONSOLE').toUpperCase();
  if(provider==='CONSOLE'){console.log(`[notification:${channel}]`,to,templateKey,payload);return {provider:'CONSOLE',id:`console-${Date.now()}`}}
  if(channel==='WHATSAPP'&&provider==='META') return sendMetaWhatsApp({to,templateKey,payload});
  const url=process.env[`${channel}_WEBHOOK_URL`]; if(!url)throw new Error(`${channel}_WEBHOOK_URL is not configured`);
  const response=await sendWebhook(url,{channel,to,templateKey,payload}); return {provider,response,id:`webhook-${Date.now()}`};
}
module.exports={send};
