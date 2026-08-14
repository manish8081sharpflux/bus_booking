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
  refreshOutline,
  trendingUpOutline,
  walletOutline,
} from 'ionicons/icons';

import {
  Redirect,
  useHistory,
} from 'react-router-dom';

import OperatorTopbar from '../../components/operator/OperatorTopbar';

import './OperatorDashboardPage.css';
import './OperatorEarningsPage.css';

/* =========================================================
   API
========================================================= */

const API =
  import.meta.env.VITE_OPERATOR_API_URL ||
  'http://localhost:4000/api';

/* =========================================================
   TYPES
========================================================= */

type Payment = {
  id: string;

  booking_reference: string;

  total_amount: string;

  created_at: string;

  paid_at?: string;

  provider_payment_id?: string;

  customer_name: string;

  customer_mobile: string;

  source_city: string;

  destination_city: string;

  service_number: string;

  payment_status: string;

  payment_method?: string;

  provider?: string;
};

type Report = {
  summary: {
    grossRevenue: number;
    capturedRevenue: number;
  };

  bookings: Payment[];
};

/* =========================================================
   HELPERS
========================================================= */

const money = (
  value: number | string,
) =>
  new Intl.NumberFormat(
    'en-IN',
    {
      style: 'currency',
      currency: 'INR',
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

/* =========================================================
   OPERATOR PROFILE
========================================================= */

function operator() {
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

export default function OperatorEarningsPage() {
  const profile =
    useMemo(
      operator,
      [],
    );

  const history =
    useHistory();

  const token =
    localStorage.getItem(
      'operator_access_token',
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

  /* =======================================================
     LOAD DATA
  ======================================================= */

  const load =
    useCallback(
      async () => {
        if (!profile.id) {
          setError(
            'Operator profile is unavailable.',
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
                profile.id,
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
              `Server returned ${response.status}. Restart the API gateway and operator service.`,
            );
          }

          if (
            !response.ok ||
            body.success === false
          ) {
            throw new Error(
              body.message ||
                'Unable to load earnings.',
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
              : 'Unable to load earnings.',
          );
        } finally {
          setLoading(false);
        }
      },
      [
        profile.id,
        token,
      ],
    );

  useEffect(
    () => {
      if (profile.id) {
        void load();
      }
    },
    [
      profile.id,
      load,
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

  /* =======================================================
     PAYMENT DATA
  ======================================================= */

  const payments =
    report?.bookings.filter(
      (
        payment,
      ) =>
        payment.payment_status ===
        'CAPTURED',
    ) || [];

  const captured =
    report?.summary
      .capturedRevenue || 0;

  const gross =
    report?.summary
      .grossRevenue || 0;

  const successfulPayments =
    payments.length;

  const averagePayment =
    successfulPayments > 0
      ? captured /
        successfulPayments
      : 0;

  /* =======================================================
     UI
  ======================================================= */

  return (
    <IonPage>

      <div className="operator-earnings-shell">

        <OperatorTopbar
          operatorName={
            profile.name
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

        <main className="operator-earnings-page">

          {/* ===========================================
              HEADER
          ============================================ */}

          <section className="earnings-header">

            <div>

              <span className="earnings-breadcrumb">
                Operator Console / Earnings
              </span>

              <h1>
                Earnings & Payments
              </h1>

              <p>
                Financial overview of successfully collected ticket payments.
              </p>

            </div>

            <button
              type="button"
              className="earnings-refresh-button"
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

          {/* ===========================================
              ERROR
          ============================================ */}

          {error && (
            <div className="earnings-error">
              {error}
            </div>
          )}

          {/* ===========================================
              CAPTURED REVENUE HERO
          ============================================ */}

          <section className="earnings-hero-card">

            <div className="earnings-hero-left">

              <div className="earnings-hero-icon">

                <IonIcon
                  icon={
                    walletOutline
                  }
                />

              </div>

              <div>

                <span>
                  CAPTURED REVENUE
                </span>

                <strong>
                  {
                    money(
                      captured,
                    )
                  }
                </strong>

                <p>
                  Money successfully received from confirmed customer tickets.
                </p>

              </div>

            </div>

            <div className="earnings-hero-status">

              <span className="earnings-status-dot" />

              Payment collection active

            </div>

          </section>

          {/* ===========================================
              STATS
          ============================================ */}

          <section className="earnings-stats-grid">

            <article className="earnings-stat-card">

              <div className="earnings-stat-icon pink">

                <IonIcon
                  icon={
                    trendingUpOutline
                  }
                />

              </div>

              <div>

                <span>
                  Gross confirmed
                </span>

                <strong>
                  {
                    money(
                      gross,
                    )
                  }
                </strong>

                <small>
                  Total confirmed ticket value
                </small>

              </div>

            </article>

            <article className="earnings-stat-card">

              <div className="earnings-stat-icon green">

                <IonIcon
                  icon={
                    cashOutline
                  }
                />

              </div>

              <div>

                <span>
                  Successful payments
                </span>

                <strong>
                  {
                    successfulPayments
                  }
                </strong>

                <small>
                  Captured transactions
                </small>

              </div>

            </article>

            <article className="earnings-stat-card">

              <div className="earnings-stat-icon blue">

                <IonIcon
                  icon={
                    walletOutline
                  }
                />

              </div>

              <div>

                <span>
                  Average payment
                </span>

                <strong>
                  {
                    money(
                      averagePayment,
                    )
                  }
                </strong>

                <small>
                  Average captured transaction
                </small>

              </div>

            </article>

          </section>

          {/* ===========================================
              TRANSACTIONS
          ============================================ */}

          <section className="earnings-transactions-card">

            <div className="earnings-transactions-header">

              <div>

                <h2>
                  Payment Transactions
                </h2>

                <p>
                  Successfully captured customer payments.
                </p>

              </div>

              <span className="earnings-captured-pill">

                <span />

                Captured only

              </span>

            </div>

            {/* =========================================
                LOADING
            ========================================== */}

            {loading ? (
              <div className="earnings-state">

                <div className="earnings-spinner" />

                <strong>
                  Loading payments
                </strong>

                <p>
                  Fetching the latest transaction information.
                </p>

              </div>
            ) : payments.length ===
              0 ? (
              <div className="earnings-state empty">

                <IonIcon
                  icon={
                    walletOutline
                  }
                />

                <strong>
                  No captured payments
                </strong>

                <p>
                  Successfully captured payments will appear here.
                </p>

              </div>
            ) : (
              <div className="earnings-table-wrapper">

                <div className="earnings-table">

                  {/* =============================
                      TABLE HEADER
                  ============================== */}

                  <div className="earnings-table-head">

                    <span>
                      Payment / Booking
                    </span>

                    <span>
                      Customer
                    </span>

                    <span>
                      Service
                    </span>

                    <span>
                      Method
                    </span>

                    <span>
                      Amount
                    </span>

                  </div>

                  {/* =============================
                      ROWS
                  ============================== */}

                  {payments.map(
                    (
                      payment,
                    ) => (
                      <div
                        key={
                          payment.id
                        }
                        className="earnings-transaction-row"
                      >

                        {/* PAYMENT */}

                        <div className="earnings-payment-cell">

                          <div className="earnings-payment-icon">

                            <IonIcon
                              icon={
                                cashOutline
                              }
                            />

                          </div>

                          <div>

                            <strong>
                              {
                                payment.provider_payment_id ||
                                payment.id
                              }
                            </strong>

                            <span>
                              PNR
                              {' '}
                              {
                                payment.booking_reference
                              }
                            </span>

                            <small>
                              {
                                formatDate(
                                  payment.paid_at ||
                                  payment.created_at,
                                )
                              }
                              {' • '}
                              {
                                formatTime(
                                  payment.paid_at ||
                                  payment.created_at,
                                )
                              }
                            </small>

                          </div>

                        </div>

                        {/* CUSTOMER */}

                        <div className="earnings-table-cell">

                          <strong>
                            {
                              payment.customer_name
                            }
                          </strong>

                          <span>
                            {
                              payment.customer_mobile
                            }
                          </span>

                        </div>

                        {/* SERVICE */}

                        <div className="earnings-table-cell">

                          <strong>
                            {
                              payment.source_city
                            }
                            {' → '}
                            {
                              payment.destination_city
                            }
                          </strong>

                          <span>
                            Service
                            {' '}
                            {
                              payment.service_number
                            }
                          </span>

                        </div>

                        {/* METHOD */}

                        <div className="earnings-table-cell">

                          <strong>
                            {
                              payment.payment_method ||
                              '—'
                            }
                          </strong>

                          <span>
                            {
                              payment.provider ||
                              '—'
                            }
                          </span>

                        </div>

                        {/* AMOUNT */}

                        <div className="earnings-amount-cell">

                          <strong>
                            {
                              money(
                                payment.total_amount,
                              )
                            }
                          </strong>

                          <span>
                            {
                              payment.payment_status
                            }
                          </span>

                        </div>

                      </div>
                    ),
                  )}

                </div>

              </div>
            )}

          </section>

        </main>

      </div>

    </IonPage>
  );
}