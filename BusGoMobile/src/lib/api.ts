import { readToken } from './storage';

const BASE_URL = (process.env.EXPO_PUBLIC_API_BASE_URL || 'http://10.0.2.2:4000/api').replace(/\/$/, '');

export class ApiError extends Error {
  status: number;
  details?: unknown;
  constructor(message: string, status: number, details?: unknown) {
    super(message); this.status = status; this.details = details;
  }
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await readToken();
  const headers = new Headers(init.headers || {});
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const response = await fetch(`${BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`, { ...init, headers });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body?.success === false) {
    throw new ApiError(body?.message || `Request failed (${response.status})`, response.status, body?.errors || body);
  }
  return (body?.data ?? body) as T;
}

export const authApi = {
  sendOtp: (mobile: string) => api<any>('/auth/customer/send-otp', { method: 'POST', body: JSON.stringify({ mobile }) }),
  verifyOtp: (mobile: string, otp: string) => api<any>('/auth/customer/verify-otp', { method: 'POST', body: JSON.stringify({ mobile, otp }) }),
};

export const bookingApi = {
  search: (from: string, to: string, date: string) => api<any>(`/bookings/trips/search?source=${encodeURIComponent(from)}&destination=${encodeURIComponent(to)}&date=${encodeURIComponent(date)}`),
  seats: (tripId: string) => api<any>(`/bookings/trips/${tripId}/seats`),
  quote: (payload: unknown) => api<any>('/bookings/quotes', { method: 'POST', body: JSON.stringify(payload) }),
  create: (payload: unknown) => api<any>('/bookings', { method: 'POST', body: JSON.stringify(payload) }),
  mine: () => api<any>('/bookings/customer'),
  ticket: (id: string) => api<any>(`/bookings/${id}/ticket`),
  cancellationQuote: (id: string) => api<any>(`/bookings/${id}/cancellation-quote`),
  refundStatus: (id: string) => api<any>(`/bookings/${id}/refund-status`),
  supportTickets: () => api<any>('/bookings/support/tickets'),
  createSupport: (id: string, payload: unknown) => api<any>(`/bookings/${id}/support`, { method: 'POST', body: JSON.stringify(payload) }),
  review: (id: string, payload: unknown) => api<any>(`/bookings/${id}/review`, { method: 'POST', body: JSON.stringify(payload) }),
  rescheduleOptions: (id: string) => api<any>(`/bookings/${id}/reschedule/options`),
  rescheduleQuote: (id: string, payload: unknown) => api<any>(`/bookings/${id}/reschedule/quote`, { method: 'POST', body: JSON.stringify(payload) }),
  confirmReschedule: (id: string, payload: unknown) => api<any>(`/bookings/${id}/reschedule/confirm`, { method: 'POST', body: JSON.stringify(payload) }),
  cancel: (id: string, reason = 'Customer requested cancellation') => api<any>(`/bookings/${id}/cancel`, { method: 'PATCH', body: JSON.stringify({ reason }) }),
  paymentOrder: (id: string) => api<any>(`/bookings/${id}/payment/order`, { method: 'POST' }),
  demoComplete: (id: string) => api<any>(`/bookings/${id}/payment/complete`, { method: 'POST', body: JSON.stringify({ provider: 'DEMO' }) }),
  offers: () => api<any>('/bookings/offers'),
};

export const trackingApi = {
  current: (tripId: string) => api<any>(`/tracking/location/${tripId}`),
};
