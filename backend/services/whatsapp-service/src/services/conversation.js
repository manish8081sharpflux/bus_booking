const crypto = require('crypto');
const db = require('../infrastructure/db');
const meta = require('./meta');
const bookingApi = require('./booking-api');
const { normalizePhone } = require('./utils');

const minutes = Number(process.env.WHATSAPP_SESSION_MINUTES || 30);
const paymentBase = (
  process.env.WHATSAPP_PAYMENT_BASE_URL || 'http://localhost:5173/whatsapp-checkout'
).replace(/\/$/, '');
const customerAppBase = (
  process.env.WHATSAPP_CUSTOMER_APP_BASE_URL || 'http://localhost:5173'
).replace(/\/$/, '');
const trackingBase = (process.env.WHATSAPP_TRACK_BASE_URL || `${customerAppBase}/track`).replace(
  /\/$/,
  '',
);
const money = (n) => `₹${Number(n || 0).toFixed(0)}`;
const fmt = (d) =>
  new Date(d).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

const copy = {
  en: {
    welcome: '🚌 Welcome to BusGo on WhatsApp. What would you like to do?',
    help: 'Choose an option below, or type BOOK, MY BOOKINGS, STATUS <PNR>, TRACK <PNR>, HELP or RESET.',
    from: '📍 Where are you travelling from?\nExample: Pune',
    to: '📍 Where are you travelling to?',
    date: '📅 Travel date? Send as YYYY-MM-DD\nExample: 2026-08-20',
  },
  hi: {
    welcome: '🚌 BusGo WhatsApp में आपका स्वागत है। आप क्या करना चाहते हैं?',
    help: 'नीचे विकल्प चुनें, या BOOK, MY BOOKINGS, STATUS <PNR>, TRACK <PNR>, HELP या RESET लिखें।',
    from: '📍 आप कहाँ से यात्रा करेंगे?\nउदाहरण: Pune',
    to: '📍 आप कहाँ जाना चाहते हैं?',
    date: '📅 यात्रा की तारीख YYYY-MM-DD में भेजें।\nउदाहरण: 2026-08-20',
  },
};

async function rawSession(phone) {
  const { rows } = await db.query(`SELECT * FROM whatsapp_booking_sessions WHERE phone=$1`, [
    phone,
  ]);
  return rows[0] || null;
}
async function session(phone) {
  const row = await rawSession(phone);
  if (!row) return { phone, state: 'IDLE', context: {}, language: 'en' };
  if (new Date(row.expires_at) <= new Date() && row.state !== 'IDLE')
    return { ...row, expired: true };
  return row;
}
async function save(phone, state, context = {}, language = 'en') {
  await db.query(
    `INSERT INTO whatsapp_booking_sessions(phone,state,context,language,last_message_at,expires_at,updated_at)
    VALUES($1,$2,$3::jsonb,$4,NOW(),NOW()+($5||' minutes')::interval,NOW())
    ON CONFLICT(phone) DO UPDATE SET previous_state=whatsapp_booking_sessions.state,previous_context=whatsapp_booking_sessions.context,state=EXCLUDED.state,context=EXCLUDED.context,language=EXCLUDED.language,last_message_at=NOW(),expires_at=EXCLUDED.expires_at,updated_at=NOW()`,
    [phone, state, JSON.stringify(context), language, String(minutes)],
  );
}
async function reset(phone, language = 'en') {
  await save(phone, 'IDLE', {}, language);
}
async function customer(phone) {
  const { rows } = await db.query(
    `SELECT id,full_name,mobile,email FROM platform_users WHERE RIGHT(regexp_replace(mobile,'\\D','','g'),10)=$1 LIMIT 1`,
    [phone],
  );
  return rows[0] || null;
}
async function issueCheckout(bookingId, phone) {
  const token = crypto.randomBytes(32).toString('hex');
  const hash = crypto.createHash('sha256').update(token).digest('hex');
  await db.query(
    `INSERT INTO whatsapp_checkout_tokens(token_hash,booking_id,phone,expires_at) VALUES($1,$2::uuid,$3,NOW()+INTERVAL '10 minutes')`,
    [hash, bookingId, phone],
  );
  return `${paymentBase}/${token}`;
}
function extractChoice(text, prefix = '') {
  const m = String(text || '')
    .trim()
    .match(new RegExp(`^(?:${prefix})?(\\d+)$`, 'i'));
  return m ? Number(m[1]) : null;
}
function resolveChoiceFromList(text, choices = [], prefix = '') {
  const raw = String(text || '').trim();
  if (!raw) return null;
  const idx = extractChoice(raw, prefix);
  if (idx !== null && idx >= 1 && idx <= choices.length) return choices[idx - 1];

  const target = raw.toLowerCase();
  return (
    choices.find((choice) => {
      const candidates = [choice.name, choice.location_name, choice.city]
        .filter(Boolean)
        .map((value) => String(value).trim().toLowerCase());
      return candidates.includes(target);
    }) || null
  );
}

