import { useEffect, useMemo, useState } from 'react';
import { IonContent, IonIcon, IonPage } from '@ionic/react';
import {
  arrowBackOutline,
  busOutline,
  calendarOutline,
  checkmarkCircleOutline,
  locationOutline,
  swapHorizontalOutline,
  timeOutline,
} from 'ionicons/icons';
import { useHistory, useParams } from 'react-router-dom';
import './CustomerReschedulePage.css';
const API = import.meta.env.VITE_BOOKING_API_URL || 'http://localhost:4000/api/bookings';
const token = () => localStorage.getItem('customer_access_token') || '';
type Trip = {
  id: string;
  service_number: string;
  departure_at: string;
  arrival_at: string;
  operator: string;
  bus: string;
  bus_type: string;
  starting_fare: string | number;
  available_seats: number;
};
type Seat = {
  id: string;
  seat_number: string;
  seat_type: string;
  status: string;
  fare: string | number;
};
type Stop = {
  id: string;
  location_name: string;
  city: string;
  stop_order: number;
  scheduled_at?: string;
};
type Quote = {
  oldTotal: number;
  newFare: number;
  rescheduleFee: number;
  newTotal: number;
  fareDifference: number;
  paymentRequired: number;
  refundDue: number;
  currency: string;
};
const fmt = (v: string) =>
  new Date(v).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
