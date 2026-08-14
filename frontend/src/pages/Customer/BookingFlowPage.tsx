import { useEffect, useMemo, useState } from 'react';

import { IonContent, IonIcon, IonPage } from '@ionic/react';

import {
  arrowBackOutline,
  busOutline,
  calendarOutline,
  cardOutline,
  checkmarkCircleOutline,
  checkmarkOutline,
  chevronDownOutline,
  locationOutline,
  mailOutline,
  personOutline,
  phonePortraitOutline,
  searchOutline,
  timeOutline,
  walletOutline,
} from 'ionicons/icons';

import { useHistory, useParams } from 'react-router-dom';

import './BookingFlowPage..css';

/* =========================================================
   API
========================================================= */

const API = import.meta.env.VITE_BOOKING_API_URL || 'http://localhost:4000/api/bookings';

/* =========================================================
   TYPES
========================================================= */

type SeatStatus = 'AVAILABLE' | 'HELD' | 'BOOKED' | 'BLOCKED';

type Trip = {
  id: string;

  operator: string;

  bus: string;

  bus_type: string;

  service_number: string;

  source_city: string;

  destination_city: string;

  departure_at: string;

  arrival_at: string;

  origin_stop_id: string;

  destination_stop_id: string;

  boarding_point: string;

  dropping_point: string;

  amenities: string[];
};

type StopPoint = {
  id: string;
  stop_order: number;
  city: string;
  location_name: string;
  address?: string;
  landmark?: string;
  contact_number?: string;
  scheduled_at?: string;
};

type StopPointSelectProps = {
  label: string;
  points: StopPoint[];
  value: string;
  fallback: string;
  onChange: (value: string) => void;
};

function LegacyStopPointSelect({ label, points, value, fallback, onChange }: StopPointSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const selectedPoint = points.find((point) => point.id === value);
  const normalizedQuery = query.trim().toLowerCase();
  const visiblePoints = points.filter((point) =>
    [point.location_name, point.city, point.address, point.landmark]
      .filter(Boolean).join(' ').toLowerCase().includes(normalizedQuery),
  );
  const formatPointTime = (scheduledAt?: string) => {
    if (!scheduledAt) return '--:--';
    const date = new Date(scheduledAt);
    return Number.isNaN(date.getTime())
      ? '--:--'
      : date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  return (
    <div className={`booking-point-select${open ? ' is-open' : ''}`}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node)) setOpen(false);
      }}>
      <span className="booking-point-label">{label}</span>
      <button className="booking-point-trigger" type="button" aria-expanded={open}
        onClick={() => setOpen((current) => !current)}>
        <span>
          <strong>{selectedPoint?.location_name || `Choose ${label.toLowerCase()}`}</strong>
          {selectedPoint && <small className="booking-point-selected-meta">
            <time>{formatPointTime(selectedPoint.scheduled_at)}</time>
            <span>{selectedPoint.city}</span>
          </small>}
        </span>
        <IonIcon icon={chevronDownOutline} />
      </button>
      {open && (
        <div className="booking-point-menu">
          <div className="booking-point-search">
            <IonIcon icon={searchOutline} />
            <input autoFocus value={query} placeholder={`Search ${label.toLowerCase()}...`}
              onChange={(event) => setQuery(event.target.value)} />
          </div>
          <div className="booking-point-options" role="listbox">
            {visiblePoints.map((point) => (
              <button type="button" role="option" aria-selected={point.id === value}
                className={point.id === value ? 'is-selected' : ''} key={point.id}
                onClick={() => {
                  onChange(point.id);
                  setOpen(false);
                  setQuery('');
                }}>
                <IonIcon icon={locationOutline} />
                <span>
                  <strong className="booking-point-option-title">
                    <time>{formatPointTime(point.scheduled_at)}</time>
                    <span>{point.location_name}</span>
                  </strong>
                  <small>{[point.city, point.landmark || point.address].filter(Boolean).join(' · ')}</small>
                </span>
                {point.id === value && <IonIcon className="booking-point-check" icon={checkmarkOutline} />}
              </button>
            ))}
            {!visiblePoints.length && <p>No matching points found.</p>}
          </div>
        </div>
      )}
      <small className="booking-point-address">{selectedPoint?.address || fallback}</small>
    </div>
  );
}

