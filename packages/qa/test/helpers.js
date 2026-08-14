const crypto = require('node:crypto');

class SeatInventory {
  constructor(seats = []) {
    this.seats = new Map(seats.map((id) => [String(id), { status: 'AVAILABLE', bookingId: null }]));
    this.locks = new Set();
  }
  async hold(seatId, bookingId) {
    const key = String(seatId);
    while (this.locks.has(key)) await new Promise((r) => setTimeout(r, 1));
    this.locks.add(key);
    try {
      const seat = this.seats.get(key);
      if (!seat || seat.status !== 'AVAILABLE') return false;
      // Yield here intentionally to emulate two callers racing around the critical section.
      await new Promise((r) => setTimeout(r, Math.floor(Math.random() * 3)));
      seat.status = 'HELD';
      seat.bookingId = bookingId;
      return true;
    } finally {
      this.locks.delete(key);
    }
  }
}

class IdempotencyStore {
  constructor() { this.values = new Map(); }
  execute(key, fn) {
    if (this.values.has(key)) return this.values.get(key);
    const result = fn();
    this.values.set(key, result);
    return result;
  }
}

function signWebhook(secret, body) {
  return `sha256=${crypto.createHmac('sha256', secret).update(body).digest('hex')}`;
}
function verifyWebhook(secret, body, signature) {
  const expected = signWebhook(secret, body);
  const a = Buffer.from(expected);
  const b = Buffer.from(String(signature || ''));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

module.exports = { SeatInventory, IdempotencyStore, signWebhook, verifyWebhook };
