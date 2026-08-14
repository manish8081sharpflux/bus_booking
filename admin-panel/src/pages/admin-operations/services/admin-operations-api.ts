import * as authHelper from '@/auth/lib/helpers';
import { OPERATOR_API_BASE_URL } from '@/config/api.config';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = authHelper.getAuth()?.access_token;
  const response = await fetch(`${OPERATOR_API_BASE_URL}${path}`, {
    ...options,
    headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(options.headers || {}) },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body.success === false) {
    throw new Error(body.message || `Request failed (${response.status})`);
  }
  return body.data as T;
}

export type AdminBus = {
  id: string;
  operator_id: string;
  operator_name: string;
  registration_number: string;
  name: string;
  bus_type: string;
  manufacturer?: string | null;
  model?: string | null;
  manufacture_year?: number | null;
  seat_capacity: number;
  configured_seats: number;
  deck_type: string;
  amenities: string[];
  status: string;
  document_count: number;
  compliance_status?: string | null;
  insurance_expiry?: string | null;
  permit_expiry?: string | null;
  fitness_expiry?: string | null;
  puc_expiry?: string | null;
  created_at: string;
};

export type AdminTrip = {
  id: string;
  operator_name: string;
  bus_name: string;
  registration_number: string;
  service_number: string;
  source_city: string;
  destination_city: string;
  departure_at: string;
  arrival_at: string;
  base_fare: string | number;
  currency: string;
  status: string;
  total_seats: number;
  available_seats: number;
  booked_seats: number;
};

export type AdminBooking = {
  id: string;
  booking_reference: string;
  status: string;
  total_amount: string | number;
  currency: string;
  created_at: string;
  cancelled_at?: string | null;
  service_number: string;
  departure_at: string;
  source_city: string;
  destination_city: string;
  operator_name: string;
  bus_name: string;
  customer_name: string;
  customer_mobile: string;
  customer_email?: string | null;
  payment_status: string;
  payment_method?: string | null;
  provider?: string | null;
  passenger_count: number;
};

export type AdminPayment = {
  id: string;
  booking_id: string;
  booking_reference: string;
  provider: string;
  provider_order_id?: string | null;
  provider_payment_id?: string | null;
  amount: string | number;
  currency: string;
  status: string;
  method?: string | null;
  failure_code?: string | null;
  failure_message?: string | null;
  operator_name: string;
  customer_name: string;
  customer_mobile: string;
  created_at: string;
};

export type AdminRefund = {
  id: string;
  payment_id: string;
  booking_id: string;
  booking_reference: string;
  provider: string;
  provider_refund_id?: string | null;
  amount: string | number;
  reason?: string | null;
  status: string;
  operator_name: string;
  created_at: string;
};

export const getAdminBuses = () => request<AdminBus[]>('/admin/buses');
export const getAdminTrips = () => request<AdminTrip[]>('/admin/trips');
export const getAdminBookings = () => request<AdminBooking[]>('/admin/bookings');
export const getAdminPayments = () => request<{ payments: AdminPayment[]; refunds: AdminRefund[] }>('/admin/payments');

export type LiveTrip = AdminTrip & { latitude?: number|null; longitude?: number|null; speed_kph?: number|null; last_location_at?: string|null };
export type Settlement = { operator_id:string; operator_name:string; bookings:number; gross_collected:string|number; refunds:string|number; net_payable:string|number; last_payment_at?:string|null };
export type SupportIssue = { issue_type:string; entity_id:string; reference:string; customer_name:string; customer_mobile:string; operator_name:string; summary:string; occurred_at:string; priority:string };
export type AuditLog = { id:number; entity_type:string; entity_id:string; action:string; actor_name?:string|null; actor_mobile?:string|null; before_state?:unknown; after_state?:unknown; created_at:string };
export type ReportsOverview = { summary:{total_bookings:number;confirmed_bookings:number;cancelled_bookings:number;confirmed_value:string|number}; daily:{day:string;bookings:number;revenue:string|number}[]; routes:{source_city:string;destination_city:string;bookings:number;revenue:string|number}[]; operators:{operator_name:string;bookings:number;revenue:string|number}[] };
export const getLiveTrips=()=>request<LiveTrip[]>('/admin/live-trips');
export const getSettlements=()=>request<Settlement[]>('/admin/settlements');
export const getSupportIssues=()=>request<SupportIssue[]>('/admin/support');
export const getAuditLogs=()=>request<AuditLog[]>('/admin/audit-logs');
export const getReportsOverview=()=>request<ReportsOverview>('/admin/reports/overview');


export type AdminPromotion = {
  id:string; code:string; title?:string|null; description?:string|null; status:string; discount_type:'FIXED'|'PERCENTAGE'; discount_value:string|number; max_discount_amount?:string|number|null; starts_at:string; ends_at:string; usage_limit?:number|null; per_user_limit?:number|null; budget_amount?:string|number|null; budget_consumed:string|number; eligibility?:Record<string,unknown>; operator_id?:string|null; route_id?:string|null; operator_name?:string|null; source_city?:string|null; destination_city?:string|null; redemption_count:number; redeemed_amount:string|number; created_at:string;
};
export const getPromotions=()=>request<AdminPromotion[]>('/admin/promotions');
export const createPromotion=(payload:Record<string,unknown>)=>request<AdminPromotion>('/admin/promotions',{method:'POST',body:JSON.stringify(payload)});
export const setPromotionStatus=(id:string,status:string)=>request<AdminPromotion>(`/admin/promotions/${id}/status`,{method:'PATCH',body:JSON.stringify({status})});
export const cancelAdminTrip=(id:string,reason:string)=>request<{affectedBookings:number}>(`/admin/trips/${id}/cancel`,{method:'PATCH',body:JSON.stringify({reason})});
export type SupportTicket={id:string;ticket_number:string;category:string;subject:string;description:string;priority:string;status:string;resolution?:string|null;booking_reference?:string|null;customer_name?:string|null;customer_mobile?:string|null;operator_name?:string|null;created_at:string};
export const getSupportTickets=()=>request<SupportTicket[]>('/admin/support/tickets');
export const updateSupportTicket=(id:string,status:string,resolution?:string)=>request<SupportTicket>(`/admin/support/tickets/${id}`,{method:'PATCH',body:JSON.stringify({status,resolution})});
