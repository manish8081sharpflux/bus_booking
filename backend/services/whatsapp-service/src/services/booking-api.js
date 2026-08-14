const base = (process.env.BOOKING_SERVICE_URL || 'http://127.0.0.1:4200').replace(/\/$/, '');
const internalKey = process.env.INTERNAL_SERVICE_KEY || '';
async function call(path, options = {}) {
  const headers={...(options.headers||{})};
  if(path.startsWith('/bookings/whatsapp/internal/')) headers['x-internal-service-key']=internalKey;
  const response = await fetch(`${base}${path}`, {...options,headers});
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body.success === false) throw new Error(body.message || body.error || `Booking API ${response.status}`);
  return body.data ?? body;
}
module.exports = {
  searchTrips: (params) => call(`/bookings/trips/search?${new URLSearchParams(params)}`),
  seatMap: (tripId) => call(`/bookings/trips/${encodeURIComponent(tripId)}/seats`),
  quote: (payload) => call('/bookings/pricing/quote', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }),
  createBooking: (payload) => call('/bookings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }),
  myBookings: (phone) => call(`/bookings/whatsapp/internal/customer?${new URLSearchParams({phone})}`),
  cancellationQuote: (id,phone) => call(`/bookings/whatsapp/internal/${encodeURIComponent(id)}/cancellation-quote?${new URLSearchParams({phone})}`),
  cancel: (id,phone,reason) => call(`/bookings/whatsapp/internal/${encodeURIComponent(id)}/cancel`, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({phone,reason})}),
  support: (id,phone,reason) => call(`/bookings/whatsapp/internal/${encodeURIComponent(id)}/support`, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({phone,reason})}),
};