async function menu(to, language = 'en') {
  const t = copy[language] || copy.en;
  return meta.buttons(to, t.welcome, [
    { id: 'BOOK', title: language === 'hi' ? 'बस बुक करें' : 'Book a bus' },
    { id: 'MYBOOKING', title: language === 'hi' ? 'मेरी बुकिंग' : 'My bookings' },
    { id: 'HELP', title: language === 'hi' ? 'मदद' : 'Help' },
  ]);
}
async function status(phone, reference) {
  const { rows } = await db.query(
    `SELECT b.id,b.booking_reference,b.status,b.total_amount,b.currency,t.id trip_id,t.departure_at,r.source_city,r.destination_city
    FROM bookings b JOIN platform_users u ON u.id=b.customer_id JOIN trips t ON t.id=b.trip_id JOIN routes r ON r.id=t.route_id
    WHERE UPPER(b.booking_reference)=UPPER($1) AND RIGHT(regexp_replace(u.mobile,'\\D','','g'),10)=$2`,
    [reference, phone],
  );
  if (!rows[0])
    return meta.text(`91${phone}`, 'I could not find that booking for this WhatsApp number.');
  const b = rows[0];
  return meta.buttons(
    `91${phone}`,
    `🎫 ${b.booking_reference}\n${b.source_city} → ${b.destination_city}\nDeparture: ${fmt(b.departure_at)}\nStatus: ${b.status}\nAmount: ${money(b.total_amount)}`,
    [
      { id: `BOOKING_${b.id}`, title: 'Manage booking' },
      { id: `TRACK_${b.id}`, title: 'Track bus' },
      { id: 'MENU', title: 'Main menu' },
    ],
  );
}
async function myBookings(phone, language = 'en') {
  const bookings = await bookingApi.myBookings(phone);
  if (!bookings.length)
    return meta.buttons(`91${phone}`, 'No bookings were found for this WhatsApp number.', [
      { id: 'BOOK', title: 'Book a bus' },
      { id: 'MENU', title: 'Main menu' },
    ]);
  return meta.list(`91${phone}`, {
    header: 'My BusGo bookings',
    body: 'Choose a booking to view or manage.',
    button: 'View bookings',
    sections: [
      {
        title: 'Recent bookings',
        rows: bookings
          .slice(0, 10)
          .map((b) => ({
            id: `BOOKING_${b.id}`,
            title: String(b.booking_reference).slice(0, 24),
            description: `${b.source_city} → ${b.destination_city} • ${b.status}`,
          })),
      },
    ],
  });
}
async function bookingActions(phone, id) {
  const bookings = await bookingApi.myBookings(phone);
  const b = bookings.find((x) => x.id === id);
  const to = `91${phone}`;
  if (!b) return meta.text(to, 'That booking was not found for this WhatsApp number.');
  await save(phone, 'BOOKING_ACTION', { booking: b }, (await session(phone)).language || 'en');
  const buttons = [
    { id: `TRACK_${id}`, title: 'Track' },
    { id: `CANCEL_${id}`, title: 'Cancel' },
    { id: `MORE_${id}`, title: 'More options' },
  ];
  return meta.buttons(
    to,
    `🎫 ${b.booking_reference}\n${b.source_city} → ${b.destination_city}\n${b.operator}\nSeats: ${b.seats || '-'}\nDeparture: ${fmt(b.departure_at)}\nStatus: ${b.status}\nTotal: ${money(b.total_amount)}`,
    buttons,
  );
}
async function help(to, lang = 'en') {
  return meta.buttons(to, (copy[lang] || copy.en).help, [
    { id: 'BOOK', title: 'Book a bus' },
    { id: 'MYBOOKING', title: 'My bookings' },
    { id: 'AGENT', title: 'Talk to support' },
  ]);
}

