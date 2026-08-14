export type Trip = {
  id: string;
  operator?: string;
  operator_name?: string;
  bus?: string;
  bus_name?: string;
  bus_type?: string;
  source_city?: string;
  destination_city?: string;
  departure_at: string;
  arrival_at: string;
  starting_fare?: number;
  available_seats?: number;
  rating?: number;
  amenities?: string[];
};

export type Seat = {
  id: string;
  seat_number: string;
  fare: number;
  status: 'AVAILABLE' | 'HELD' | 'BOOKED' | 'BLOCKED';
  deck?: 'LOWER' | 'UPPER';
  berth_type?: string;
};

export type Stop = {
  id: string;
  location_name: string;
  landmark?: string;
  scheduled_at?: string;
};

export type Booking = {
  id: string;
  booking_reference: string;
  status: string;
  source_city?: string;
  destination_city?: string;
  operator?: string;
  bus?: string;
  departure_at?: string;
  total_amount?: number;
  seat_numbers?: string[];
  payment_status?: string;
  review_rating?: number;
  review_text?: string;
  passengers?: Array<{name:string;seat:string;fare:number;age?:number;gender?:string}>;
};
