const { normalizePhone } = require('./utils');

let client = null;
let ready = false;

function enabled() {
  return String(process.env.WHATSAPP_PROVIDER || '').toLowerCase() === 'webjs';
}

function allowedCustomer(phone) {
  const configured = normalizePhone(
    process.env.WHATSAPP_TEST_CUSTOMER_NUMBER || '',
  );

  return !configured || normalizePhone(phone) === configured;
}

function jidToPhone(jid) {
  return normalizePhone(String(jid || '').split('@')[0]);
}

function interactiveToText(payload) {
  if (payload.type !== 'interactive') {
    return payload.text?.body || '';
  }

  const interactive = payload.interactive || {};

  const lines = [
    interactive.header?.text,
    interactive.body?.text,
  ].filter(Boolean);

  if (interactive.type === 'button') {
    const buttons = interactive.action?.buttons || [];

    if (buttons.length) {
      lines.push(
        '',
        ...buttons.map(
          (button) =>
            `• ${
              button.reply?.title || button.reply?.id
            } — reply: ${button.reply?.id}`,
        ),
      );
    }
  } else if (interactive.type === 'list') {
    let number = 1;

    for (const section of interactive.action?.sections || []) {
      if (section.title) {
        lines.push('', `*${section.title}*`);
      }

      for (const row of section.rows || []) {
        lines.push(
          `${number}. ${row.title}${
            row.description ? ` — ${row.description}` : ''
          }`,
        );

        number += 1;
      }
    }

    lines.push('', 'Reply with the option number.');
  }

  return lines.join('\n').trim();
}

async function send(payload) {
  if (!client || !ready) {
    throw new Error(
      'Local WhatsApp Web client is not ready. Scan the QR code first.',
    );
  }

  const phone = normalizePhone(payload.to);

  if (!allowedCustomer(phone)) {
    throw new Error(
      `Blocked local WhatsApp message to unapproved test number ${phone}`,
    );
  }

  const body = interactiveToText(payload);

  if (!body) {
    throw new Error(
      `Unsupported local WhatsApp payload type: ${payload.type}`,
    );
  }

  /*
   * whatsapp-web.js normally accepts:
   *
   *   919120658081@c.us
   *
   * for sending to an Indian number.
   */
  const chatId = `91${phone}@c.us`;

  console.log(
    `[BusGo WhatsApp Local] OUT +91${phone}: ${body.replace(/\n/g, ' | ')}`,
  );

  const result = await client.sendMessage(chatId, body);

  return {
    messages: [
      {
        id:
          result?.id?._serialized ||
          `webjs-${Date.now()}`,
      },
    ],
  };
}

/**
 * Resolve the actual sender phone number.
 *
 * Older WhatsApp Web sessions usually expose:
 *
 *   919120658081@c.us
 *
 * Newer multi-device sessions may expose:
 *
 *   123456789012345@lid
 *
 * In the @lid case we must inspect the contact object to find
 * the real phone number.
 */
async function resolveSenderPhone(message) {
  let phone = jidToPhone(message.from);

  /*
   * Already received a normal Indian 10-digit number after normalization.
   */
  if (/^[6-9]\d{9}$/.test(phone)) {
    return phone;
  }

  try {
    const contact = await message.getContact();

    console.log(
      '[BusGo WhatsApp Local] CONTACT:',
      JSON.stringify(
        {
          number: contact?.number,
          idUser: contact?.id?.user,
          serialized: contact?.id?._serialized,
          pushname: contact?.pushname,
          name: contact?.name,
        },
        null,
        2,
      ),
    );

    const candidates = [
      contact?.number,
      contact?.id?.user,
      contact?.id?._serialized,
      message.author,
      message.from,
    ];

    for (const candidate of candidates) {
      const normalized = jidToPhone(candidate);

      if (/^[6-9]\d{9}$/.test(normalized)) {
        return normalized;
      }
    }
  } catch (error) {
    console.warn(
      '[BusGo WhatsApp Local] Could not resolve contact:',
      error.message,
    );
  }

  return phone;
}