const money = (v: number | string) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(v) || 0);
export default function CustomerReschedulePage() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const history = useHistory();
  const [options, setOptions] = useState<Trip[]>([]),
    [passengerCount, setPassengerCount] = useState(1),
    [fee, setFee] = useState(0),
    [selectedTrip, setSelectedTrip] = useState<Trip | null>(null),
    [seats, setSeats] = useState<Seat[]>([]),
    [boarding, setBoarding] = useState<Stop[]>([]),
    [dropping, setDropping] = useState<Stop[]>([]),
    [seatIds, setSeatIds] = useState<string[]>([]),
    [boardId, setBoardId] = useState(''),
    [dropId, setDropId] = useState(''),
    [quote, setQuote] = useState<Quote | null>(null),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState('');
  async function req(path: string, options: RequestInit = {}) {
    const r = await fetch(`${API}${path}`, {
      ...options,
      headers: {
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        Authorization: `Bearer ${token()}`,
        ...(options.headers || {}),
      },
    });
    const b = await r.json();
    if (!r.ok || b.success === false) throw new Error(b.message || 'Request failed');
    return b.data;
  }
  async function load() {
    try {
      setBusy(true);
      setMessage('');
      const d = await req(`/${bookingId}/reschedule/options`);
      setOptions(d.options || []);
      setPassengerCount(Number(d.passengerCount) || 1);
      setFee(Number(d.rescheduleFee) || 0);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Unable to load alternatives');
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    void load();
  }, [bookingId]);
  async function chooseTrip(t: Trip) {
    try {
      setBusy(true);
      setMessage('');
      setQuote(null);
      setSeatIds([]);
      setSelectedTrip(t);
      const d = await req(`/trips/${t.id}/seats`);
      setSeats((d.seats || []).filter((x: Seat) => x.status === 'AVAILABLE'));
      setBoarding(d.boardingPoints || []);
      setDropping(d.droppingPoints || []);
      setBoardId(d.boardingPoints?.[0]?.id || d.trip?.origin_stop_id || '');
      setDropId(
        d.droppingPoints?.[d.droppingPoints.length - 1]?.id || d.trip?.destination_stop_id || '',
      );
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Unable to load replacement seats');
    } finally {
      setBusy(false);
    }
  }
  function seatToggle(id: string) {
    setQuote(null);
    setSeatIds((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : prev.length >= passengerCount
          ? prev
          : [...prev, id],
    );
  }
  async function getQuote() {
    if (!selectedTrip || seatIds.length !== passengerCount || !boardId || !dropId) {
      setMessage(
        `Choose ${passengerCount} seat${passengerCount > 1 ? 's' : ''}, boarding and dropping points.`,
      );
      return;
    }
    const boardStop = boarding.find((x) => x.id === boardId);
    const dropStop = dropping.find((x) => x.id === dropId);
    if (
      boardId === dropId ||
      (boardStop && dropStop && boardStop.stop_order >= dropStop.stop_order)
    ) {
      setMessage('Choose valid boarding and dropping points.');
      return;
    }
    try {
      setBusy(true);
      setMessage('');
      const d = await req(`/${bookingId}/reschedule/quote`, {
        method: 'POST',
        body: JSON.stringify({
          newTripId: selectedTrip.id,
          newOriginStopId: boardId,
          newDestinationStopId: dropId,
          newSeatIds: seatIds,
        }),
      });
      setQuote(d);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Unable to calculate reschedule price');
    } finally {
      setBusy(false);
    }
  }
  async function confirm() {
    if (!selectedTrip || !quote) return;
    const boardStop = boarding.find((x) => x.id === boardId);
    const dropStop = dropping.find((x) => x.id === dropId);
    if (
      boardId === dropId ||
      (boardStop && dropStop && boardStop.stop_order >= dropStop.stop_order)
    ) {
      setMessage('Choose valid boarding and dropping points.');
      return;
    }
    try {
      setBusy(true);
      setMessage('');
      await req(`/${bookingId}/reschedule/confirm`, {
        method: 'POST',
        body: JSON.stringify({
          newTripId: selectedTrip.id,
          newOriginStopId: boardId,
          newDestinationStopId: dropId,
          newSeatIds: seatIds,
        }),
      });
      setMessage('Booking rescheduled successfully. Your updated trip is ready.');
      setTimeout(() => history.push('/bookings'), 1000);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Unable to complete reschedule');
    } finally {
      setBusy(false);
    }
  }
  const selectedSeats = useMemo(
    () => seats.filter((x) => seatIds.includes(x.id)),
    [seats, seatIds],
  );
  return (
    <IonPage>
      <IonContent fullscreen>
        <main className="reschedule-page">
          <header className="reschedule-header">
            <button onClick={() => history.push('/bookings')}>
              <IonIcon icon={arrowBackOutline} />
              My bookings
            </button>
            <span>CHANGE JOURNEY</span>
            <h1>Reschedule your trip</h1>
            <p>
              Choose another service from the same operator and route. Your fare difference is
              calculated before confirmation.
            </p>
          </header>
          {message && (
            <div
              className={`reschedule-message ${message.includes('successfully') ? 'success' : ''}`}
            >
              {message}
            </div>
          )}
          <div className="reschedule-layout">
            <section className="reschedule-main">
              <div className="reschedule-section-head">
                <div>
                  <b>1</b>
                  <h2>Choose another trip</h2>
                </div>
                <small>{options.length} eligible services</small>
              </div>
              <div className="reschedule-trip-list">
                {options.map((t) => (
                  <button
                    key={t.id}
                    className={selectedTrip?.id === t.id ? 'active' : ''}
                    onClick={() => void chooseTrip(t)}
                  >
                    <div>
                      <strong>{t.operator}</strong>
                      <span>
                        {t.bus} · {t.bus_type}
                      </span>
                    </div>
                    <div className="reschedule-time">
                      <IonIcon icon={timeOutline} />
                      <strong>{fmt(t.departure_at)}</strong>
                      <span>→ {fmt(t.arrival_at)}</span>
                    </div>
                    <div className="reschedule-fare">
                      <strong>{money(t.starting_fare)}</strong>
                      <span>{t.available_seats} seats</span>
                    </div>
                  </button>
                ))}
              </div>
              {selectedTrip && (
                <>
                  <div className="reschedule-section-head">
                    <div>
                      <b>2</b>
                      <h2>Choose replacement seats</h2>
                    </div>
                    <small>
                      {seatIds.length}/{passengerCount} selected
                    </small>
                  </div>
                  <div className="reschedule-seats">
                    {seats.map((s) => (
                      <button
                        key={s.id}
                        className={seatIds.includes(s.id) ? 'selected' : ''}
                        onClick={() => seatToggle(s.id)}
                      >
                        <IonIcon icon={busOutline} />
                        <strong>{s.seat_number}</strong>
                        <span>{money(s.fare)}</span>
                      </button>
                    ))}
                  </div>
                  <div className="reschedule-stop-grid">
                    <label>
                      <IonIcon icon={locationOutline} />
                      Boarding point
                      <select
                        value={boardId}
                        onChange={(e) => {
                          setBoardId(e.target.value);
                          setQuote(null);
                        }}
                      >
                        {boarding.map((x) => (
                          <option value={x.id} key={x.id}>
                            {x.location_name}
                            {x.scheduled_at ? ` · ${fmt(x.scheduled_at)}` : ''}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <IonIcon icon={locationOutline} />
                      Dropping point
                      <select
                        value={dropId}
                        onChange={(e) => {
                          setDropId(e.target.value);
                          setQuote(null);
                        }}
                      >
                        {dropping.map((x) => (
                          <option value={x.id} key={x.id}>
                            {x.location_name}
                            {x.scheduled_at ? ` · ${fmt(x.scheduled_at)}` : ''}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <button
                    className="reschedule-quote-btn"
                    disabled={busy || seatIds.length !== passengerCount}
                    onClick={() => void getQuote()}
                  >
                    <IonIcon icon={swapHorizontalOutline} />
                    Calculate fare difference
                  </button>
                </>
              )}
            </section>
            <aside className="reschedule-summary">
              <div className="reschedule-summary-icon">
                <IonIcon icon={calendarOutline} />
              </div>
              <h2>Reschedule summary</h2>
              {!selectedTrip ? (
                <p>Choose a replacement service to see the new journey details.</p>
              ) : (
                <>
                  <div className="summary-route">
                    <strong>{selectedTrip.service_number}</strong>
                    <span>{fmt(selectedTrip.departure_at)}</span>
                  </div>
                  <div className="summary-seats">
                    <span>Seats</span>
                    <strong>
                      {selectedSeats.map((x) => x.seat_number).join(', ') || 'Not selected'}
                    </strong>
                  </div>
                  <div className="summary-line">
                    <span>Reschedule fee</span>
                    <strong>{money(fee)}</strong>
                  </div>
                  {quote && (
                    <>
                      <div className="summary-line">
                        <span>Old booking total</span>
                        <strong>{money(quote.oldTotal)}</strong>
                      </div>
                      <div className="summary-line">
                        <span>New fare + fee</span>
                        <strong>{money(quote.newTotal)}</strong>
                      </div>
                      <div
                        className={`summary-difference ${quote.fareDifference > 0 ? 'pay' : 'refund'}`}
                      >
                        <span>
                          {quote.fareDifference > 0
                            ? 'Additional payment'
                            : quote.fareDifference < 0
                              ? 'Refund due'
                              : 'Fare difference'}
                        </span>
                        <strong>{money(Math.abs(quote.fareDifference))}</strong>
                      </div>
                      <div className="summary-safe">
                        <IonIcon icon={checkmarkCircleOutline} />
                        <span>
                          The current booking stays unchanged until rescheduling succeeds.
                        </span>
                      </div>
                      <button
                        className="reschedule-confirm"
                        disabled={busy}
                        onClick={() => void confirm()}
                      >
                        {busy ? 'Processing…' : 'Confirm reschedule'}
                      </button>
                    </>
                  )}
                </>
              )}
            </aside>
          </div>
        </main>
      </IonContent>
    </IonPage>
  );
}
