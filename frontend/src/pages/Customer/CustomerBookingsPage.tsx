import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  IonContent,
  IonIcon,
  IonPage,
} from '@ionic/react';

import {
  arrowBackOutline,
  busOutline,
  callOutline,
  cardOutline,
  checkmarkCircleOutline,
  closeOutline,
  downloadOutline,
  ellipsisHorizontalOutline,
  locationOutline,
  personOutline,
  peopleOutline,
  refreshOutline,
  searchOutline,
  starOutline,
  swapHorizontalOutline,
  ticketOutline,
  timeOutline,
} from 'ionicons/icons';

import { useHistory } from 'react-router-dom';

import './CustomerBookingsPage.css';

/* =========================================================
   API
========================================================= */

const API =
  import.meta.env.VITE_BOOKING_API_URL ||
  'http://localhost:4000/api/bookings';

const TRACKING_API =
  import.meta.env.VITE_TRACKING_API_URL ||
  'http://localhost:4000/api/tracking';

/* =========================================================
   TYPES
========================================================= */

type Passenger = {
  name: string;
  seat: string;
  fare: string;
  age?: number;
  gender?: string;
  seat_type?: string;
  deck?: number;
};

type Booking = {
  id: string;
  trip_id: string;

  booking_reference: string;
  status: string;

  total_amount: string;
  currency: string;

  created_at: string;

  service_number: string;

  departure_at: string;
  arrival_at: string;

  source_city: string;
  destination_city: string;

  operator: string;
  bus: string;

  boarding_point: string;
  dropping_point: string;

  payment_status: string;
  payment_method?: string;

  passengers: Passenger[];
  review_rating?: number | null;
  review_text?: string | null;
};

type CustomerProfile = {
  id?: string;
  name?: string;
  fullName?: string;
  mobile?: string;
  phone?: string;
  email?: string;
};

type BookingTab =
  | 'upcoming'
  | 'completed'
  | 'cancelled';

type DialogType =
  | 'ticket'
  | 'manage'
  | 'tracking'
  | null;

type TrackingStop = { id: string; order: number; city: string; name: string; address?: string; lat?: number | null; lng?: number | null; scheduledAt?: string };
type TrackingExperience = {
  trip: { serviceNumber: string; source: string; destination: string; departureAt: string; arrivalAt: string; bus: string; operator: string };
  location: { lat: number; lng: number; speed?: number | null; heading?: number | null; timestamp: string } | null;
  history: Array<{ lat: number; lng: number; timestamp: string }>;
  stops: TrackingStop[];
  status: { freshness: 'LIVE' | 'DELAYED' | 'OFFLINE' | 'WAITING'; ageSeconds: number | null; progress: number; nextStop: TrackingStop | null; distanceKm: number | null; etaMinutes: number | null; estimatedArrival: string | null; delayMinutes: number };
};
type BoardingPass = { booking_reference: string; otp: string; qrPayload: string; boarding_point: string; departure_at: string; passengers: Array<{ id: string; name: string; seat: string; boarding_status: string; verified_at?: string }> };

/* =========================================================
   HELPERS
========================================================= */

const money = (
  value: string | number,
) =>
  new Intl.NumberFormat(
    'en-IN',
    {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    },
  ).format(
    Number(value) || 0,
  );

const formatDate = (
  value?: string,
) => {
  if (!value) {
    return '—';
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return value;
  }

  return date.toLocaleDateString(
    'en-IN',
    {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    },
  );
};

const formatTime = (
  value?: string,
) => {
  if (!value) {
    return '—';
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return value;
  }

  return date.toLocaleTimeString(
    'en-IN',
    {
      hour: '2-digit',
      minute: '2-digit',
    },
  );
};

const getDuration = (
  departure?: string,
  arrival?: string,
) => {
  if (
    !departure ||
    !arrival
  ) {
    return '—';
  }

  const start =
    new Date(
      departure,
    ).getTime();

  const end =
    new Date(
      arrival,
    ).getTime();

  if (
    Number.isNaN(start) ||
    Number.isNaN(end) ||
    end <= start
  ) {
    return '—';
  }

  const minutes =
    Math.floor(
      (end - start) /
        60000,
    );

  const hours =
    Math.floor(
      minutes / 60,
    );

  const remaining =
    minutes % 60;

  if (hours === 0) {
    return `${remaining}m`;
  }

  return `${hours}h ${remaining}m`;
};

const customerStatus = (
  status?: string,
) => {
  switch (
    String(
      status || '',
    ).toUpperCase()
  ) {
    case 'CONFIRMED':
      return 'Confirmed';

    case 'CANCELLED':
      return 'Cancelled';

    case 'PENDING':
      return 'Pending';

    case 'COMPLETED':
      return 'Completed';

    case 'FAILED':
      return 'Failed';

    default:
      return (
        status ||
        'Confirmed'
      );
  }
};

const paymentLabel = (
  status?: string,
) => {
  switch (
    String(
      status || '',
    ).toUpperCase()
  ) {
    case 'CAPTURED':
    case 'PAID':
    case 'SUCCESS':
      return 'Paid';

    case 'PENDING':
      return 'Payment pending';

    case 'FAILED':
      return 'Payment failed';

    case 'REFUNDED':
      return 'Refunded';

    case 'PARTIAL_REFUND':
      return 'Partially refunded';

    default:
      return (
        status ||
        '—'
      );
  }
};

function getCustomerProfile(): CustomerProfile {
  try {
    return JSON.parse(
      localStorage.getItem(
        'customer_profile',
      ) ||
        localStorage.getItem(
          'customer',
        ) ||
        '{}',
    );
  } catch {
    return {};
  }
}