async function start() {
  if (!enabled()) {
    console.log(
      '[BusGo WhatsApp Local] Disabled because WHATSAPP_PROVIDER is not webjs.',
    );

    return;
  }

  let Client;
  let LocalAuth;
  let qrcode;

  try {
    ({
      Client,
      LocalAuth,
    } = require('whatsapp-web.js'));

    qrcode = require('qrcode-terminal');
  } catch (error) {
    throw new Error(
      'Local WhatsApp Web dependencies are missing. ' +
        'Run: npm --prefix backend/services/whatsapp-service install',
    );
  }

  const conversation = require('./conversation');

  client = new Client({
    authStrategy: new LocalAuth({
      clientId:
        process.env.WHATSAPP_WEBJS_CLIENT_ID ||
        'busgo-local-test',

      dataPath:
        process.env.WHATSAPP_WEBJS_AUTH_PATH ||
        '.wwebjs_auth',
    }),

    puppeteer: {
      headless: true,

      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
    },
  });

  client.on('qr', (qr) => {
    console.log('');
    console.log(
      '[BusGo WhatsApp Local] Scan this QR using the WhatsApp account that will act as the BUSGO TEST SENDER.',
    );

    console.log(
      '[BusGo WhatsApp Local] WhatsApp > Linked devices > Link a device',
    );

    console.log('');

    qrcode.generate(qr, {
      small: true,
    });
  });

  client.on('authenticated', () => {
    console.log(
      '[BusGo WhatsApp Local] WhatsApp Web authenticated successfully.',
    );
  });

  client.on('auth_failure', (message) => {
    ready = false;

    console.error(
      '[BusGo WhatsApp Local] Authentication failure:',
      message,
    );
  });

  client.on('ready', () => {
    ready = true;

    console.log('');
    console.log(
      '[BusGo WhatsApp Local] READY — no Meta webhook is required.',
    );

    const customer = normalizePhone(
      process.env.WHATSAPP_TEST_CUSTOMER_NUMBER || '',
    );

    if (customer) {
      console.log(
        `[BusGo WhatsApp Local] Only test customer +91${customer} is allowed.`,
      );
    }

    console.log(
      '[BusGo WhatsApp Local] Send HI from the allowed customer number now.',
    );

    console.log('');
  });

  client.on('loading_screen', (percent, message) => {
    console.log(
      `[BusGo WhatsApp Local] Loading ${percent}% - ${message}`,
    );
  });

  client.on('change_state', (state) => {
    console.log(
      '[BusGo WhatsApp Local] WhatsApp state:',
      state,
    );
  });

  client.on('disconnected', (reason) => {
    ready = false;

    console.warn(
      '[BusGo WhatsApp Local] disconnected:',
      reason,
    );
  });

  client.on('message_create', (message) => {
    /*
     * Diagnostic event.
     *
     * This fires for both incoming and outgoing messages and helps us
     * determine whether whatsapp-web.js is seeing the message at all.
     */
    console.log(
      '[BusGo WhatsApp Local] MESSAGE_CREATE:',
      JSON.stringify({
        from: message.from,
        to: message.to,
        fromMe: message.fromMe,
        type: message.type,
        body: message.body,
      }),
    );
  });

  client.on('message', async (message) => {
    try {
      console.log('');
      console.log(
        '[BusGo WhatsApp Local] RAW MESSAGE:',
        JSON.stringify(
          {
            from: message.from,
            to: message.to,
            author: message.author,
            fromMe: message.fromMe,
            type: message.type,
            body: message.body,
          },
          null,
          2,
        ),
      );

      /*
       * Ignore messages sent by the BusGo linked account itself.
       */
      if (message.fromMe) {
        console.log(
          '[BusGo WhatsApp Local] Ignored own outgoing message.',
        );

        return;
      }

      /*
       * Ignore WhatsApp Status messages.
       */
      if (message.from === 'status@broadcast') {
        console.log(
          '[BusGo WhatsApp Local] Ignored status broadcast.',
        );

        return;
      }

      /*
       * Ignore groups for this BusGo customer-booking test.
       */
      if (String(message.from).endsWith('@g.us')) {
        console.log(
          '[BusGo WhatsApp Local] Ignored group message.',
        );

        return;
      }

      const phone = await resolveSenderPhone(message);

      console.log(
        `[BusGo WhatsApp Local] Resolved sender phone: ${phone}`,
      );

      if (!/^[6-9]\d{9}$/.test(phone)) {
        console.warn(
          `[BusGo WhatsApp Local] Could not resolve valid Indian phone number from ${message.from}`,
        );

        return;
      }

      if (!allowedCustomer(phone)) {
        console.warn(
          `[BusGo WhatsApp Local] Ignored message from unapproved number +91${phone}`,
        );

        return;
      }

      const text = String(
        message.body || '',
      ).trim();

      if (!text) {
        console.log(
          '[BusGo WhatsApp Local] Empty message ignored.',
        );

        return;
      }

      console.log(
        `[BusGo WhatsApp Local] IN +91${phone}: ${text}`,
      );

      /*
       * IMPORTANT:
       *
       * This calls the EXISTING BusGo WhatsApp conversation engine.
       * The local adapter only replaces Meta transport.
       */
      await conversation.handle(
        phone,
        text,
      );

      console.log(
        `[BusGo WhatsApp Local] Conversation processed successfully for +91${phone}`,
      );
    } catch (error) {
      console.error(
        '[BusGo WhatsApp Local] conversation error:',
        error,
      );

      try {
        await message.reply(
          'Sorry, BusGo could not continue the conversation.\n\n' +
            `Error: ${error.message}\n\n` +
            'Send RESET to start again.',
        );
      } catch (replyError) {
        console.error(
          '[BusGo WhatsApp Local] Could not send error reply:',
          replyError,
        );
      }
    }
  });

  console.log(
    '[BusGo WhatsApp Local] Starting WhatsApp Web client...',
  );

  await client.initialize();
}

async function stop() {
  ready = false;

  if (client) {
    try {
      await client.destroy();
    } catch (error) {
      console.warn(
        '[BusGo WhatsApp Local] Error destroying client:',
        error.message,
      );
    }
  }

  client = null;
}

module.exports = {
  enabled,
  start,
  stop,
  send,
};