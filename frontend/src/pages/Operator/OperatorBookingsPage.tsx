import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  IonIcon,
  IonPage,
} from '@ionic/react';

import {
  cashOutline,
  chevronDownOutline,
  chevronUpOutline,
  peopleOutline,
  refreshOutline,
  searchOutline,
  ticketOutline,
} from 'ionicons/icons';

import {
  Redirect,
  useHistory,
  useLocation,
} from 'react-router-dom';

import OperatorTopbar from '../../components/operator/OperatorTopbar';

import './OperatorDashboardPage.css';
import './OperatorBookingsPage.css';

/* =========================================================
   API
========================================================= */

const API =
  import.meta.env.VITE_OPERATOR_API_URL ||
  'http://localhost:4000/api';

/* =========================================================
   TYPES
========================================================= */

type Passenger = {
  name: string;
  age: number;
  gender: string;
  seat: string;
  fare: string;
};

type Booking = {
  id: string;
  booking_reference: string;

  status: string;

  total_amount: string;
  currency: string;

  created_at: string;

  service_number: string;

  departure_at: string;

  source_city: string;
  destination_city: string;

  bus_name: string;

  customer_name: string;
  customer_mobile: string;
  customer_email?: string;

  payment_status: string;
  payment_method?: string;

  provider?: string;
  provider_payment_id?: string;
  paid_at?: string;

  passengers: Passenger[];
};

type ReportSummary = {
  totalBookings: number;
  confirmedBookings: number;
  cancelledBookings: number;

  seatsSold: number;

  grossRevenue: number;
  capturedRevenue: number;
};

type Report = {
  summary: ReportSummary;
  bookings: Booking[];
};

/* =========================================================
   HELPERS
========================================================= */

const money = (
  value: string | number,
) => {
  return new Intl.NumberFormat(
    'en-IN',
    {
      style: 'currency',
      currency: 'INR',
    },
  ).format(
    Number(value) || 0,
  );
};

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

function storedOperator() {
  try {
    const raw =
      localStorage.getItem(
        'operator_profile',
      ) ||
      localStorage.getItem(
        'operator',
      ) ||
      '{}';

    const value =
      JSON.parse(raw);

    return {
      id:
        value.id ||
        value.operatorId ||
        value.operator_id ||
        '',

      name:
        value.displayName ||
        value.operatorName ||
        value.legalName ||
        value.name ||
        'Bus Operator',
    };
  } catch {
    return {
      id: '',
      name: 'Bus Operator',
    };
  }
}

/* =========================================================
   PAGE
========================================================= */