async function handle(phoneRaw, textRaw) {
  const phone = normalizePhone(phoneRaw),
    to = `91${phone}`,
    text = String(textRaw || '').trim(),
    upper = text.toUpperCase();
  if (!/^[6-9]\d{9}$/.test(phone)) return;
  let s = await session(phone);
  let lang = s.language || 'en';

  if (upper === 'HINDI' || upper === 'HI_LANGUAGE') {
    lang = 'hi';
    await save(phone, 'IDLE', {}, lang);
    return menu(to, lang);
  }
  if (upper === 'ENGLISH' || upper === 'EN_LANGUAGE') {
    lang = 'en';
    await save(phone, 'IDLE', {}, lang);
    return menu(to, lang);
  }

  if (s.expired && !['RESET', 'MENU', 'HI', 'HELLO', 'BOOK'].includes(upper)) {
    await save(phone, 'ASK_RESUME', { oldState: s.state, oldContext: s.context || {} }, lang);
    return meta.buttons(
      to,
      'Your previous booking session expired. Would you like to continue from where you stopped?',
      [
        { id: 'RESUME_SESSION', title: 'Continue' },
        { id: 'RESET', title: 'Start over' },
      ],
    );
  }
  if (s.state === 'ASK_RESUME') {
    if (upper === 'RESUME_SESSION' || upper === 'CONTINUE') {
      const old = s.context || {};
      await save(phone, old.oldState || 'IDLE', old.oldContext || {}, lang);
      return meta.text(to, 'Session restored. Please repeat your last answer to continue.');
    }
    await reset(phone, lang);
    return menu(to, lang);
  }

  if (upper === 'RESET' || upper === 'MENU' || upper === 'HI' || upper === 'HELLO') {
    await reset(phone, lang);
    return menu(to, lang);
  }
  if (upper === 'HELP') return help(to, lang);
  if (upper === 'LANGUAGE')
    return meta.buttons(to, 'Choose your language / भाषा चुनें', [
      { id: 'ENGLISH', title: 'English' },
      { id: 'HINDI', title: 'हिन्दी' },
    ]);
  if (upper === 'MY BOOKINGS' || upper === 'MYBOOKINGS' || upper === 'MYBOOKING')
    return myBookings(phone, lang);
  if (upper.startsWith('STATUS ')) return status(phone, text.slice(7).trim());
  if (upper.startsWith('TRACK ')) {
    const pnr = text.slice(6).trim();
    const bookings = await bookingApi.myBookings(phone);
    const b = bookings.find((x) => String(x.booking_reference).toUpperCase() === pnr.toUpperCase());
    if (!b) return meta.text(to, 'Booking not found.');
    return meta.text(
      to,
      `🛰️ Track ${b.booking_reference}:\n${trackingBase}/${encodeURIComponent(b.booking_reference)}`,
    );
  }
  if (upper.startsWith('BOOKING_')) return bookingActions(phone, text.slice(8));
  if (upper.startsWith('TRACK_')) {
    const id = text.slice(6);
    const bookings = await bookingApi.myBookings(phone);
    const b = bookings.find((x) => x.id === id);
    if (!b) return meta.text(to, 'Booking not found.');
    return meta.text(
      to,
      `🛰️ Live tracking for ${b.booking_reference}:\n${trackingBase}/${encodeURIComponent(b.booking_reference)}`,
    );
  }
  if (upper.startsWith('MORE_')) {
    const id = text.slice(5);
    return meta.buttons(to, 'More booking options', [
      { id: `RESCHEDULE_${id}`, title: 'Reschedule' },
      { id: `SUPPORT_${id}`, title: 'Support' },
      { id: 'MYBOOKING', title: 'My bookings' },
    ]);
  }
  if (upper.startsWith('RESCHEDULE_')) {
    const id = text.slice(11);
    const bookings = await bookingApi.myBookings(phone);
    const b = bookings.find((x) => x.id === id);
    if (!b) return meta.text(to, 'Booking not found.');
    return meta.text(
      to,
      `🔁 Reschedule ${b.booking_reference}\nFor secure seat and fare selection, continue here:\n${customerAppBase}/bookings/${encodeURIComponent(id)}/reschedule\n\nSign in with the same mobile number.`,
    );
  }
  if (upper.startsWith('SUPPORT_')) {
    const id = text.slice(8);
    const ticket = await bookingApi.support(id, phone, 'Customer requested support from WhatsApp');
    await db.query(
      `INSERT INTO whatsapp_support_handoffs(phone,booking_id,booking_reference,reason,conversation_context) SELECT $1,$2::uuid,b.booking_reference,$3,$4::jsonb FROM bookings b WHERE b.id=$2::uuid`,
      [
        phone,
        id,
        'Customer requested agent handoff',
        JSON.stringify((await session(phone)).context || {}),
      ],
    );
    return meta.text(
      to,
      `🎧 Support request created. Ticket: ${ticket.ticket_number}\nOur team can now see your booking context. We will follow up on this number.`,
    );
  }
  if (upper === 'AGENT') {
    await db.query(
      `INSERT INTO whatsapp_support_handoffs(phone,reason,conversation_context) VALUES($1,$2,$3::jsonb)`,
      [phone, 'General WhatsApp support request', JSON.stringify(s.context || {})],
    );
    return meta.text(
      to,
      '🎧 Your request has been sent to BusGo support. An agent can continue with this WhatsApp number.',
    );
  }
  if (upper.startsWith('CANCEL_')) {
    const id = text.slice(7);
    const q = await bookingApi.cancellationQuote(id, phone);
    await save(phone, 'CONFIRM_CANCEL', { bookingId: id, quote: q }, lang);
    return meta.buttons(
      to,
      `Cancellation quote\nRefund: ${money(q.refundAmount)} (${q.refundPercent}%)\nCancellation fee: ${money(q.cancellationFee)}\nDeparture in about ${q.hoursBeforeDeparture} hour(s).\n\nCancel this booking?`,
      [
        { id: 'CONFIRM_CANCEL', title: 'Yes, cancel' },
        { id: 'MYBOOKING', title: 'Keep booking' },
      ],
    );
  }
  if (s.state === 'CONFIRM_CANCEL' && upper === 'CONFIRM_CANCEL') {
    const result = await bookingApi.cancel(
      s.context.bookingId,
      phone,
      'Customer cancelled through WhatsApp',
    );
    await reset(phone, lang);
    return meta.buttons(
      to,
      `✅ Booking cancelled.\nRefund status: ${result.refund?.status || 'Not required'}${result.refund?.amount ? `\nRefund amount: ${money(result.refund.amount)}` : ''}`,
      [
        { id: 'MYBOOKING', title: 'My bookings' },
        { id: 'BOOK', title: 'Book another' },
      ],
    );
  }

  s = await session(phone);
  let c = s.context || {};
  if (upper === 'BOOK' || s.state === 'IDLE') {
    await save(phone, 'ASK_FROM', {}, lang);
    return meta.text(to, (copy[lang] || copy.en).from);
  }
  if (s.state === 'ASK_FROM') {
    c.from = text;
    await save(phone, 'ASK_TO', c, lang);
    return meta.text(
      to,
      `${lang === 'hi' ? 'से' : 'From'}: ${text}\n\n${(copy[lang] || copy.en).to}`,
    );
  }
  if (s.state === 'ASK_TO') {
    if (text.toLowerCase() === String(c.from || '').toLowerCase())
      return meta.text(to, 'Source and destination must be different.');
    c.to = text;
    await save(phone, 'ASK_DATE', c, lang);
    return meta.text(to, (copy[lang] || copy.en).date);
  }
  if (s.state === 'ASK_DATE') {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(text) || new Date(`${text}T23:59:59`) < new Date())
      return meta.text(to, 'Please send a valid future date in YYYY-MM-DD format.');
    c.date = text;
    const trips = await bookingApi.searchTrips({ from: c.from, to: c.to, date: c.date });
    if (!trips.length)
      return meta.text(
        to,
        `No buses found for ${c.from} → ${c.to} on ${c.date}. Try another date.`,
      );
    c.trips = trips
      .slice(0, 10)
      .map((t) => ({
        id: t.id,
        operator: t.operator,
        bus: t.bus,
        departure_at: t.departure_at,
        starting_fare: t.starting_fare,
        available_seats: t.available_seats,
      }));
    await save(phone, 'SELECT_TRIP', c, lang);
    return meta.list(to, {
      header: `${c.from} → ${c.to}`,
      body: 'Choose a bus. Reply with the option number.',
      button: 'View buses',
      sections: [
        {
          title: 'Available buses',
          rows: c.trips.map((t, i) => ({
            id: `BUS${i + 1}`,
            title: `${i + 1}. ${t.operator}`.slice(0, 24),
            description: `Reply ${i + 1} • ${fmt(t.departure_at)} • ${money(t.starting_fare)} • ${t.available_seats} seats`,
          })),
        },
      ],
    });
  }
  if (s.state === 'SELECT_TRIP') {
    const n = extractChoice(text, 'BUS');
    if (!n || n < 1 || n > c.trips.length)
      return meta.text(to, `Choose a bus from 1 to ${c.trips.length}.`);
    c.trip = c.trips[n - 1];
    const map = await bookingApi.seatMap(c.trip.id),
      available = (map.seats || []).filter((x) => x.status === 'AVAILABLE').slice(0, 40);
    c.seats = available.map((x) => ({ id: x.id, number: x.seat_number, type: x.seat_type }));
    c.boarding = (map.boardingPoints || []).map((x) => ({
      id: x.id,
      name: x.location_name || x.name,
      scheduled_at: x.scheduled_at,
      stop_order: x.stop_order,
    }));
    c.dropping = (map.droppingPoints || []).map((x) => ({
      id: x.id,
      name: x.location_name || x.name,
      scheduled_at: x.scheduled_at,
      stop_order: x.stop_order,
    }));
    await save(phone, 'SELECT_SEATS', c, lang);
    return meta.text(
      to,
      `💺 Available seats\n${available.map((x) => x.seat_number).join(', ')}\n\nReply with seat number(s), comma separated. Example: 5A,5B`,
    );
  }
  if (s.state === 'SELECT_SEATS') {
    const requested = text
      .split(',')
      .map((x) => x.trim().toUpperCase())
      .filter(Boolean);
    if (!requested.length || requested.length > 6)
      return meta.text(to, 'Select between 1 and 6 seats.');
    const selected = requested.map((num) =>
      c.seats.find((x) => String(x.number).toUpperCase() === num),
    );
    if (selected.some((x) => !x))
      return meta.text(to, 'One or more seats are unavailable. Choose from the listed seats.');
    c.selectedSeats = selected;
    await save(phone, 'SELECT_BOARDING', c, lang);
    return meta.list(to, {
      header: 'Boarding point',
      body: 'Where would you like to board? Reply with the option number.',
      button: 'Choose boarding',
      sections: [
        {
          title: 'Boarding points',
          rows: c.boarding.map((x, i) => ({
            id: `BOARD${i + 1}`,
            title: `${i + 1}. ${x.name}`.slice(0, 24),
            description: `Reply ${i + 1}${x.scheduled_at ? ` • ${fmt(x.scheduled_at)}` : ''}`,
          })),
        },
      ],
    });
  }
  if (s.state === 'SELECT_BOARDING') {
    const choice = resolveChoiceFromList(text, c.boarding, 'BOARD');
    if (!choice)
      return meta.text(
        to,
        'Choose a valid boarding point. Reply with the option number or the exact boarding stop name, for example: 1 or Pune',
      );
    c.boardingPoint = choice;
    await save(phone, 'SELECT_DROPPING', c, lang);
    return meta.list(to, {
      header: 'Dropping point',
      body: 'Where would you like to get off? Reply with the option number.',
      button: 'Choose dropping',
      sections: [
        {
          title: 'Dropping points',
          rows: c.dropping.map((x, i) => ({
            id: `DROP${i + 1}`,
            title: `${i + 1}. ${x.name}`.slice(0, 24),
            description: `Reply ${i + 1}${x.scheduled_at ? ` • ${fmt(x.scheduled_at)}` : ''}`,
          })),
        },
      ],
    });
  }
  if (s.state === 'SELECT_DROPPING') {
    const choice = resolveChoiceFromList(text, c.dropping, 'DROP');
    if (!choice)
      return meta.text(
        to,
        'Choose a valid dropping point. Reply with the option number or the exact dropping stop name.',
      );
    if (
      c.boardingPoint &&
      choice.stop_order !== undefined &&
      c.boardingPoint.stop_order !== undefined &&
      choice.stop_order <= c.boardingPoint.stop_order
    ) {
      return meta.text(to, 'Choose a valid dropping point that comes after your boarding point.');
    }
    c.droppingPoint = choice;
    await save(phone, 'ASK_PASSENGERS', c, lang);
    return meta.text(
      to,
      `👤 Send passenger details for ${c.selectedSeats.length} seat(s).\nOne passenger per line:\nName,Age,Gender\nExample: Manish,25,MALE`,
    );
  }
  if (s.state === 'ASK_PASSENGERS') {
    const lines = text
      .split(/\n+/)
      .map((x) => x.trim())
      .filter(Boolean);
    if (lines.length !== c.selectedSeats.length)
      return meta.text(to, `Please send exactly ${c.selectedSeats.length} passenger line(s).`);
    const passengers = lines.map((line, i) => {
      const [fullName, ageRaw, genderRaw] = line.split(',').map((x) => x?.trim());
      return {
        seatId: c.selectedSeats[i].id,
        fullName,
        age: Number(ageRaw),
        gender: String(genderRaw || '').toUpperCase(),
      };
    });
    if (
      passengers.some(
        (p) =>
          !p.fullName ||
          p.fullName.length < 2 ||
          !Number.isInteger(p.age) ||
          p.age < 1 ||
          p.age > 120 ||
          !['MALE', 'FEMALE', 'OTHER'].includes(p.gender),
      )
    )
      return meta.text(to, 'Invalid passenger details. Use Name,Age,Gender.');
    c.passengers = passengers;
    await save(phone, 'ASK_COUPON', c, lang);
    return meta.buttons(to, '🏷️ Do you have a coupon?', [
      { id: 'SKIP', title: 'No coupon' },
      { id: 'ENTER_COUPON', title: 'Enter coupon' },
    ]);
  }
  if (s.state === 'ASK_COUPON') {
    if (upper === 'ENTER_COUPON') {
      await save(phone, 'ENTER_COUPON', c, lang);
      return meta.text(to, 'Send your coupon code.');
    }
    c.couponCode = upper === 'SKIP' ? null : upper;
    const u = await customer(phone);
    const quote = await bookingApi.quote({
      tripId: c.trip.id,
      originStopId: c.boardingPoint.id,
      destinationStopId: c.droppingPoint.id,
      seatIds: c.selectedSeats.map((x) => x.id),
      couponCode: c.couponCode,
      customerId: u?.id || null,
    });
    c.quote = quote;
    await save(phone, 'CONFIRM', c, lang);
    return meta.buttons(
      to,
      `Review booking\n${c.from} → ${c.to}\n${c.trip.operator}\nSeats: ${c.selectedSeats.map((x) => x.number).join(', ')}\nBoarding: ${c.boardingPoint.name}\nDropping: ${c.droppingPoint.name}\nFare: ${money(quote.subtotalAmount)}${quote.discountAmount ? `\nDiscount: -${money(quote.discountAmount)}` : ''}\nTotal: ${money(quote.totalAmount)}\n\nFare locked for 5 minutes.`,
      [
        { id: 'CONFIRM_BOOKING', title: 'Confirm booking' },
        { id: 'RESET', title: 'Start over' },
      ],
    );
  }
  if (s.state === 'ENTER_COUPON') {
    c.couponCode = upper;
    const u = await customer(phone);
    try {
      const quote = await bookingApi.quote({
        tripId: c.trip.id,
        originStopId: c.boardingPoint.id,
        destinationStopId: c.droppingPoint.id,
        seatIds: c.selectedSeats.map((x) => x.id),
        couponCode: c.couponCode,
        customerId: u?.id || null,
      });
      c.quote = quote;
      await save(phone, 'CONFIRM', c, lang);
      return meta.buttons(
        to,
        `Coupon applied ✅\nTotal: ${money(quote.totalAmount)}\nDiscount: ${money(quote.discountAmount || 0)}`,
        [
          { id: 'CONFIRM_BOOKING', title: 'Confirm booking' },
          { id: 'RESET', title: 'Start over' },
        ],
      );
    } catch (e) {
      await save(phone, 'ASK_COUPON', c, lang);
      return meta.buttons(to, `Coupon could not be applied: ${e.message}`, [
        { id: 'SKIP', title: 'Skip coupon' },
        { id: 'ENTER_COUPON', title: 'Try another' },
      ]);
    }
  }
  if (s.state === 'CONFIRM') {
    if (!['CONFIRM_BOOKING', 'CONFIRM', '1'].includes(upper))
      return meta.text(to, 'Use Confirm booking or RESET.');
    const existing = await customer(phone);
    const booking = await bookingApi.createBooking({
      customerId: existing?.id || null,
      customer: {
        fullName: c.passengers[0].fullName,
        mobile: phone,
        email: existing?.email || null,
      },
      tripId: c.trip.id,
      originStopId: c.boardingPoint.id,
      destinationStopId: c.droppingPoint.id,
      couponCode: c.couponCode,
      quoteId: c.quote.quoteId,
      passengers: c.passengers,
    });
    const link = await issueCheckout(booking.id, phone);
    c.bookingId = booking.id;
    c.bookingReference = booking.booking_reference;
    await save(phone, 'PAYMENT_PENDING', c, lang);
    return meta.buttons(
      to,
      `✅ Seats held for 10 minutes.\nPNR: ${booking.booking_reference}\nAmount: ${money(booking.total_amount)}\n\nPay securely:\n${link}`,
      [
        { id: `BOOKING_${booking.id}`, title: 'Booking details' },
        { id: 'MENU', title: 'Main menu' },
      ],
    );
  }
  if (s.state === 'PAYMENT_PENDING')
    return meta.buttons(
      to,
      `Payment is pending for ${c.bookingReference}. Complete payment using your secure link. Confirmation will arrive automatically after payment.`,
      [
        { id: `BOOKING_${c.bookingId}`, title: 'Booking details' },
        { id: 'MYBOOKING', title: 'My bookings' },
        { id: 'MENU', title: 'Main menu' },
      ],
    );

  await reset(phone, lang);
  return menu(to, lang);
}

module.exports = { handle, normalizePhone, resolveChoiceFromList };