function StopPointSelect({ label, points, value, fallback, onChange }: StopPointSelectProps) {
  const heading = label.toLowerCase().startsWith('boarding') ? 'Boarding points' : 'Dropping points';
  const formatStopTime = (scheduledAt?: string) => {
    if (!scheduledAt) return '--:--';
    const date = new Date(scheduledAt);
    return Number.isNaN(date.getTime())
      ? '--:--'
      : date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  return (
    <div className="booking-stop-list-card">
      <header><h3>{heading}</h3><p>Select {label}</p></header>
      <div className="booking-stop-list" role="radiogroup" aria-label={heading}>
        {points.map((point) => {
          const selected = point.id === value;
          return (
            <button type="button" role="radio" aria-checked={selected}
              className={selected ? 'is-selected' : ''} key={point.id}
              onClick={() => onChange(point.id)}>
              <time>{formatStopTime(point.scheduled_at)}</time>
              <span className="booking-stop-copy">
                <strong>{point.location_name}</strong>
                {(point.address || point.landmark || point.city) &&
                  <small>{[point.address, point.landmark, point.city].filter(Boolean).join(' · ')}</small>}
                {selected && <em>Your selected {label}</em>}
              </span>
              <span className="booking-stop-radio" aria-hidden="true"><i /></span>
            </button>
          );
        })}
        {!points.length && <div className="booking-stop-empty">No {label.toLowerCase()} configured for this trip.</div>}
      </div>
      {!points.length && <small className="booking-stop-fallback">Route location: {fallback}</small>}
    </div>
  );
}

type CouponResult = {
  valid: boolean;
  code: string;
  discountAmount: number;
  totalAmount: number;
  endsAt?: string;
};
type PriceQuote = {
  quoteId: string;
  quoteReference: string;
  baseSubtotal: number;
  dynamicAdjustmentAmount: number;
  subtotalAmount: number;
  discountAmount: number;
  totalAmount: number;
  currency: string;
  appliedRuleCount: number;
  expiresAt: string;
  validForSeconds: number;
  coupon?: { code: string; discountAmount: number } | null;
  lineItems: {
    seatId: string;
    seatNumber: string;
    seatType: string;
    baseFare: number;
    finalFare: number;
    adjustmentAmount: number;
    appliedRules: { name: string; delta: number }[];
  }[];
};

type Seat = {
  id: string;

  seat_number: string;

  seat_type: string;

  deck: number;

  row_number: number;

  column_number: number;

  status: SeatStatus;

  fare: string;

  is_window: boolean;

  booked_gender?: 'MALE' | 'FEMALE' | 'OTHER' | null;
};

type Passenger = {
  seatId: string;

  fullName: string;

  age: string;

  gender: string;
};

type Booking = {
  id: string;

  booking_reference: string;

  total_amount: string;

  expires_at: string;
};

type Ticket = {
  booking_reference: string;

  status: string;

  operator: string;

  bus: string;

  source_city: string;

  destination_city: string;

  boarding_point: string;

  dropping_point: string;

  departure_at: string;

  total_amount: string;

  currency: string;

  passengers: {
    name: string;

    seat: string;

    fare: string;
  }[];
};

/* =========================================================
   API HELPER
========================================================= */

async function api<T = any>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API}${path}`, options);

  const text = await response.text();

  let body: any;

  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(
      `Booking service returned ${response.status}. Confirm the booking service is running.`,
    );
  }

  if (!response.ok || body.success === false) {
    throw new Error(body.message || 'Request failed.');
  }

  return body.data as T;
}

/* =========================================================
   FORMATTERS
========================================================= */

function formatTime(value?: string) {
  if (!value) {
    return '--:--';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDate(value?: string) {
  if (!value) {
    return '-';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatCurrency(value: string | number) {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return '₹0';
  }

  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(amount);
}

function durationMinutes(departure: string, arrival: string) {
  const start = new Date(departure).getTime();

  const end = new Date(arrival).getTime();

  if (!Number.isFinite(start) || !Number.isFinite(end)) {
    return 0;
  }

  let difference = end - start;

  if (difference < 0) {
    difference += 24 * 60 * 60 * 1000;
  }

  return Math.max(0, Math.round(difference / 60000));
}

function formatDuration(minutes: number) {
  if (!minutes) {
    return '--';
  }

  const hours = Math.floor(minutes / 60);

  const remaining = minutes % 60;

  return `${hours}h ${remaining ? `${remaining}m` : ''}`.trim();
}

function formatBusType(value?: string) {
  return (value || '')
    .replaceAll('_', ' ')
    .toLowerCase()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

/* =========================================================
   STEPPER
========================================================= */

const steps = ['Seats', 'Passengers', 'Review', 'Payment', 'Confirmation'];

function BookingStepper({ currentStep }: { currentStep: number }) {
  return (
    <div className="booking-stepper">
      {steps.map((label, index) => {
        const number = index + 1;

        const complete = currentStep > number;

        const active = currentStep === number;

        return (
          <div key={label} className="booking-step-wrapper">
            <div
              className={['booking-step', active ? 'active' : '', complete ? 'complete' : '']
                .filter(Boolean)
                .join(' ')}
            >
              <div className="booking-step-number">
                {complete ? <IonIcon icon={checkmarkCircleOutline} /> : number}
              </div>

              <div className="booking-step-label">
                <small>Step {number}</small>

                <strong>{label}</strong>
              </div>
            </div>

            {index < steps.length - 1 && (
              <div className={complete ? 'booking-step-line complete' : 'booking-step-line'} />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* =========================================================
   DRIVER
========================================================= */

function DriverArea() {
  return (
    <div className="customer-driver-area">
      <div className="customer-driver-console">
        <div className="customer-steering-wheel">
          <span className="wheel-center" />

          <span className="wheel-line wheel-left" />

          <span className="wheel-line wheel-right" />

          <span className="wheel-line wheel-bottom" />
        </div>

        <span>Driver</span>
      </div>
    </div>
  );
}

/* =========================================================
   SEAT
========================================================= */

function BookingSeat({
  seat,
  selected,
  gridColumn,
  gridRow,
  onClick,
}: {
  seat: Seat;

  selected: boolean;

  gridColumn: number;
  gridRow: number;

  onClick: () => void;
}) {
  const sleeper = seat.seat_type.toUpperCase().includes('SLEEPER');

  const className = [
    'booking-seat',

    sleeper ? 'booking-seat-sleeper' : 'booking-seat-seater',

    selected ? 'selected' : seat.status.toLowerCase(),

    seat.is_window ? 'window' : '',

    seat.status === 'BOOKED' && seat.booked_gender
      ? `booked-${seat.booked_gender.toLowerCase()}`
      : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type="button"
      className={className}
      disabled={seat.status !== 'AVAILABLE'}
      onClick={onClick}
      style={{
        gridRow,

        gridColumn,
      }}
    >
      {seat.status === 'BOOKED' && ['MALE', 'FEMALE'].includes(seat.booked_gender || '') && (
        <span
          className="booking-seat-passenger-icon"
          aria-label={`${seat.booked_gender === 'FEMALE' ? 'Female' : 'Male'} passenger`}
        >
          {seat.booked_gender === 'FEMALE' ? '👩🏻‍🦰' : '👨🏻‍🦱'}
        </span>
      )}

      {sleeper ? (
        <div className="sleeper-seat-shape">
          <span className="sleeper-pillow" />

          <strong>{seat.seat_number}</strong>

          <span className="sleeper-bottom" />
        </div>
      ) : (
        <div className="seater-seat-shape">
          <span className="seat-head" />

          <span className="seat-back">
            <strong>{seat.seat_number}</strong>
          </span>

          <span className="seat-base" />

          <span className="seat-arm left" />

          <span className="seat-arm right" />
        </div>
      )}

      <span className="booking-seat-fare">{formatCurrency(seat.fare)}</span>

      {seat.is_window && <span className="window-badge">W</span>}
    </button>
  );
}

/* =========================================================
   DECK LAYOUT
========================================================= */

function BookingDeck({
  seats,
  selected,
  onToggle,
  showDriver,
}: {
  seats: Seat[];

  selected: string[];

  onToggle: (seat: Seat) => void;

  showDriver: boolean;
}) {
  const sortedSeats = useMemo(
    () =>
      [...seats].sort(
        (first, second) =>
          first.row_number - second.row_number || first.column_number - second.column_number,
      ),
    [seats],
  );

  const uniqueColumns = useMemo(
    () =>
      [...new Set(sortedSeats.map((seat) => seat.column_number))].sort(
        (first, second) => first - second,
      ),
    [sortedSeats],
  );

  /*
   * Converts DB columns into visual columns.
   *
   * 2+2:
   * DB 1 2 3 4
   * UI 1 2 | 4 5
   *
   * 2+1:
   * DB 1 2 3
   * UI 1 2 | 4
   */
  function visualColumn(databaseColumn: number) {
    const index = uniqueColumns.indexOf(databaseColumn);

    if (uniqueColumns.length >= 4) {
      if (index === 0) {
        return 1;
      }

      if (index === 1) {
        return 2;
      }

      if (index === 2) {
        return 4;
      }

      if (index === 3) {
        return 5;
      }
    }

    if (uniqueColumns.length === 3) {
      if (index === 0) {
        return 1;
      }

      if (index === 1) {
        return 2;
      }

      return 4;
    }

    return index + 1;
  }

  return (
    <div className="customer-bus-shell">
      {showDriver && <DriverArea />}

      <div className={`customer-seat-grid seat-layout-${uniqueColumns.length}-columns`}>
        {sortedSeats.map((seat, index) => (
          <BookingSeat
            key={seat.id}
            seat={seat}
            selected={selected.includes(seat.id)}
            gridColumn={visualColumn(seat.column_number)}
            gridRow={seat.row_number}
            onClick={() => onToggle(seat)}
          />
        ))}
      </div>

      <div className="customer-bus-back">
        <span />

        <span />
      </div>
    </div>
  );
}

/* =========================================================
   PAGE
========================================================= */

export default function BookingFlowPage() {
  const { tripId } = useParams<{
    tripId: string;
  }>();

  const history = useHistory();

  const [step, setStep] = useState(1);

  const [trip, setTrip] = useState<Trip | null>(null);

  const [seats, setSeats] = useState<Seat[]>([]);

  const [selected, setSelected] = useState<string[]>([]);

  const [passengers, setPassengers] = useState<Passenger[]>([]);

  const [contact, setContact] = useState({
    mobile: '',
    email: '',
  });

  const [boardingPoints, setBoardingPoints] = useState<StopPoint[]>([]);
  const [droppingPoints, setDroppingPoints] = useState<StopPoint[]>([]);
  const [boardingStopId, setBoardingStopId] = useState('');
  const [droppingStopId, setDroppingStopId] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [coupon, setCoupon] = useState<CouponResult | null>(null);
  const [couponBusy, setCouponBusy] = useState(false);
  const [priceQuote, setPriceQuote] = useState<PriceQuote | null>(null);
  const [quoteBusy, setQuoteBusy] = useState(false);

  const [booking, setBooking] = useState<Booking | null>(null);

  const [ticket, setTicket] = useState<Ticket | null>(null);

  const [loading, setLoading] = useState(true);

  const [busy, setBusy] = useState(false);

  const [message, setMessage] = useState('');

  /* =======================================================
     LOAD TRIP + SEATS
  ======================================================= */

  useEffect(() => {
    if (!tripId) {
      setLoading(false);

      return;
    }

    api<{
      trip: Trip;
      seats: Seat[];
      boardingPoints: StopPoint[];
      droppingPoints: StopPoint[];
    }>(`/trips/${tripId}/seats`)
      .then((data) => {
        setTrip(data.trip);

        setSeats(data.seats);
        setBoardingPoints(data.boardingPoints || []);
        setDroppingPoints(data.droppingPoints || []);
        setBoardingStopId(data.trip.origin_stop_id || data.boardingPoints?.[0]?.id || '');
        setDroppingStopId(
          data.trip.destination_stop_id ||
            data.droppingPoints?.[data.droppingPoints.length - 1]?.id ||
            '',
        );
      })
      .catch((error) => setMessage(error.message))
      .finally(() => setLoading(false));
  }, [tripId]);

  /* =======================================================
     SELECTED SEATS
  ======================================================= */

  const chosen = useMemo(
    () => seats.filter((seat) => selected.includes(seat.id)),
    [seats, selected],
  );

  const total = useMemo(() => chosen.reduce((sum, seat) => sum + Number(seat.fare), 0), [chosen]);

  /* =======================================================
     DECKS
  ======================================================= */

  const decks = useMemo(
    () => [...new Set(seats.map((seat) => seat.deck))].sort((first, second) => first - second),
    [seats],
  );

  /* =======================================================
     TOGGLE SEAT
  ======================================================= */

  function toggle(seat: Seat) {
    if (seat.status !== 'AVAILABLE') {
      return;
    }

    const next = selected.includes(seat.id)
      ? selected.filter((id) => id !== seat.id)
      : [...selected, seat.id];

    setSelected(next);

    setPassengers(
      next.map(
        (id) =>
          passengers.find((passenger) => passenger.seatId === id) || {
            seatId: id,
            fullName: '',
            age: '',
            gender: '',
          },
      ),
    );

    setMessage('');
    setPriceQuote(null);
    setCoupon(null);
  }

  /* =======================================================
     UPDATE PASSENGER
  ======================================================= */

  function updatePassenger(id: string, key: keyof Omit<Passenger, 'seatId'>, value: string) {
    setPassengers(
      passengers.map((passenger) =>
        passenger.seatId === id
          ? {
              ...passenger,

              [key]: value,
            }
          : passenger,
      ),
    );

    setMessage('');
  }

  /* =======================================================
     GO TO PASSENGER STEP
  ======================================================= */

  function passengerStep() {
    if (!selected.length) {
      setMessage('Select at least one available seat.');

      return;
    }

    setMessage('');

    setStep(2);
  }

  /* =======================================================
     REVIEW
  ======================================================= */

  async function review() {
    const mobile = contact.mobile.replace(/\D/g, '');
    const email = contact.email.trim();

    if (!/^[6-9]\d{9}$/.test(mobile)) {
      setMessage('Enter a valid 10-digit Indian mobile number starting with 6, 7, 8 or 9.');

      return;
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      setMessage('Enter a valid email address.');
      return;
    }

    const invalidPassenger = passengers.some(
      (passenger) =>
        !/^[\p{L}\p{M} .'-]{2,80}$/u.test(passenger.fullName.trim()) ||
        !Number.isInteger(Number(passenger.age)) ||
        Number(passenger.age) < 1 ||
        Number(passenger.age) > 120 ||
        !['MALE', 'FEMALE', 'OTHER'].includes(passenger.gender),
    );

    if (invalidPassenger) {
      setMessage('Enter a valid name (2–80 letters), age (1–120) and gender for every passenger.');

      return;
    }

    const boardStop = boardingPoints.find((x) => x.id === boardingStopId);
    const dropStop = droppingPoints.find((x) => x.id === droppingStopId);
    if (
      !boardingStopId ||
      !droppingStopId ||
      boardingStopId === droppingStopId ||
      (boardStop && dropStop && boardStop.stop_order >= dropStop.stop_order)
    ) {
      setMessage('Choose valid boarding and dropping points.');
      return;
    }
    setMessage('');
    setStep(3);
    try {
      setQuoteBusy(true);
      const quote = await api<PriceQuote>('/pricing/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tripId: trip?.id,
          originStopId: boardingStopId,
          destinationStopId: droppingStopId,
          seatIds: selected,
          couponCode: coupon?.code || null,
        }),
      });
      setPriceQuote(quote);
    } catch (error) {
      setMessage((error as Error).message);
      setStep(1);
    } finally {
      setQuoteBusy(false);
    }
  }

  async function applyCoupon() {
    if (!couponCode.trim()) {
      setCoupon(null);
      setPriceQuote(null);
      setMessage('Enter a coupon code.');
      return;
    }
    if (!trip || !selected.length || !boardingStopId || !droppingStopId) {
      setMessage('Select trip seats and boarding/drop points first.');
      return;
    }
    try {
      setCouponBusy(true);
      setMessage('');
      const quote = await api<PriceQuote>('/pricing/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tripId: trip.id,
          originStopId: boardingStopId,
          destinationStopId: droppingStopId,
          seatIds: selected,
          couponCode: couponCode.trim(),
        }),
      });
      setPriceQuote(quote);
      if (quote.coupon) {
        setCoupon({
          valid: true,
          code: quote.coupon.code,
          discountAmount: quote.discountAmount,
          totalAmount: quote.totalAmount,
          endsAt: quote.expiresAt,
        });
        setCouponCode(quote.coupon.code);
      }
    } catch (error) {
      setCoupon(null);
      setPriceQuote(null);
      setMessage((error as Error).message);
    } finally {
      setCouponBusy(false);
    }
  }

  /* =======================================================
     HOLD + CREATE BOOKING
  ======================================================= */

  async function holdAndBook() {
    if (!trip) {
      return;
    }
    if (!priceQuote || new Date(priceQuote.expiresAt).getTime() <= Date.now()) {
      setMessage('Your fare quote expired. Review the booking again to refresh the price.');
      setStep(3);
      return;
    }

    try {
      setBusy(true);
      setMessage('');

      const result = await api<Booking>('', {
        method: 'POST',

        headers: {
          'Content-Type': 'application/json',
        },

        body: JSON.stringify({
          customer: {
            fullName: passengers[0].fullName,

            mobile: contact.mobile,

            email: contact.email || null,
          },

          tripId: trip.id,

          originStopId: boardingStopId || trip.origin_stop_id,

          destinationStopId: droppingStopId || trip.destination_stop_id,

          couponCode: coupon?.code || null,
          quoteId: priceQuote?.quoteId || null,

          passengers: passengers.map((passenger) => ({
            ...passenger,

            age: Number(passenger.age),
          })),
        }),
      });

      setBooking(result);

      localStorage.setItem('customer_mobile', contact.mobile.replace(/\D/g, ''));

      setStep(4);
    } catch (error) {
      setMessage((error as Error).message);

      try {
        const fresh = await api<{
          trip: Trip;
          seats: Seat[];
        }>(`/trips/${tripId}/seats`);

        setSeats(fresh.seats);
      } catch {
        /* nothing */
      }

      setSelected([]);
      setPassengers([]);

      setStep(1);
    } finally {
      setBusy(false);
    }
  }

  /* =======================================================
     PAYMENT
  ======================================================= */

  async function pay() {
    if (!booking) {
      return;
    }

    try {
      setBusy(true);
      setMessage('');

      const paymentResult = await api<{ ticket?: Ticket }>(`/${booking.id}/payment/complete`, {
        method: 'POST',

        headers: {
          'Content-Type': 'application/json',

          'Idempotency-Key': crypto.randomUUID(),
        },

        body: JSON.stringify({
          provider: 'DEMO',

          method: 'UPI',
        }),
      });

      const ticketData = paymentResult.ticket || await api<Ticket>(`/${booking.id}/ticket`);

      setTicket(ticketData);

      setStep(5);
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  /* =======================================================
     NO TRIP
  ======================================================= */

  if (!tripId) {
    return (
      <IonPage>
        <IonContent fullscreen>
          <div className="booking-page">
            <div className="booking-empty">
              <IonIcon icon={busOutline} />

              <h2>Select a trip first</h2>

              <p>Choose a bus from the search results before continuing.</p>

              <button
                type="button"
                className="booking-primary-button"
                onClick={() => history.push('/home')}
              >
                Search Buses
              </button>
            </div>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  /* =======================================================
     LOADING
  ======================================================= */

  if (loading) {
    return (
      <IonPage>
        <IonContent fullscreen>
          <div className="booking-loading">
            <div className="booking-spinner" />

            <p>Loading trip and seat availability...</p>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  /* =======================================================
     NO TRIP DATA
  ======================================================= */

  if (!trip) {
    return (
      <IonPage>
        <IonContent fullscreen>
          <div className="booking-page">
            <div className="booking-empty">
              <IonIcon icon={busOutline} />

              <h2>Trip unavailable</h2>

              <p>{message || 'Unable to load this trip.'}</p>

              <button
                type="button"
                className="booking-primary-button"
                onClick={() => history.goBack()}
              >
                Go Back
              </button>
            </div>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  const journeyDuration = formatDuration(durationMinutes(trip.departure_at, trip.arrival_at));

  /* =======================================================
     UI
  ======================================================= */

  return (
    <IonPage>
      <IonContent fullscreen>
        <div className="booking-page">
          <div className="booking-container">
            {/* HEADER */}

            <div className="booking-page-header">
              <button
                type="button"
                className="booking-back-button"
                onClick={() => history.goBack()}
              >
                <IonIcon icon={arrowBackOutline} />
              </button>

              <div>
                <span className="booking-header-small">Bus Booking</span>

                <h1>{step === 5 ? 'Booking Confirmed' : 'Complete Your Booking'}</h1>

                <p>
                  {step === 1 && 'Choose your preferred seat to continue.'}

                  {step === 2 && 'Enter passenger and contact information.'}

                  {step === 3 && 'Review all details before holding your seats.'}

                  {step === 4 && 'Complete payment to confirm your booking.'}

                  {step === 5 && 'Your bus ticket has been confirmed.'}
                </p>
              </div>
            </div>

            {/* STEPPER */}

            <BookingStepper currentStep={step} />

            {/* ERROR */}

            {message && <div className="booking-message">{message}</div>}

            {/* TRIP SUMMARY */}

            {step < 5 && (
              <section className="booking-trip-summary">
                <div className="booking-trip-main">
                  <div className="booking-trip-bus-icon">
                    <IonIcon icon={busOutline} />
                  </div>

                  <div className="booking-trip-company">
                    <span>{trip.operator}</span>

                    <h2>{trip.bus}</h2>

                    <p>
                      {formatBusType(trip.bus_type)}
                      {' • '}
                      Service {trip.service_number}
                    </p>
                  </div>

                  <div className="booking-trip-route">
                    <div className="booking-route-time">
                      <strong>{formatTime(trip.departure_at)}</strong>

                      <span>{trip.source_city}</span>
                    </div>

                    <div className="booking-route-middle">
                      <span>{journeyDuration}</span>

                      <div className="booking-route-line">
                        <i />

                        <b />

                        <i />
                      </div>

                      <small>{formatDate(trip.departure_at)}</small>
                    </div>

                    <div className="booking-route-time right">
                      <strong>{formatTime(trip.arrival_at)}</strong>

                      <span>{trip.destination_city}</span>
                    </div>
                  </div>
                </div>

                <div className="booking-trip-stops">
                  <div>
                    <IonIcon icon={locationOutline} />

                    <span>Boarding</span>

                    <strong>{trip.boarding_point || trip.source_city}</strong>
                  </div>

                  <div>
                    <IonIcon icon={locationOutline} />

                    <span>Dropping</span>

                    <strong>{trip.dropping_point || trip.destination_city}</strong>
                  </div>

                  <div>
                    <IonIcon icon={calendarOutline} />

                    <span>Journey Date</span>

                    <strong>{formatDate(trip.departure_at)}</strong>
                  </div>
                </div>
              </section>
            )}

            {step <= 3 && trip && (
              <section className="booking-section-card booking-points-card">
                <div className="booking-section-heading">
                  <div>
                    <span className="booking-section-label">PICKUP & DROP</span>
                    <h2>Choose boarding & dropping points</h2>
                    <p>Select exactly where you will board and get off the bus.</p>
                  </div>
                </div>
                <div className="booking-point-grid">
                  <LegacyStopPointSelect
                    label="Boarding point"
                    points={boardingPoints}
                    value={boardingStopId}
                    fallback={trip.source_city}
                    onChange={(value) => {
                      setBoardingStopId(value);
                      setMessage('');
                    }}
                  />
                  <LegacyStopPointSelect
                    label="Dropping point"
                    points={droppingPoints}
                    value={droppingStopId}
                    fallback={trip.destination_city}
                    onChange={(value) => {
                      setDroppingStopId(value);
                      setMessage('');
                    }}
                  />
                  <label>
                    <span>Boarding point</span>
                    <select
                      value={boardingStopId}
                      onChange={(e) => {
                        setBoardingStopId(e.target.value);
                        setMessage('');
                      }}
                    >
                      {boardingPoints.map((point) => (
                        <option key={point.id} value={point.id}>
                          {point.location_name}
                          {point.landmark ? ` · ${point.landmark}` : ''}
                        </option>
                      ))}
                    </select>
                    <small>
                      {boardingPoints.find((x) => x.id === boardingStopId)?.address ||
                        trip.source_city}
                    </small>
                  </label>
                  <label>
                    <span>Dropping point</span>
                    <select
                      value={droppingStopId}
                      onChange={(e) => {
                        setDroppingStopId(e.target.value);
                        setMessage('');
                      }}
                    >
                      {droppingPoints.map((point) => (
                        <option key={point.id} value={point.id}>
                          {point.location_name}
                          {point.landmark ? ` · ${point.landmark}` : ''}
                        </option>
                      ))}
                    </select>
                    <small>
                      {droppingPoints.find((x) => x.id === droppingStopId)?.address ||
                        trip.destination_city}
                    </small>
                  </label>
                </div>
              </section>
            )}

            {/* =================================================
                STEP 1 - SEATS
            ================================================== */}

            {step === 1 && (
              <section className="booking-section-card">
                <div className="booking-section-heading">
                  <div>
                    <span className="booking-section-label">STEP 1</span>

                    <h2>Select Seats</h2>

                    <p>Click an available seat to select or deselect it.</p>
                  </div>

                  <div className="booking-seat-total">
                    <strong>{seats.filter((seat) => seat.status === 'AVAILABLE').length}</strong>

                    <span>Available</span>
                  </div>
                </div>

                {/* LEGEND */}

                <div className="booking-seat-legend">
                  <div>
                    <span className="legend-seat available" />
                    Available
                  </div>

                  <div>
                    <span className="legend-seat selected" />
                    Selected
                  </div>

                  <div>
                    <span className="legend-seat held" />
                    Held
                  </div>

                  <div>
                    <span className="legend-seat booked" />
                    Booked
                  </div>

                  <div>
                    <span className="legend-seat blocked" />
                    Blocked
                  </div>

                  <div>
                    <span className="legend-window">W</span>
                    Window
                  </div>
                </div>

                {/* DECKS */}

                <div className="booking-decks">
                  {decks.map((deck, index) => {
                    const deckSeats = seats.filter((seat) => seat.deck === deck);

                    return (
                      <div key={deck} className="booking-deck">
                        <div className="booking-deck-heading">
                          <div>
                            <small>{decks.length > 1 ? `DECK ${deck}` : 'SEAT LAYOUT'}</small>

                            <strong>
                              {decks.length > 1
                                ? deck === 1
                                  ? 'Lower Deck'
                                  : 'Upper Deck'
                                : formatBusType(trip.bus_type)}
                            </strong>
                          </div>

                          <span>{deckSeats.length} seats</span>
                        </div>

                        <BookingDeck
                          seats={deckSeats}
                          selected={selected}
                          onToggle={toggle}
                          showDriver={index === 0}
                        />
                      </div>
                    );
                  })}
                </div>

                {/* STICKY SUMMARY */}

                <div className="booking-seat-summary">
                  <div className="selected-seat-summary">
                    <span>Selected Seats</span>

                    <strong>
                      {chosen.length ? chosen.map((seat) => seat.seat_number).join(', ') : 'None'}
                    </strong>
                  </div>

                  <div className="selected-seat-summary">
                    <span>Seat Count</span>

                    <strong>{selected.length}</strong>
                  </div>

                  <div className="selected-seat-summary price">
                    <span>Total Fare</span>

                    <strong>{formatCurrency(total)}</strong>
                  </div>

                  <button
                    type="button"
                    className="booking-primary-button"
                    disabled={!selected.length}
                    onClick={passengerStep}
                  >
                    Passenger Details
                    <span>→</span>
                  </button>
                </div>
              </section>
            )}

            {/* =================================================
                STEP 2 - PASSENGERS
            ================================================== */}

            {step === 2 && (
              <section className="booking-section-card">
                <div className="booking-section-heading">
                  <div>
                    <span className="booking-section-label">STEP 2</span>

                    <h2>Passenger Details</h2>

                    <p>Enter contact and passenger information.</p>
                  </div>
                </div>

                <div className="booking-contact-card">
                  <div className="booking-sub-heading">
                    <IonIcon icon={phonePortraitOutline} />

                    <div>
                      <strong>Contact Information</strong>

                      <span>Booking updates will be sent here.</span>
                    </div>
                  </div>

                  <div className="booking-form-grid">
                    <label className="booking-form-field">
                      <span>Mobile Number *</span>

                      <div className="booking-input">
                        <IonIcon icon={phonePortraitOutline} />

                        <input
                          type="tel"
                          required
                          inputMode="numeric"
                          pattern="[6-9][0-9]{9}"
                          minLength={10}
                          maxLength={10}
                          placeholder="Enter mobile number"
                          value={contact.mobile}
                          onChange={(event) =>
                            setContact({
                              ...contact,

                              mobile: event.target.value,
                            })
                          }
                        />
                      </div>
                    </label>

                    <label className="booking-form-field">
                      <span>Email</span>

                      <div className="booking-input">
                        <IonIcon icon={mailOutline} />

                        <input
                          type="email"
                          maxLength={254}
                          placeholder="Email address (optional)"
                          value={contact.email}
                          onChange={(event) =>
                            setContact({
                              ...contact,

                              email: event.target.value,
                            })
                          }
                        />
                      </div>
                    </label>
                  </div>
                </div>

                <div className="booking-passengers">
                  {passengers.map((passenger, index) => {
                    const seat = seats.find((item) => item.id === passenger.seatId);

                    if (!seat) {
                      return null;
                    }

                    return (
                      <div key={passenger.seatId} className="booking-passenger-card">
                        <div className="passenger-card-header">
                          <div className="passenger-number">{index + 1}</div>

                          <div>
                            <strong>Passenger {index + 1}</strong>

                            <span>
                              Seat {seat.seat_number}
                              {' • '}
                              {formatCurrency(seat.fare)}
                            </span>
                          </div>
                        </div>

                        <div className="booking-form-grid passenger">
                          <label className="booking-form-field">
                            <span>Full Name *</span>

                            <div className="booking-input">
                              <IonIcon icon={personOutline} />

                              <input
                                type="text"
                                required
                                minLength={2}
                                maxLength={80}
                                placeholder="Passenger name"
                                value={passenger.fullName}
                                onChange={(event) =>
                                  updatePassenger(passenger.seatId, 'fullName', event.target.value)
                                }
                              />
                            </div>
                          </label>

                          <label className="booking-form-field">
                            <span>Age *</span>

                            <div className="booking-input">
                              <input
                                type="number"
                                required
                                min="1"
                                max="120"
                                placeholder="Age"
                                value={passenger.age}
                                onChange={(event) =>
                                  updatePassenger(passenger.seatId, 'age', event.target.value)
                                }
                              />
                            </div>
                          </label>

                          <label className="booking-form-field">
                            <span>Gender *</span>

                            <select
                              required
                              value={passenger.gender}
                              onChange={(event) =>
                                updatePassenger(passenger.seatId, 'gender', event.target.value)
                              }
                            >
                              <option value="">Select</option>

                              <option value="MALE">Male</option>

                              <option value="FEMALE">Female</option>

                              <option value="OTHER">Other</option>
                            </select>
                          </label>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="booking-actions">
                  <button
                    type="button"
                    className="booking-secondary-button"
                    onClick={() => setStep(1)}
                  >
                    ← Back to Seats
                  </button>

                  <button type="button" className="booking-primary-button" onClick={review}>
                    Review Booking →
                  </button>
                </div>
              </section>
            )}

            {/* =================================================
                STEP 3 - REVIEW
            ================================================== */}

            {step === 3 && (
              <section className="booking-section-card">
                <div className="booking-section-heading">
                  <div>
                    <span className="booking-section-label">STEP 3</span>

                    <h2>Review Booking</h2>

                    <p>Confirm your journey, passengers and fare.</p>
                  </div>
                </div>

                <div className="booking-review-grid">
                  <div className="booking-review-card">
                    <div className="booking-review-icon">
                      <IonIcon icon={locationOutline} />
                    </div>

                    <span>Route</span>

                    <strong>
                      {trip.source_city}
                      {' → '}
                      {trip.destination_city}
                    </strong>
                  </div>

                  <div className="booking-review-card">
                    <div className="booking-review-icon">
                      <IonIcon icon={timeOutline} />
                    </div>

                    <span>Departure</span>

                    <strong>
                      {formatDate(trip.departure_at)}, {formatTime(trip.departure_at)}
                    </strong>
                  </div>

                  <div className="booking-review-card">
                    <div className="booking-review-icon">
                      <IonIcon icon={locationOutline} />
                    </div>

                    <span>Boarding Point</span>

                    <strong>{trip.boarding_point || trip.source_city}</strong>
                  </div>

                  <div className="booking-review-card">
                    <div className="booking-review-icon">
                      <IonIcon icon={locationOutline} />
                    </div>

                    <span>Dropping Point</span>

                    <strong>{trip.dropping_point || trip.destination_city}</strong>
                  </div>
                </div>

                <div className="booking-coupon-card">
                  <div>
                    <strong>Offers & coupons</strong>
                    <span>Apply an eligible BusGo offer before payment.</span>
                  </div>
                  <div className="booking-coupon-row">
                    <input
                      value={couponCode}
                      onChange={(e) => {
                        setCouponCode(e.target.value.toUpperCase());
                        setCoupon(null);
                        setPriceQuote(null);
                      }}
                      placeholder="Enter coupon code"
                    />
                    <button
                      type="button"
                      disabled={couponBusy || !couponCode.trim()}
                      onClick={applyCoupon}
                    >
                      {couponBusy ? 'Checking...' : 'Apply'}
                    </button>
                  </div>
                  {coupon && (
                    <div className="booking-coupon-success">
                      ✓ {coupon.code} applied — you save {formatCurrency(coupon.discountAmount)}.
                      Pay {formatCurrency(coupon.totalAmount)}.
                    </div>
                  )}
                </div>

                <div className="booking-review-passengers">
                  <h3>Passenger Details</h3>

                  {passengers.map((passenger, index) => {
                    const seat = seats.find((item) => item.id === passenger.seatId);

                    if (!seat) {
                      return null;
                    }

                    return (
                      <div key={passenger.seatId} className="review-passenger-row">
                        <div className="review-passenger-left">
                          <div className="review-passenger-avatar">{index + 1}</div>

                          <div>
                            <strong>{passenger.fullName}</strong>

                            <span>
                              Age {passenger.age}
                              {' • '}
                              {passenger.gender}
                            </span>
                          </div>
                        </div>

                        <div>
                          <span>Seat</span>

                          <strong>{seat.seat_number}</strong>
                        </div>

                        <div>
                          <span>Fare</span>

                          <strong>{formatCurrency(seat.fare)}</strong>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="booking-fare-summary">
                  <div>
                    <span>{selected.length} seat(s)</span>

                    <strong>Total Amount</strong>
                  </div>

                  <strong>{formatCurrency(priceQuote?.totalAmount ?? total)}</strong>
                </div>

                {priceQuote && (
                  <div className="booking-price-lock">
                    <div className="booking-price-lock-head">
                      <div>
                        <strong>Fare locked for checkout</strong>
                        <span>
                          Quote {priceQuote.quoteReference} · valid until{' '}
                          {formatTime(priceQuote.expiresAt)}
                        </span>
                      </div>
                      <b>{formatCurrency(priceQuote.totalAmount)}</b>
                    </div>
                    <div className="booking-price-breakdown">
                      <div>
                        <span>Base seat fare</span>
                        <strong>{formatCurrency(priceQuote.baseSubtotal)}</strong>
                      </div>
                      {priceQuote.dynamicAdjustmentAmount !== 0 && (
                        <div>
                          <span>Demand / timing adjustment</span>
                          <strong>
                            {priceQuote.dynamicAdjustmentAmount > 0 ? '+' : ''}
                            {formatCurrency(priceQuote.dynamicAdjustmentAmount)}
                          </strong>
                        </div>
                      )}
                      {priceQuote.discountAmount > 0 && (
                        <div className="discount">
                          <span>Coupon discount</span>
                          <strong>-{formatCurrency(priceQuote.discountAmount)}</strong>
                        </div>
                      )}
                      <div className="total">
                        <span>Final payable</span>
                        <strong>{formatCurrency(priceQuote.totalAmount)}</strong>
                      </div>
                    </div>
                    {priceQuote.appliedRuleCount > 0 && (
                      <small>
                        {priceQuote.appliedRuleCount} dynamic pricing rule(s) applied. This amount
                        will not change during this checkout quote.
                      </small>
                    )}
                  </div>
                )}

                <div className="booking-hold-note">
                  Continuing will temporarily hold your selected seats for 10 minutes. The quoted
                  fare is stored server-side and remains unchanged for this booking.
                </div>

                <div className="booking-actions">
                  <button
                    type="button"
                    className="booking-secondary-button"
                    disabled={busy}
                    onClick={() => setStep(2)}
                  >
                    ← Edit Passengers
                  </button>

                  <button
                    type="button"
                    className="booking-primary-button"
                    disabled={busy || quoteBusy || !priceQuote}
                    onClick={holdAndBook}
                  >
                    {quoteBusy
                      ? 'Locking Fare...'
                      : busy
                        ? 'Holding Seats...'
                        : 'Confirm & Continue to Payment →'}
                  </button>
                </div>
              </section>
            )}

            {/* =================================================
                STEP 4 - PAYMENT
            ================================================== */}

            {step === 4 && booking && (
              <section className="booking-section-card payment-section">
                <div className="booking-section-heading">
                  <div>
                    <span className="booking-section-label">STEP 4</span>

                    <h2>Complete Payment</h2>

                    <p>Your seats are temporarily reserved.</p>
                  </div>

                  <div className="payment-timer">
                    <span>Held Until</span>

                    <strong>{formatTime(booking.expires_at)}</strong>
                  </div>
                </div>

                <div className="payment-layout">
                  <div className="payment-method-card">
                    <div className="payment-method-heading">
                      <IonIcon icon={walletOutline} />

                      <div>
                        <strong>Payment Method</strong>

                        <span>Demo payment environment</span>
                      </div>
                    </div>

                    <button type="button" className="payment-option active">
                      <div className="payment-radio">
                        <span />
                      </div>

                      <div>
                        <strong>UPI</strong>

                        <span>Demo UPI payment</span>
                      </div>

                      <IonIcon icon={checkmarkCircleOutline} />
                    </button>

                    <div className="payment-demo-note">
                      <IonIcon icon={cardOutline} />

                      <p>
                        No real payment provider is charged. This confirms the backend payment state
                        for development.
                      </p>
                    </div>
                  </div>

                  <aside className="payment-summary-card">
                    <span>Booking Reference</span>

                    <strong className="payment-reference">{booking.booking_reference}</strong>

                    <div className="payment-divider" />

                    <div className="payment-summary-row">
                      <span>Seats</span>

                      <strong>{chosen.map((seat) => seat.seat_number).join(', ')}</strong>
                    </div>

                    <div className="payment-summary-row">
                      <span>Passengers</span>

                      <strong>{passengers.length}</strong>
                    </div>

                    <div className="payment-divider" />

                    <div className="payment-total">
                      <span>Total Payable</span>

                      <strong>{formatCurrency(booking.total_amount)}</strong>
                    </div>

                    <button
                      type="button"
                      className="booking-primary-button payment-button"
                      disabled={busy}
                      onClick={pay}
                    >
                      {busy
                        ? 'Processing Payment...'
                        : `Pay ${formatCurrency(booking.total_amount)}`}
                    </button>
                  </aside>
                </div>
              </section>
            )}

            {/* =================================================
                STEP 5 - CONFIRMATION
            ================================================== */}

            {step === 5 && ticket && (
              <section className="booking-confirmation">
                <div className="confirmation-success-icon">
                  <IonIcon icon={checkmarkCircleOutline} />
                </div>

                <span className="confirmation-label">BOOKING CONFIRMED</span>

                <h1>Your trip is booked!</h1>

                <p>Your booking has been successfully confirmed.</p>

                <div className="confirmation-pnr">
                  <span>PNR / Booking Reference</span>

                  <strong>{ticket.booking_reference}</strong>
                </div>

                <div className="confirmation-ticket">
                  <div className="confirmation-bus">
                    <IonIcon icon={busOutline} />

                    <div>
                      <strong>{ticket.operator}</strong>

                      <span>{ticket.bus}</span>
                    </div>
                  </div>

                  <div className="confirmation-route">
                    <div>
                      <strong>{ticket.source_city}</strong>

                      <span>{ticket.boarding_point}</span>
                    </div>

                    <div className="confirmation-route-line">
                      <span />

                      <b>→</b>

                      <span />
                    </div>

                    <div className="right">
                      <strong>{ticket.destination_city}</strong>

                      <span>{ticket.dropping_point}</span>
                    </div>
                  </div>

                  <div className="confirmation-date">
                    <IonIcon icon={calendarOutline} />

                    <div>
                      <span>Journey</span>

                      <strong>
                        {formatDate(ticket.departure_at)}
                        {' • '}
                        {formatTime(ticket.departure_at)}
                      </strong>
                    </div>
                  </div>

                  <div className="confirmation-passengers">
                    <h3>Passengers</h3>

                    {ticket.passengers.map((passenger) => (
                      <div key={passenger.seat}>
                        <span>{passenger.name}</span>

                        <strong>Seat {passenger.seat}</strong>

                        <strong>{formatCurrency(passenger.fare)}</strong>
                      </div>
                    ))}
                  </div>

                  <div className="confirmation-total">
                    <span>Total Paid</span>

                    <strong>{formatCurrency(ticket.total_amount)}</strong>
                  </div>
                </div>

                <div className="confirmation-actions">
                  <button
                    type="button"
                    className="booking-primary-button"
                    onClick={() => history.push('/home')}
                  >
                    Book Another Trip
                  </button>
                </div>
              </section>
            )}
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
}