export default function OperatorBookingsPage() {
  const history =
    useHistory();

  const location =
    useLocation();

  const operator =
    useMemo(
      storedOperator,
      [],
    );

  const token =
    localStorage.getItem(
      'operator_access_token',
    );

  const earnings =
    location.pathname.endsWith(
      '/earnings',
    );

  const [
    report,
    setReport,
  ] =
    useState<Report | null>(
      null,
    );

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    error,
    setError,
  ] =
    useState('');

  const [
    search,
    setSearch,
  ] =
    useState('');

  const [
    statusFilter,
    setStatusFilter,
  ] =
    useState('ALL');

  const [
    expanded,
    setExpanded,
  ] =
    useState<
      Record<string, boolean>
    >({});

  /* =======================================================
     LOAD
  ======================================================= */

  const load =
    useCallback(
      async () => {
        if (
          !operator.id
        ) {
          setError(
            'Operator information is unavailable.',
          );

          setLoading(false);

          return;
        }

        try {
          setLoading(true);
          setError('');

          const response =
            await fetch(
              `${API}/trips/operator-bookings?operatorId=${encodeURIComponent(
                operator.id,
              )}`,
              {
                headers:
                  token
                    ? {
                        Authorization:
                          `Bearer ${token}`,
                      }
                    : {},
              },
            );

          const text =
            await response.text();

          let body: any;

          try {
            body =
              text
                ? JSON.parse(text)
                : {};
          } catch {
            throw new Error(
              `Server returned ${response.status}. Unable to read booking response.`,
            );
          }

          if (
            !response.ok ||
            body.success === false
          ) {
            throw new Error(
              body.message ||
                'Unable to load operator bookings.',
            );
          }

          setReport(
            body.data,
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
      },
      [
        operator.id,
        token,
      ],
    );

  useEffect(
    () => {
      void load();
    },
    [
      load,
    ],
  );


  /* =======================================================
     FILTER
  ======================================================= */

  const filteredBookings =
    useMemo(
      () => {
        if (
          !report?.bookings
        ) {
          return [];
        }

        const query =
          search
            .trim()
            .toLowerCase();

        return report.bookings.filter(
          (
            booking,
          ) => {
            const statusMatches =
              statusFilter ===
                'ALL' ||
              booking.status ===
                statusFilter;

            const searchMatches =
              !query ||
              booking.booking_reference
                .toLowerCase()
                .includes(query) ||
              booking.customer_name
                .toLowerCase()
                .includes(query) ||
              booking.customer_mobile
                .toLowerCase()
                .includes(query) ||
              booking.source_city
                .toLowerCase()
                .includes(query) ||
              booking.destination_city
                .toLowerCase()
                .includes(query) ||
              booking.bus_name
                .toLowerCase()
                .includes(query) ||
              booking.service_number
                .toLowerCase()
                .includes(query);

            return (
              statusMatches &&
              searchMatches
            );
          },
        );
      },
      [
        report,
        search,
        statusFilter,
      ],
    );

  /* =======================================================
     AUTH
  ======================================================= */

  if (!token) {
    return (
      <Redirect to="/operator" />
    );
  }

  const summary =
    report?.summary;

  /* =======================================================
     UI
  ======================================================= */

  return (
    <IonPage>

      <div className="operator-dashboard operator-bookings-shell">

        <OperatorTopbar
          operatorName={
            operator.name
          }
          onLogout={() => {
            localStorage.removeItem(
              'operator_access_token',
            );

            history.replace(
              '/operator',
            );
          }}
        />

        <main className="operator-dashboard-main operator-bookings-main">

          <div className="operator-bookings-content">

            {/* =========================================
                HEADER
            ========================================== */}

            <section className="operator-bookings-page-header">

              <div>

                <span className="operator-bookings-breadcrumb">
                  Operator Console
                  {' / '}
                  {earnings
                    ? 'Earnings'
                    : 'Bookings'}
                </span>

                <h1>
                  {earnings
                    ? 'Earnings & Payments'
                    : 'Customer Bookings'}
                </h1>

                <p>
                  {earnings
                    ? 'Track captured payments and gross ticket revenue.'
                    : 'Manage customer tickets, seats, passengers and payments in one place.'}
                </p>

              </div>

              <button
                type="button"
                className="operator-bookings-refresh"
                onClick={() =>
                  void load()
                }
                disabled={
                  loading
                }
              >

                <IonIcon
                  icon={
                    refreshOutline
                  }
                />

                {loading
                  ? 'Refreshing...'
                  : 'Refresh'}

              </button>

            </section>

            {/* =========================================
                ERROR
            ========================================== */}

            {error && (
              <div className="operator-bookings-error">
                {error}
              </div>
            )}

            {/* =========================================
                STATS
            ========================================== */}

            <section className="operator-bookings-stats">

              <article className="operator-stat-card">

                <div className="operator-stat-icon pink">

                  <IonIcon
                    icon={
                      ticketOutline
                    }
                  />

                </div>

                <div>

                  <span>
                    Total bookings
                  </span>

                  <strong>
                    {summary?.totalBookings ??
                      0}
                  </strong>

                  <small>
                    All customer tickets
                  </small>

                </div>

              </article>

              <article className="operator-stat-card">

                <div className="operator-stat-icon purple">

                  <IonIcon
                    icon={
                      peopleOutline
                    }
                  />

                </div>

                <div>

                  <span>
                    Seats sold
                  </span>

                  <strong>
                    {summary?.seatsSold ??
                      0}
                  </strong>

                  <small>
                    Confirmed passengers
                  </small>

                </div>

              </article>

              <article className="operator-stat-card">

                <div className="operator-stat-icon green">

                  <IonIcon
                    icon={
                      cashOutline
                    }
                  />

                </div>

                <div>

                  <span>
                    Gross confirmed
                  </span>

                  <strong className="operator-stat-money">
                    {money(
                      summary?.grossRevenue ??
                        0,
                    )}
                  </strong>

                  <small>
                    Confirmed ticket value
                  </small>

                </div>

              </article>

              <article className="operator-stat-card">

                <div className="operator-stat-icon blue">

                  <IonIcon
                    icon={
                      cashOutline
                    }
                  />

                </div>

                <div>

                  <span>
                    Payments captured
                  </span>

                  <strong className="operator-stat-money">
                    {money(
                      summary?.capturedRevenue ??
                        0,
                    )}
                  </strong>

                  <small>
                    Successfully collected
                  </small>

                </div>

              </article>

            </section>

            {/* =========================================
                FILTER BAR
            ========================================== */}

            <section className="operator-booking-tools">

              <div className="operator-booking-search">

                <IonIcon
                  icon={
                    searchOutline
                  }
                />

                <input
                  type="text"
                  placeholder="Search PNR, customer, bus, route or service"
                  value={
                    search
                  }
                  onChange={(
                    event,
                  ) =>
                    setSearch(
                      event.target.value,
                    )
                  }
                />

              </div>

              <div className="operator-booking-status-filter">

                <button
                  type="button"
                  className={
                    statusFilter ===
                    'ALL'
                      ? 'active'
                      : ''
                  }
                  onClick={() =>
                    setStatusFilter(
                      'ALL',
                    )
                  }
                >
                  All
                </button>

                <button
                  type="button"
                  className={
                    statusFilter ===
                    'CONFIRMED'
                      ? 'active'
                      : ''
                  }
                  onClick={() =>
                    setStatusFilter(
                      'CONFIRMED',
                    )
                  }
                >
                  Confirmed
                </button>

                <button
                  type="button"
                  className={
                    statusFilter ===
                    'CANCELLED'
                      ? 'active'
                      : ''
                  }
                  onClick={() =>
                    setStatusFilter(
                      'CANCELLED',
                    )
                  }
                >
                  Cancelled
                </button>

              </div>

            </section>

            {/* =========================================
                RESULT HEADER
            ========================================== */}

            <section className="operator-booking-result-header">

              <div>

                <strong>
                  Customer bookings
                </strong>

                <span>
                  {
                    filteredBookings.length
                  }
                  {' '}
                  booking
                  {filteredBookings.length ===
                  1
                    ? ''
                    : 's'}
                </span>

              </div>

            </section>

            {/* =========================================
                LOADING
            ========================================== */}

            {loading ? (
              <div className="operator-booking-state">

                <div className="operator-booking-spinner" />

                <strong>
                  Loading customer bookings
                </strong>

                <span>
                  Fetching the latest booking and payment information.
                </span>

              </div>
            ) : filteredBookings.length ===
              0 ? (
              <div className="operator-booking-empty">

                <IonIcon
                  icon={
                    ticketOutline
                  }
                />

                <h2>
                  No bookings found
                </h2>

                <p>
                  No booking matches the selected filter or search.
                </p>

              </div>
            ) : (
              <section className="operator-booking-list">

                {filteredBookings.map(
                  (
                    booking,
                  ) => {
                    const isExpanded =
                      expanded[
                        booking.id
                      ] ??
                      true;

                    return (
                      <article
                        key={
                          booking.id
                        }
                        className="operator-booking-card"
                      >

                        {/* =============================
                            TOP
                        ============================== */}

                        <div className="operator-booking-top">

                          <div className="operator-booking-route">

                            <div className="operator-booking-reference">
                              {
                                booking.booking_reference
                              }
                            </div>

                            <h2>
                              {
                                booking.source_city
                              }
                              {' '}
                              <span>
                                →
                              </span>
                              {' '}
                              {
                                booking.destination_city
                              }
                            </h2>

                            <div className="operator-booking-trip-meta">

                              <span>
                                {
                                  booking.bus_name
                                }
                              </span>

                              <span className="meta-dot">
                                •
                              </span>

                              <span>
                                Service
                                {' '}
                                {
                                  booking.service_number
                                }
                              </span>

                              <span className="meta-dot">
                                •
                              </span>

                              <span>
                                {
                                  formatDate(
                                    booking.departure_at,
                                  )
                                }
                              </span>

                              <span className="meta-dot">
                                •
                              </span>

                              <span>
                                {
                                  formatTime(
                                    booking.departure_at,
                                  )
                                }
                              </span>

                            </div>

                          </div>

                          <div className="operator-booking-total">

                            <span
                              className={`operator-booking-status ${booking.status
                                .toLowerCase()
                                .replaceAll(
                                  '_',
                                  '-',
                                )}`}
                            >
                              {
                                booking.status
                              }
                            </span>

                            <strong>
                              {
                                money(
                                  booking.total_amount,
                                )
                              }
                            </strong>

                            <small>
                              Total ticket value
                            </small>

                          </div>

                        </div>

                        {/* =============================
                            DETAIL GRID
                        ============================== */}

                        <div className="operator-booking-detail-grid">

                          <div className="operator-booking-detail">

                            <span>
                              Customer
                            </span>

                            <strong>
                              {
                                booking.customer_name
                              }
                            </strong>

                            <p>
                              {
                                booking.customer_mobile
                              }
                            </p>

                            {booking.customer_email && (
                              <p>
                                {
                                  booking.customer_email
                                }
                              </p>
                            )}

                          </div>

                          <div className="operator-booking-detail">

                            <span>
                              Payment
                            </span>

                            <strong
                              className={`payment-text ${booking.payment_status.toLowerCase()}`}
                            >
                              {
                                booking.payment_status
                              }
                            </strong>

                            <p>
                              {
                                booking.payment_method ||
                                '—'
                              }

                              {booking.provider
                                ? ` · ${booking.provider}`
                                : ''}
                            </p>

                            {booking.provider_payment_id && (
                              <small>
                                Ref:
                                {' '}
                                {
                                  booking.provider_payment_id
                                }
                              </small>
                            )}

                          </div>

                          <div className="operator-booking-detail">

                            <span>
                              Journey
                            </span>

                            <strong>
                              {
                                formatDate(
                                  booking.departure_at,
                                )
                              }
                            </strong>

                            <p>
                              {
                                formatTime(
                                  booking.departure_at,
                                )
                              }
                            </p>

                          </div>

                          <div className="operator-booking-detail">

                            <span>
                              Booked on
                            </span>

                            <strong>
                              {
                                formatDate(
                                  booking.created_at,
                                )
                              }
                            </strong>

                            <p>
                              {
                                formatTime(
                                  booking.created_at,
                                )
                              }
                            </p>

                          </div>

                        </div>

                        {/* =============================
                            PASSENGER HEADER
                        ============================== */}

                        <button
                          type="button"
                          className="operator-passenger-toggle"
                          onClick={() =>
                            setExpanded(
                              (
                                previous,
                              ) => ({
                                ...previous,

                                [booking.id]:
                                  !isExpanded,
                              }),
                            )
                          }
                        >

                          <div>

                            <strong>
                              Passengers
                            </strong>

                            <span>
                              {
                                booking.passengers
                                  .length
                              }
                              {' '}
                              seat
                              {booking.passengers.length ===
                              1
                                ? ''
                                : 's'}
                            </span>

                          </div>

                          <IonIcon
                            icon={
                              isExpanded
                                ? chevronUpOutline
                                : chevronDownOutline
                            }
                          />

                        </button>

                        {/* =============================
                            PASSENGERS
                        ============================== */}

                        {isExpanded && (
                          <div className="operator-passenger-grid">

                            {booking.passengers.map(
                              (
                                passenger,
                                index,
                              ) => (
                                <div
                                  key={`${booking.id}-${passenger.seat}-${index}`}
                                  className="operator-passenger-card"
                                >

                                  <div className="operator-passenger-seat">

                                    <span>
                                      Seat
                                    </span>

                                    <strong>
                                      {
                                        passenger.seat
                                      }
                                    </strong>

                                  </div>

                                  <div className="operator-passenger-info">

                                    <strong>
                                      {
                                        passenger.name
                                      }
                                    </strong>

                                    <span>
                                      {
                                        passenger.age
                                      }
                                      {' years'}
                                    </span>

                                    <span>
                                      {
                                        passenger.gender
                                      }
                                    </span>

                                  </div>

                                  <div className="operator-passenger-fare">

                                    <span>
                                      Fare
                                    </span>

                                    <strong>
                                      {
                                        money(
                                          passenger.fare,
                                        )
                                      }
                                    </strong>

                                  </div>

                                </div>
                              ),
                            )}

                          </div>
                        )}

                      </article>
                    );
                  },
                )}

              </section>
            )}

          </div>

        </main>

      </div>

    </IonPage>
  );
}