/* =========================================================
   PAGE
========================================================= */

export default function CustomerBookingsPage() {
  const history =
    useHistory();

  const token =
    localStorage.getItem(
      'customer_access_token',
    );

  const profile =
    useMemo(
      getCustomerProfile,
      [],
    );

  const customerMobile =
    profile.mobile ||
    profile.phone ||
    localStorage.getItem(
      'customer_mobile',
    ) ||
    '';

  const customerName =
    profile.fullName ||
    profile.name ||
    'Customer';

  /* =======================================================
     STATE
  ======================================================= */

  const [
    items,
    setItems,
  ] =
    useState<Booking[]>(
      [],
    );

  const [
    loading,
    setLoading,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState('');

  const [
    activeTab,
    setActiveTab,
  ] =
    useState<BookingTab>(
      'upcoming',
    );

  const [
    search,
    setSearch,
  ] =
    useState('');

  const [
    selectedBooking,
    setSelectedBooking,
  ] =
    useState<Booking | null>(
      null,
    );

  const [
    dialog,
    setDialog,
  ] =
    useState<DialogType>(
      null,
    );

  const [
    actionBusy,
    setActionBusy,
  ] =
    useState(false);

  const [
    trackingMessage,
    setTrackingMessage,
  ] =
    useState('');

  const [tracking, setTracking] = useState<TrackingExperience | null>(null);
  const [trackingBusy, setTrackingBusy] = useState(false);
  const [boardingPass, setBoardingPass] = useState<BoardingPass | null>(null);

  /* =======================================================
     FILTER BOOKINGS
  ======================================================= */

  const bookingCounts =
    useMemo(() => {
      const now =
        Date.now();

      const counts = {
        upcoming: 0,
        completed: 0,
        cancelled: 0,
      };

      items.forEach(
        (booking) => {
          const cancelled =
            String(
              booking.status,
            ).toUpperCase() ===
            'CANCELLED';

          const completed =
            !cancelled &&
            new Date(
              booking.arrival_at,
            ).getTime() <
              now;

          if (cancelled) {
            counts.cancelled +=
              1;
          } else if (
            completed
          ) {
            counts.completed +=
              1;
          } else {
            counts.upcoming +=
              1;
          }
        },
      );

      return counts;
    }, [items]);

  const visibleItems =
    useMemo(() => {
      const now =
        Date.now();

      const query =
        search
          .trim()
          .toLowerCase();

      return items.filter(
        (booking) => {
          const cancelled =
            String(
              booking.status,
            ).toUpperCase() ===
            'CANCELLED';

          const completed =
            !cancelled &&
            new Date(
              booking.arrival_at,
            ).getTime() <
              now;

          const category:
            BookingTab =
            cancelled
              ? 'cancelled'
              : completed
                ? 'completed'
                : 'upcoming';

          const haystack =
            [
              booking.booking_reference,
              booking.source_city,
              booking.destination_city,
              booking.operator,
              booking.bus,
              booking.service_number,
              booking.boarding_point,
              booking.dropping_point,
            ]
              .join(' ')
              .toLowerCase();

          return (
            category ===
              activeTab &&
            (!query ||
              haystack.includes(
                query,
              ))
          );
        },
      );
    }, [
      items,
      activeTab,
      search,
    ]);

  /* =======================================================
     LOAD
  ======================================================= */

  const load =
    async () => {
      if (!token) {
        return;
      }

      try {
        setLoading(true);
        setError('');

        const normalized =
          String(
            customerMobile,
          ).replace(
            /\D/g,
            '',
          );

        if (
          !/^[6-9]\d{9}$/.test(
            normalized,
          )
        ) {
          throw new Error(
            'Customer mobile number is not available in the logged-in profile.',
          );
        }

        const response =
          await fetch(
            `${API}/customer?mobile=${encodeURIComponent(
              normalized,
            )}`,
            {
              headers: {
                Authorization:
                  `Bearer ${token}`,
              },
            },
          );

        const text =
          await response.text();

        let body: any;

        try {
          body =
            text
              ? JSON.parse(
                  text,
                )
              : {};
        } catch {
          throw new Error(
            'Booking service returned an invalid response.',
          );
        }

        if (
          !response.ok ||
          body.success ===
            false
        ) {
          if (response.status === 401 || response.status === 403) {
            localStorage.removeItem('customer_access_token');
            localStorage.removeItem('customer_refresh_token');
            history.replace('/login?returnTo=%2Fbookings');
          }
          throw new Error(
            body.message ||
              'Unable to load bookings.',
          );
        }

        setItems(
          Array.isArray(
            body.data,
          )
            ? body.data
            : [],
        );
      } catch (
        requestError
      ) {
        setError(
          requestError instanceof
            Error
            ? requestError.message
            : 'Unable to load bookings.',
        );
      } finally {
        setLoading(false);
      }
    };

  useEffect(
    () => {
      if (token) {
        void load();
      }
    },
    [token],
  );

  /* =======================================================
     ACTIONS
  ======================================================= */

  const openDialog = (
    booking: Booking,
    nextDialog:
      | 'ticket'
      | 'manage'
      | 'tracking',
  ) => {
    setSelectedBooking(
      booking,
    );

    setDialog(
      nextDialog,
    );

    setError('');

    if (nextDialog === 'ticket') {
      setBoardingPass(null);
      void fetch(`${API}/${booking.id}/boarding-pass`, { headers: { Authorization: `Bearer ${token}` } })
        .then(async (response) => { const body=await response.json(); if(!response.ok||body.success===false) throw new Error(body.message); setBoardingPass(body.data); })
        .catch(() => setBoardingPass(null));
    }

    if (
      nextDialog ===
      'tracking'
    ) {
      setTracking(null);
      void loadTracking(
        booking,
      );
    }
  };

  const downloadTicket = (
    booking: Booking,
  ) => {
    const passengerLines =
      booking.passengers
        .map(
          (passenger) =>
            `${passenger.name} — Seat ${passenger.seat} — ${money(
              passenger.fare,
            )}`,
        )
        .join('\n');

    const content =
      `BUSGO E-TICKET

PNR: ${booking.booking_reference}
Status: ${booking.status}

Route:
${booking.source_city} → ${booking.destination_city}

Operator: ${booking.operator}
Bus: ${booking.bus}
Service: ${booking.service_number}

Departure:
${formatDate(booking.departure_at)}
${formatTime(booking.departure_at)}

Arrival:
${formatDate(booking.arrival_at)}
${formatTime(booking.arrival_at)}

Boarding:
${booking.boarding_point}

Dropping:
${booking.dropping_point}

PASSENGERS
${passengerLines}

Payment:
${paymentLabel(booking.payment_status)}
${booking.payment_method || 'N/A'}

Total:
${money(booking.total_amount)}
`;

    const url =
      URL.createObjectURL(
        new Blob(
          [content],
          {
            type: 'text/plain;charset=utf-8',
          },
        ),
      );

    const anchor =
      document.createElement(
        'a',
      );

    anchor.href =
      url;

    anchor.download =
      `BusGo-${booking.booking_reference}.txt`;

    anchor.click();

    URL.revokeObjectURL(
      url,
    );
  };

  const loadTracking =
    async (
      booking: Booking,
    ) => {
      try {
        setTrackingBusy(true);
        setTrackingMessage(
          'Checking the latest bus location...',
        );

        const response =
          await fetch(
            `${TRACKING_API}/experience/${booking.trip_id}`,
            { headers: { Authorization: `Bearer ${token}` } },
          );

        const body =
          await response.json();

        if (
          !response.ok ||
          body.success ===
            false
        ) {
          throw new Error(
            body.message ||
              'Live tracking has not started yet.',
          );
        }

        setTracking(body.data);
        setTrackingMessage(
          body.data?.status?.freshness === 'WAITING'
            ? 'Waiting for the first GPS update. Times below use the published schedule.'
            : 'Vehicle position and ETA update automatically every 15 seconds.',
        );
      } catch (
        requestError
      ) {
        setTrackingMessage(
          requestError instanceof
            Error
            ? requestError.message
            : 'Live tracking has not started yet.',
        );
      } finally {
        setTrackingBusy(false);
      }
    };

  useEffect(() => {
    if (dialog !== 'tracking' || !selectedBooking) return undefined;
    const timer = window.setInterval(() => void loadTracking(selectedBooking), 15000);
    return () => window.clearInterval(timer);
  }, [dialog, selectedBooking?.trip_id]);

  const cancelBooking =
    async (
      booking: Booking,
    ) => {
      try {
        setActionBusy(true);
        const quoteResponse=await fetch(`${API}/${booking.id}/cancellation-quote`,{headers:{Authorization:`Bearer ${token}`}});
        const quoteBody=await quoteResponse.json();
        if(!quoteResponse.ok||quoteBody.success===false) throw new Error(quoteBody.message||'Unable to calculate cancellation refund.');
        const quote=quoteBody.data;
        const confirmed=window.confirm(`Cancel ticket ${booking.booking_reference}?\n\n${quote.policy}\nRefund: ${money(quote.refundAmount)}\nCancellation fee: ${money(quote.cancellationFee)}\n\nThe seats will be released after cancellation.`);
        if(!confirmed){setActionBusy(false);return;}

        setActionBusy(
          true,
        );

        const response =
          await fetch(
            `${API}/${booking.id}/cancel`,
            {
              method:
                'PATCH',

              headers: {
                Authorization:
                  `Bearer ${token}`,
              },
            },
          );

        const body =
          await response.json();

        if (
          !response.ok ||
          body.success ===
            false
        ) {
          throw new Error(
            body.message ||
              'Unable to cancel this ticket.',
          );
        }

        setDialog(null);

        setActiveTab(
          'cancelled',
        );

        await load();
      } catch (
        requestError
      ) {
        setError(
          requestError instanceof
            Error
            ? requestError.message
            : 'Unable to cancel this ticket.',
        );
      } finally {
        setActionBusy(
          false,
        );
      }
    };

  /* =======================================================
     LOGIN REQUIRED
  ======================================================= */

  if (!token) {
    return (
      <IonPage>
        <IonContent fullscreen>

          <div className="booking-login-page">

            <header className="booking-public-header">

              <button
                type="button"
                className="booking-logo"
                onClick={() =>
                  history.push(
                    '/home',
                  )
                }
              >
                <span>
                  <IonIcon
                    icon={
                      busOutline
                    }
                  />
                </span>

                <strong>
                  BusGo
                </strong>
              </button>

              <button
                type="button"
                className="booking-home-link"
                onClick={() =>
                  history.push(
                    '/home',
                  )
                }
              >
                Home
              </button>

            </header>

            <main className="booking-login-main">

              <section className="booking-login-card">

                <div className="booking-login-icon">
                  <IonIcon
                    icon={
                      ticketOutline
                    }
                  />
                </div>

                <span className="booking-section-label">
                  MY TRIPS
                </span>

                <h1>
                  Your journeys,
                  in one place.
                </h1>

                <p>
                  Login to access tickets,
                  passenger details,
                  payment information and
                  manage your journeys.
                </p>

                <button
                  type="button"
                  className="booking-login-primary"
                  onClick={() =>
                    history.push(
                      '/login?returnTo=/bookings',
                    )
                  }
                >
                  Login to continue
                </button>

                <div className="booking-login-signup">
                  New to BusGo?

                  <button
                    type="button"
                    onClick={() =>
                      history.push(
                        '/signup?returnTo=/bookings',
                      )
                    }
                  >
                    Create account
                  </button>
                </div>

                <div className="booking-login-divider">
                  <span>
                    OR
                  </span>
                </div>

                <button
                  type="button"
                  className="booking-guest-button"
                  onClick={() =>
                    history.push(
                      '/customer/login',
                    )
                  }
                >
                  <IonIcon
                    icon={
                      searchOutline
                    }
                  />

                  Sign in to find your booking
                </button>

              </section>

            </main>

          </div>

        </IonContent>
      </IonPage>
    );
  }

  /* =======================================================
     LOGGED-IN PAGE
  ======================================================= */

  return (
    <IonPage>

      <IonContent fullscreen>

        <div className="my-trips-page">

          {/* ===============================================
              NAV
          ================================================ */}

          <header className="my-trips-nav">

            <div className="my-trips-nav-inner">

              <button
                type="button"
                className="my-trips-brand"
                onClick={() =>
                  history.push(
                    '/home',
                  )
                }
              >
                <span>
                  <IonIcon
                    icon={
                      busOutline
                    }
                  />
                </span>

                <strong>
                  BusGo
                </strong>
              </button>

              <nav>

                <button
                  type="button"
                  onClick={() =>
                    history.push(
                      '/home',
                    )
                  }
                >
                  Home
                </button>

                <button
                  type="button"
                  className="active"
                >
                  Bookings
                </button>

                <button
                  type="button"
                  onClick={() =>
                    history.push(
                      '/offers',
                    )
                  }
                >
                  Offers
                </button>

                <button
                  type="button"
                  onClick={() =>
                    history.push(
                      '/profile',
                    )
                  }
                >
                  My Account
                </button>

              </nav>

            </div>

          </header>

          {/* ===============================================
              CONTENT
          ================================================ */}

          <main className="my-trips-container">

            {/* PAGE HEADER */}

            <div className="my-trips-page-header">

              <div>

                <button
                  type="button"
                  className="my-trips-back"
                  onClick={() =>
                    history.push(
                      '/home',
                    )
                  }
                >
                  <IonIcon
                    icon={
                      arrowBackOutline
                    }
                  />

                  Back
                </button>

                <span className="booking-section-label">
                  MY TRIPS
                </span>

                <h1>
                  Your bookings
                </h1>

                <p>
                  Welcome {customerName}.
                  Manage upcoming and
                  previous journeys.
                </p>

              </div>

              <button
                type="button"
                className="my-trips-refresh"
                disabled={
                  loading
                }
                onClick={() =>
                  void load()
                }
              >
                <IonIcon
                  icon={
                    refreshOutline
                  }
                />

                {loading
                  ? 'Refreshing'
                  : 'Refresh'}
              </button>

            </div>

            {/* ERROR */}

            {error && (
              <div className="my-trips-error">
                {error}
              </div>
            )}

            {/* ===============================================
                TOOLBAR
            ================================================ */}

            <section className="my-trips-toolbar">

              <div className="my-trips-tabs">

                {(
                  [
                    'upcoming',
                    'completed',
                    'cancelled',
                  ] as const
                ).map(
                  (
                    tab,
                  ) => (
                    <button
                      key={
                        tab
                      }
                      type="button"
                      className={
                        activeTab ===
                        tab
                          ? 'active'
                          : ''
                      }
                      onClick={() =>
                        setActiveTab(
                          tab,
                        )
                      }
                    >
                      {tab
                        .charAt(
                          0,
                        )
                        .toUpperCase() +
                        tab.slice(
                          1,
                        )}

                      <span>
                        {
                          bookingCounts[
                            tab
                          ]
                        }
                      </span>

                    </button>
                  ),
                )}

              </div>

              <label className="my-trips-search">

                <IonIcon
                  icon={
                    searchOutline
                  }
                />

                <input
                  value={
                    search
                  }
                  onChange={(
                    event,
                  ) =>
                    setSearch(
                      event
                        .target
                        .value,
                    )
                  }
                  placeholder="Search PNR, route, bus or operator"
                />

                {search && (
                  <button
                    type="button"
                    onClick={() =>
                      setSearch(
                        '',
                      )
                    }
                  >
                    <IonIcon
                      icon={
                        closeOutline
                      }
                    />
                  </button>
                )}

              </label>

            </section>

            {/* ===============================================
                LOADING
            ================================================ */}

            {loading ? (
              <section className="my-trips-empty">

                <div className="booking-loader" />

                <h2>
                  Loading your journeys
                </h2>

                <p>
                  Fetching your latest
                  bookings.
                </p>

              </section>
            ) : visibleItems.length ===
              0 ? (
              <section className="my-trips-empty">

                <div className="my-trips-empty-icon">
                  <IonIcon
                    icon={
                      ticketOutline
                    }
                  />
                </div>

                <h2>
                  No {activeTab} trips
                </h2>

                <p>
                  We couldn't find any journeys
                  for this section.
                </p>

                <button
                  type="button"
                  onClick={() =>
                    history.push(
                      '/home',
                    )
                  }
                >
                  Search buses
                </button>

              </section>
            ) : (
              <section className="my-trips-list">

                <div className="my-trips-section-heading">

                  <span>
                    {activeTab ===
                    'upcoming'
                      ? 'UPCOMING JOURNEYS'
                      : activeTab ===
                          'completed'
                        ? 'PAST JOURNEYS'
                        : 'CANCELLED JOURNEYS'}
                  </span>

                  <strong>
                    {
                      visibleItems.length
                    }{' '}
                    {visibleItems.length ===
                    1
                      ? 'booking'
                      : 'bookings'}
                  </strong>

                </div>

                {visibleItems.map(
                  (
                    booking,
                  ) => {
                    const duration =
                      getDuration(
                        booking.departure_at,
                        booking.arrival_at,
                      );

                    return (
                      <article
                        key={
                          booking.id
                        }
                        className="trip-ticket"
                      >

                        {/* =================================
                            TOP
                        ================================== */}

                        <div className="trip-ticket-header">

                          <div className="trip-ticket-operator">

                            <span className="trip-ticket-logo">
                              <IonIcon
                                icon={
                                  busOutline
                                }
                              />
                            </span>

                            <div>

                              <div className="trip-ticket-operator-name">
                                {
                                  booking.operator
                                }
                              </div>

                              <div className="trip-ticket-meta">
                                {
                                  booking.bus
                                }

                                <span>
                                  •
                                </span>

                                Service{' '}
                                {
                                  booking.service_number
                                }
                              </div>

                            </div>

                          </div>

                          <div className="trip-ticket-header-right">

                            <span
                              className={`trip-status ${String(
                                booking.status,
                              )
                                .toLowerCase()
                                .replaceAll(
                                  '_',
                                  '-',
                                )}`}
                            >
                              <IonIcon
                                icon={
                                  checkmarkCircleOutline
                                }
                              />

                              {customerStatus(
                                booking.status,
                              )}
                            </span>

                            <strong>
                              {money(
                                booking.total_amount,
                              )}
                            </strong>

                          </div>

                        </div>

                        {/* =================================
                            ROUTE
                        ================================== */}

                        <div className="trip-ticket-route">

                          <div className="trip-city-block">

                            <span>
                              Departure
                            </span>

                            <strong>
                              {formatTime(
                                booking.departure_at,
                              )}
                            </strong>

                            <h3>
                              {
                                booking.source_city
                              }
                            </h3>

                            <small>
                              {formatDate(
                                booking.departure_at,
                              )}
                            </small>

                          </div>

                          <div className="trip-route-middle">

                            <div className="trip-route-duration">

                              <IonIcon
                                icon={
                                  timeOutline
                                }
                              />

                              {
                                duration
                              }

                            </div>

                            <div className="trip-route-line">

                              <span className="route-dot" />

                              <span className="route-line" />

                              <span className="route-bus">
                                <IonIcon
                                  icon={
                                    busOutline
                                  }
                                />
                              </span>

                              <span className="route-line" />

                              <span className="route-dot" />

                            </div>

                          </div>

                          <div className="trip-city-block trip-city-right">

                            <span>
                              Arrival
                            </span>

                            <strong>
                              {formatTime(
                                booking.arrival_at,
                              )}
                            </strong>

                            <h3>
                              {
                                booking.destination_city
                              }
                            </h3>

                            <small>
                              {formatDate(
                                booking.arrival_at,
                              )}
                            </small>

                          </div>

                        </div>

                        {/* =================================
                            JOURNEY DETAILS
                        ================================== */}

                        <div className="trip-ticket-details">

                          <div className="trip-detail-item">

                            <span className="trip-detail-icon">
                              <IonIcon
                                icon={
                                  locationOutline
                                }
                              />
                            </span>

                            <div>
                              <span>
                                Boarding point
                              </span>

                              <strong>
                                {booking.boarding_point ||
                                  'Not available'}
                              </strong>
                            </div>

                          </div>

                          <div className="trip-detail-item">

                            <span className="trip-detail-icon">
                              <IonIcon
                                icon={
                                  locationOutline
                                }
                              />
                            </span>

                            <div>
                              <span>
                                Dropping point
                              </span>

                              <strong>
                                {booking.dropping_point ||
                                  'Not available'}
                              </strong>
                            </div>

                          </div>

                          <div className="trip-detail-item">

                            <span className="trip-detail-icon payment">
                              <IonIcon
                                icon={
                                  cardOutline
                                }
                              />
                            </span>

                            <div>
                              <span>
                                Payment
                              </span>

                              <strong className="payment-success">
                                {paymentLabel(
                                  booking.payment_status,
                                )}
                              </strong>

                              <small>
                                {booking.payment_method ||
                                  '—'}
                              </small>
                            </div>

                          </div>

                          <div className="trip-detail-item">

                            <span className="trip-detail-icon">
                              <IonIcon
                                icon={
                                  ticketOutline
                                }
                              />
                            </span>

                            <div>
                              <span>
                                Booking ID
                              </span>

                              <strong className="booking-pnr">
                                {
                                  booking.booking_reference
                                }
                              </strong>
                            </div>

                          </div>

                        </div>

                        {/* =================================
                            PASSENGERS
                        ================================== */}

                        <div className="trip-passengers-section">

                          <div className="trip-passenger-title">

                            <div>

                              <IonIcon
                                icon={
                                  peopleOutline
                                }
                              />

                              <strong>
                                Passengers
                              </strong>

                            </div>

                            <span>
                              {
                                booking.passengers
                                  .length
                              }{' '}
                              {booking.passengers
                                .length ===
                              1
                                ? 'passenger'
                                : 'passengers'}
                            </span>

                          </div>

                          <div className="trip-passenger-list">

                            {booking.passengers.map(
                              (
                                passenger,
                                index,
                              ) => (
                                <div
                                  key={`${booking.id}-${passenger.seat}-${index}`}
                                  className="trip-passenger-row"
                                >

                                  <div className="trip-passenger-avatar">

                                    <IonIcon
                                      icon={
                                        personOutline
                                      }
                                    />

                                  </div>

                                  <div className="trip-passenger-name">

                                    <strong>
                                      {
                                        passenger.name
                                      }
                                    </strong>

                                    <span>
                                      {passenger.gender ||
                                        'Passenger'}

                                      {passenger.age
                                        ? ` • ${passenger.age} yrs`
                                        : ''}
                                    </span>

                                  </div>

                                  <div className="trip-passenger-seat">

                                    <span>
                                      Seat
                                    </span>

                                    <strong>
                                      {
                                        passenger.seat
                                      }
                                    </strong>

                                  </div>

                                  <div className="trip-passenger-type">

                                    <span>
                                      Type
                                    </span>

                                    <strong>
                                      {passenger.seat_type ||
                                        'Seater'}
                                    </strong>

                                  </div>

                                  <div className="trip-passenger-fare">

                                    <span>
                                      Fare
                                    </span>

                                    <strong>
                                      {money(
                                        passenger.fare,
                                      )}
                                    </strong>

                                  </div>

                                </div>
                              ),
                            )}

                          </div>

                        </div>

                        {/* =================================
                            CANCELLED INFO
                        ================================== */}

                        {activeTab ===
                          'cancelled' && (
                          <div className="trip-refund-box">

                            <IonIcon
                              icon={
                                cardOutline
                              }
                            />

                            <div>
                              <strong>
                                Refund processing
                              </strong>

                              <span>
                                Refund information will
                                appear here once it has
                                been processed.
                              </span>
                            </div>

                          </div>
                        )}

                        {/* =================================
                            ACTIONS
                        ================================== */}

                        <footer className="trip-ticket-actions">

                          <div className="trip-ticket-main-actions">

                            <button
                              type="button"
                              className="trip-action-primary"
                              onClick={() =>
                                openDialog(
                                  booking,
                                  'ticket',
                                )
                              }
                            >
                              <IonIcon
                                icon={
                                  ticketOutline
                                }
                              />

                              View ticket
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                downloadTicket(
                                  booking,
                                )
                              }
                            >
                              <IonIcon
                                icon={
                                  downloadOutline
                                }
                              />

                              {activeTab ===
                              'completed'
                                ? 'Invoice'
                                : 'Download'}
                            </button>

                            {activeTab === 'completed' && (
                              <button
                                type="button"
                                onClick={() => history.push(`/bookings/${booking.id}/review`)}
                              >
                                <IonIcon icon={starOutline} />
                                {booking.review_rating ? 'Edit review' : 'Rate trip'}
                              </button>
                            )}

                            {activeTab ===
                              'upcoming' && (
                              <button
                                type="button"
                                onClick={() =>
                                  openDialog(
                                    booking,
                                    'tracking',
                                  )
                                }
                              >
                                <IonIcon
                                  icon={
                                    locationOutline
                                  }
                                />

                                Track bus
                              </button>
                            )}

                          </div>

                          {activeTab ===
                            'upcoming' && (
                            <button
                              type="button"
                              className="trip-manage-button"
                              onClick={() =>
                                openDialog(
                                  booking,
                                  'manage',
                                )
                              }
                            >
                              Manage booking

                              <IonIcon
                                icon={
                                  ellipsisHorizontalOutline
                                }
                              />
                            </button>
                          )}

                        </footer>

                      </article>
                    );
                  },
                )}

              </section>
            )}

          </main>

          {/* =================================================
              MODAL / DRAWER
          ================================================== */}

          {dialog &&
            selectedBooking && (
              <div
                className="booking-dialog-backdrop"
                onMouseDown={() =>
                  setDialog(
                    null,
                  )
                }
              >

                <aside
                  className="booking-dialog"
                  onMouseDown={(
                    event,
                  ) =>
                    event.stopPropagation()
                  }
                >

                  <header className="booking-dialog-header">

                    <div>

                      <span>
                        {dialog ===
                        'ticket'
                          ? 'E-TICKET'
                          : dialog ===
                              'manage'
                            ? 'MANAGE BOOKING'
                            : 'LIVE TRACKING'}
                      </span>

                      <h2>
                        {
                          selectedBooking.source_city
                        }
                        {' → '}
                        {
                          selectedBooking.destination_city
                        }
                      </h2>

                      <p>
                        {
                          selectedBooking.booking_reference
                        }
                      </p>

                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setDialog(
                          null,
                        )
                      }
                    >
                      <IonIcon
                        icon={
                          closeOutline
                        }
                      />
                    </button>

                  </header>

                  {/* TICKET */}

                  {dialog ===
                    'ticket' && (
                    <div className="booking-ticket-dialog-body">

                      <div className="dialog-operator">

                        <span>
                          <IonIcon
                            icon={
                              busOutline
                            }
                          />
                        </span>

                        <div>
                          <strong>
                            {
                              selectedBooking.operator
                            }
                          </strong>

                          <small>
                            {
                              selectedBooking.bus
                            }{' '}
                            • Service{' '}
                            {
                              selectedBooking.service_number
                            }
                          </small>
                        </div>

                      </div>

                      <div className="dialog-ticket-route">

                        <div>
                          <span>
                            DEPARTURE
                          </span>

                          <strong>
                            {formatTime(
                              selectedBooking.departure_at,
                            )}
                          </strong>

                          <small>
                            {formatDate(
                              selectedBooking.departure_at,
                            )}
                          </small>
                        </div>

                        <div className="dialog-ticket-bus">
                          <IonIcon
                            icon={
                              busOutline
                            }
                          />
                        </div>

                        <div>
                          <span>
                            ARRIVAL
                          </span>

                          <strong>
                            {formatTime(
                              selectedBooking.arrival_at,
                            )}
                          </strong>

                          <small>
                            {formatDate(
                              selectedBooking.arrival_at,
                            )}
                          </small>
                        </div>

                      </div>

                      <div className="dialog-location-grid">

                        <div>
                          <span>
                            Boarding
                          </span>

                          <strong>
                            {
                              selectedBooking.boarding_point
                            }
                          </strong>
                        </div>

                        <div>
                          <span>
                            Dropping
                          </span>

                          <strong>
                            {
                              selectedBooking.dropping_point
                            }
                          </strong>
                        </div>

                      </div>

                      <div className="dialog-passengers">

                        <h3>
                          Passengers
                        </h3>

                        {selectedBooking.passengers.map(
                          (
                            passenger,
                            index,
                          ) => (
                            <div
                              key={`${passenger.seat}-${index}`}
                            >

                              <span className="dialog-passenger-avatar">
                                <IonIcon
                                  icon={
                                    personOutline
                                  }
                                />
                              </span>

                              <div>
                                <strong>
                                  {
                                    passenger.name
                                  }
                                </strong>

                                <small>
                                  {passenger.seat_type ||
                                    'Seat'}
                                </small>
                              </div>

                              <div className="dialog-seat">
                                Seat{' '}
                                <strong>
                                  {
                                    passenger.seat
                                  }
                                </strong>
                              </div>

                            </div>
                          ),
                        )}

                      </div>

                      {boardingPass && (
                        <section className="boarding-pass-card">
                          <div className="boarding-pass-head">
                            <div><small>BOARDING VERIFICATION</small><strong>Show this to bus staff</strong></div>
                            <span>{boardingPass.passengers.every((p) => p.boarding_status === 'BOARDED') ? 'Boarded' : 'Ready to board'}</span>
                          </div>
                          <div className="boarding-code-grid">
                            <div className="boarding-qr" aria-label={`QR ticket ${boardingPass.qrPayload}`} title={boardingPass.qrPayload}>
                              {Array.from({length: 49}, (_, index) => <i key={index} className={(boardingPass.qrPayload.charCodeAt(index % boardingPass.qrPayload.length) + index) % 3 ? 'dark' : ''} />)}
                            </div>
                            <div><small>BOARDING OTP</small><strong className="boarding-otp">{boardingPass.otp}</strong><button type="button" onClick={() => void navigator.clipboard?.writeText(boardingPass.otp)}>Copy OTP</button></div>
                          </div>
                          <button className="copy-boarding-token" type="button" onClick={() => void navigator.clipboard?.writeText(boardingPass.qrPayload)}>Copy signed QR code</button>
                          <p>Board at <strong>{boardingPass.boarding_point}</strong> by {formatTime(boardingPass.departure_at)}. Staff may verify the signed ticket code or enter this OTP.</p>
                          <div className="boarding-passengers">
                            {boardingPass.passengers.map((passenger) => <span className={passenger.boarding_status.toLowerCase()} key={passenger.id}>Seat {passenger.seat} · {passenger.boarding_status.replace('_',' ')}</span>)}
                          </div>
                        </section>
                      )}

                      <div className="dialog-payment">

                        <div>
                          <span>
                            Payment
                          </span>

                          <strong>
                            {paymentLabel(
                              selectedBooking.payment_status,
                            )}
                          </strong>

                          <small>
                            {
                              selectedBooking.payment_method
                            }
                          </small>
                        </div>

                        <strong>
                          {money(
                            selectedBooking.total_amount,
                          )}
                        </strong>

                      </div>

                      <button
                        type="button"
                        className="dialog-main-action"
                        onClick={() =>
                          downloadTicket(
                            selectedBooking,
                          )
                        }
                      >
                        <IonIcon
                          icon={
                            downloadOutline
                          }
                        />

                        Download ticket
                      </button>

                    </div>
                  )}

                  {/* TRACKING */}

                  {dialog ===
                    'tracking' && (
                    <div className="booking-tracking-dialog">

                      <div className="tracking-visual">
                        <div className="tracking-map-grid" />
                        <div className="tracking-route-line" />
                        <span className="tracking-map-stop tracking-map-start" />
                        <span className="tracking-map-stop tracking-map-end" />
                        <small className="tracking-map-label tracking-map-label-start">{selectedBooking.source_city}</small>
                        <small className="tracking-map-label tracking-map-label-end">{selectedBooking.destination_city}</small>
                        <div className="tracking-bus" style={{ left: `${9 + ((tracking?.status.progress ?? 0) * 0.82)}%` }}>
                          <IonIcon
                            icon={
                              busOutline
                            }
                          />
                        </div>
                        <span className={`tracking-live-pill ${tracking?.status.freshness?.toLowerCase() || 'waiting'}`}>
                          {tracking?.status.freshness || (trackingBusy ? 'CONNECTING' : 'WAITING')}
                        </span>
                        {tracking?.location && (
                          <iframe
                            className="tracking-real-map"
                            title="Current bus location"
                            loading="lazy"
                            src={`https://www.openstreetmap.org/export/embed.html?bbox=${tracking.location.lng - .035}%2C${tracking.location.lat - .025}%2C${tracking.location.lng + .035}%2C${tracking.location.lat + .025}&layer=mapnik&marker=${tracking.location.lat}%2C${tracking.location.lng}`}
                          />
                        )}
                      </div>

                      <span className="booking-section-label">
                        LIVE STATUS
                      </span>

                      <h3>
                        {tracking?.status.freshness === 'WAITING' ? 'Trip has not started' : 'Trip started'}
                      </h3>

                      <p>
                        {
                          trackingMessage
                        }
                      </p>

                      {tracking && (
                        <>
                          <div className="tracking-eta-card">
                            <div>
                              <small>NEXT STOP</small>
                              <strong>{tracking.status.nextStop?.name || selectedBooking.dropping_point}</strong>
                              <span>{tracking.status.etaMinutes != null ? `Bus is ${tracking.status.etaMinutes} min away` : tracking.status.distanceKm != null ? `${tracking.status.distanceKm} km away` : 'Scheduled route'}</span>
                            </div>
                            <div className="tracking-eta-time">
                              <small>{tracking.status.etaMinutes != null ? 'ETA' : 'SCHEDULED'}</small>
                              <strong>{formatTime(tracking.status.estimatedArrival || undefined)}</strong>
                              <span className={tracking.status.delayMinutes > 5 ? 'late' : 'ontime'}>
                                {tracking.status.delayMinutes > 5 ? `${tracking.status.delayMinutes} min late` : 'On time'}
                              </span>
                            </div>
                          </div>

                          <div className="tracking-stats">
                            <div><small>SPEED</small><strong>{tracking.location?.speed != null ? `${Math.round(tracking.location.speed)} km/h` : '—'}</strong></div>
                            <div><small>LAST UPDATE</small><strong>{tracking.location?.timestamp ? formatTime(tracking.location.timestamp) : 'Not started'}</strong></div>
                            <div><small>PROGRESS</small><strong>{tracking.status.progress}%</strong></div>
                          </div>

                          <div className="tracking-timeline">
                            <h4>Route stops</h4>
                            {tracking.stops.map((stop, index) => {
                              const reached = tracking.status.progress >= (index / Math.max(1, tracking.stops.length - 1)) * 100;
                              const current = tracking.status.nextStop?.id === stop.id;
                              return (
                                <div className={`tracking-stop-row ${reached ? 'reached' : ''} ${current ? 'current' : ''}`} key={stop.id}>
                                  <span className="tracking-stop-dot" />
                                  <div><strong>{stop.name}</strong><small>{stop.address || stop.city}</small></div>
                                  <time>{formatTime(stop.scheduledAt)}</time>
                                </div>
                              );
                            })}
                          </div>
                        </>
                      )}

                      <button
                        type="button"
                        className="dialog-main-action"
                        onClick={() =>
                          void loadTracking(
                            selectedBooking,
                          )
                        }
                      >
                        <IonIcon
                          icon={
                            refreshOutline
                          }
                        />

                        {trackingBusy ? 'Updating location…' : 'Refresh location'}
                      </button>

                    </div>
                  )}

                  {/* MANAGE */}

                  {dialog ===
                    'manage' && (
                    <div className="booking-manage-dialog">

                      <button
                        type="button"
                        onClick={() =>
                          window.alert(
                            'Passenger changes require operator approval after ticket confirmation.',
                          )
                        }
                      >
                        <span>
                          <IonIcon
                            icon={
                              personOutline
                            }
                          />
                        </span>

                        <div>
                          <strong>
                            Passenger details
                          </strong>

                          <small>
                            Review passenger information
                          </small>
                        </div>

                        <b>
                          ›
                        </b>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          window.alert(
                            `Current boarding point: ${selectedBooking.boarding_point}`,
                          )
                        }
                      >
                        <span>
                          <IonIcon
                            icon={
                              locationOutline
                            }
                          />
                        </span>

                        <div>
                          <strong>
                            Boarding point
                          </strong>

                          <small>
                            {
                              selectedBooking.boarding_point
                            }
                          </small>
                        </div>

                        <b>
                          ›
                        </b>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          history.push(
                            '/profile',
                          )
                        }
                      >
                        <span>
                          <IonIcon
                            icon={
                              callOutline
                            }
                          />
                        </span>

                        <div>
                          <strong>
                            Contact details
                          </strong>

                          <small>
                            Manage your account contact
                          </small>
                        </div>

                        <b>
                          ›
                        </b>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          openDialog(
                            selectedBooking,
                            'ticket',
                          )
                        }
                      >
                        <span>
                          <IonIcon
                            icon={
                              cardOutline
                            }
                          />
                        </span>

                        <div>
                          <strong>
                            Payment details
                          </strong>

                          <small>
                            {paymentLabel(
                              selectedBooking.payment_status,
                            )}{' '}
                            •{' '}
                            {money(
                              selectedBooking.total_amount,
                            )}
                          </small>
                        </div>

                        <b>
                          ›
                        </b>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setDialog(null);
                          history.push(`/bookings/${selectedBooking.id}/reschedule`);
                        }}
                      >
                        <span><IonIcon icon={swapHorizontalOutline} /></span>
                        <div>
                          <strong>Reschedule journey</strong>
                          <small>Move this booking to another eligible service</small>
                        </div>
                        <b>›</b>
                      </button>

                      <div className="manage-danger-zone">

                        <span>
                          Cancellation
                        </span>

                        <p>
                          Cancellation eligibility and refund
                          depend on your booking policy.
                        </p>

                        <button
                          type="button"
                          disabled={
                            actionBusy
                          }
                          onClick={() =>
                            void cancelBooking(
                              selectedBooking,
                            )
                          }
                        >
                          {actionBusy
                            ? 'Cancelling...'
                            : 'Cancel booking'}
                        </button>

                      </div>

                    </div>
                  )}

                </aside>

              </div>
            )}

        </div>

      </IonContent>

    </IonPage>
  );
}
