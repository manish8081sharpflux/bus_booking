import {
  useEffect,
  useState,
} from 'react';

import {
  IonContent,
  IonIcon,
  IonPage,
} from '@ionic/react';

import {
  busOutline,
  checkmarkCircleOutline,
  copyOutline,
  giftOutline,
  homeOutline,
  personOutline,
  receiptOutline,
  refreshOutline,
  ticketOutline,
} from 'ionicons/icons';

import {
  useHistory,
} from 'react-router-dom';

import './CustomerOffersPage.css';

const API =
  import.meta.env.VITE_BOOKING_API_URL ||
  'http://localhost:4000/api/bookings';

type Offer = {
  code: string;
  title: string;
  description: string;

  discount_type: string;
  discount_value: string;

  max_discount_amount?: string;

  eligibility?: {
    minBookingAmount?: number;
  };

  ends_at: string;
};

type OffersResponse = {
  success?: boolean;
  message?: string;
  data?: Offer[];
};

export default function CustomerOffersPage() {
  const history =
    useHistory();

  const [
    offers,
    setOffers,
  ] = useState<Offer[]>([]);

  const [
    copied,
    setCopied,
  ] = useState('');

  const [
    error,
    setError,
  ] = useState('');

  const [
    loading,
    setLoading,
  ] = useState(true);

  const loadOffers =
    async () => {
      try {
        setLoading(true);
        setError('');

        const response =
          await fetch(
            `${API}/offers`,
            {
              headers: {
                Accept:
                  'application/json',
              },
            },
          );

        let body:
          OffersResponse;

        try {
          body =
            await response.json();
        } catch {
          throw new Error(
            'The server returned an invalid response.',
          );
        }

        if (!response.ok) {
          throw new Error(
            body.message ||
              `Unable to load offers (${response.status}).`,
          );
        }

        if (
          body.success ===
          false
        ) {
          throw new Error(
            body.message ||
              'Unable to load offers.',
          );
        }

        setOffers(
          Array.isArray(
            body.data,
          )
            ? body.data
            : [],
        );
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : 'Unable to load offers.';

        setError(message);
        setOffers([]);
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    loadOffers();
  }, []);

  const copyCoupon =
    async (
      code: string,
    ) => {
      try {
        if (
          navigator.clipboard
        ) {
          await navigator.clipboard.writeText(
            code,
          );
        } else {
          const input =
            document.createElement(
              'textarea',
            );

          input.value =
            code;

          document.body.appendChild(
            input,
          );

          input.select();

          document.execCommand(
            'copy',
          );

          input.remove();
        }

        setCopied(code);

        window.setTimeout(
          () => {
            setCopied('');
          },
          1600,
        );
      } catch {
        setError(
          'Unable to copy coupon code.',
        );
      }
    };

  const getDiscountLabel =
    (
      offer: Offer,
    ) => {
      const value =
        Number(
          offer.discount_value,
        );

      if (
        offer.discount_type ===
        'percentage'
      ) {
        return `${value}% OFF`;
      }

      if (
        offer.discount_type ===
        'fixed'
      ) {
        return `₹${value} OFF`;
      }

      return 'SPECIAL OFFER';
    };

  const formatDate =
    (
      value: string,
    ) => {
      const date =
        new Date(value);

      if (
        Number.isNaN(
          date.getTime(),
        )
      ) {
        return 'Limited time';
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

  return (
    <IonPage>
      <IonContent fullscreen>

        <div className="customer-offers-page">

          {/* =================================================
              HEADER / NAVBAR
          ================================================== */}

          <header className="offers-navbar">

            <button
              type="button"
              className="offers-brand"
              onClick={() =>
                history.push(
                  '/home',
                )
              }
            >
              <span className="offers-brand-icon">
                <IonIcon
                  icon={
                    busOutline
                  }
                />
              </span>

              <span className="offers-brand-copy">
                <strong>
                  BusGo
                </strong>

                <small>
                  Smart bus booking
                </small>
              </span>
            </button>

            <nav className="offers-navbar-menu">

              <button
                type="button"
                onClick={() =>
                  history.push(
                    '/home',
                  )
                }
              >
                <IonIcon
                  icon={
                    homeOutline
                  }
                />

                Home
              </button>

              <button
                type="button"
                onClick={() =>
                  history.push(
                    '/bookings',
                  )
                }
              >
                <IonIcon
                  icon={
                    ticketOutline
                  }
                />

                Bookings
              </button>

              <button
                type="button"
                className="active"
              >
                <IonIcon
                  icon={
                    giftOutline
                  }
                />

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
                <IonIcon
                  icon={
                    personOutline
                  }
                />

                Profile
              </button>

            </nav>

            <button
              type="button"
              className="offers-my-trips"
              onClick={() =>
                history.push(
                  '/bookings',
                )
              }
            >
              <IonIcon
                icon={
                  receiptOutline
                }
              />

              My Trips
            </button>

          </header>

          {/* =================================================
              PAGE CONTENT
          ================================================== */}

          <main className="offers-page">

            <section className="offers-page-header">

              <div className="offers-icon">
                <IonIcon
                  icon={
                    giftOutline
                  }
                />
              </div>

              <div className="offers-heading">

                <span>
                  BUSGO SAVINGS
                </span>

                <h1>
                  Offers & coupons
                </h1>

                <p>
                  Use an eligible coupon
                  during checkout and save
                  instantly.
                </p>

              </div>

            </section>

            {/* LOADING */}

            {loading && (
              <div className="offers-status-card">

                <div className="offers-loader" />

                <div>
                  <strong>
                    Loading offers
                  </strong>

                  <span>
                    Finding the best
                    discounts for your
                    journey.
                  </span>
                </div>

              </div>
            )}

            {/* ERROR */}

            {!loading &&
              error && (
                <div className="offers-error">

                  <div>
                    <strong>
                      Could not load offers
                    </strong>

                    <span>
                      {error}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={
                      loadOffers
                    }
                  >
                    <IonIcon
                      icon={
                        refreshOutline
                      }
                    />

                    Retry
                  </button>

                </div>
              )}

            {/* OFFERS */}

            {!loading &&
              !error &&
              offers.length > 0 && (

                <section className="offers-grid">

                  {offers.map(
                    (
                      offer,
                    ) => (

                      <article
                        className="offer-card"
                        key={
                          offer.code
                        }
                      >

                        <div className="offer-top">

                          <span>
                            {
                              getDiscountLabel(
                                offer,
                              )
                            }
                          </span>

                          <strong>
                            {
                              offer.title
                            }
                          </strong>

                        </div>

                        <p>
                          {
                            offer.description
                          }
                        </p>

                        {offer
                          .eligibility
                          ?.minBookingAmount && (
                          <small className="offer-minimum">
                            Minimum booking ₹
                            {
                              offer
                                .eligibility
                                .minBookingAmount
                            }
                          </small>
                        )}

                        {offer
                          .max_discount_amount && (
                          <small className="offer-maximum">
                            Maximum discount ₹
                            {
                              offer
                                .max_discount_amount
                            }
                          </small>
                        )}

                        <div className="offer-code">

                          <code>
                            {
                              offer.code
                            }
                          </code>

                          <button
                            type="button"
                            onClick={() =>
                              copyCoupon(
                                offer.code,
                              )
                            }
                          >
                            <IonIcon
                              icon={
                                copied ===
                                offer.code
                                  ? checkmarkCircleOutline
                                  : copyOutline
                              }
                            />

                            {
                              copied ===
                              offer.code
                                ? 'Copied'
                                : 'Copy'
                            }
                          </button>

                        </div>

                        <footer>
                          Valid until{' '}
                          {
                            formatDate(
                              offer.ends_at,
                            )
                          }
                        </footer>

                      </article>

                    ),
                  )}

                </section>

              )}

            {/* EMPTY */}

            {!loading &&
              !error &&
              offers.length === 0 && (
                <div className="offers-empty">

                  <div className="offers-empty-icon">
                    <IonIcon
                      icon={
                        giftOutline
                      }
                    />
                  </div>

                  <strong>
                    No active offers
                  </strong>

                  <p>
                    There are no active
                    coupons available
                    right now. Check
                    again later.
                  </p>

                </div>
              )}

          </main>

          {/* =================================================
              MOBILE NAVIGATION
          ================================================== */}

          <nav className="offers-mobile-nav">

            <button
              type="button"
              onClick={() =>
                history.push(
                  '/home',
                )
              }
            >
              <IonIcon
                icon={
                  homeOutline
                }
              />

              <span>
                Home
              </span>
            </button>

            <button
              type="button"
              onClick={() =>
                history.push(
                  '/bookings',
                )
              }
            >
              <IonIcon
                icon={
                  ticketOutline
                }
              />

              <span>
                Bookings
              </span>
            </button>

            <button
              type="button"
              className="active"
            >
              <IonIcon
                icon={
                  giftOutline
                }
              />

              <span>
                Offers
              </span>
            </button>

            <button
              type="button"
              onClick={() =>
                history.push(
                  '/profile',
                )
              }
            >
              <IonIcon
                icon={
                  personOutline
                }
              />

              <span>
                Profile
              </span>
            </button>

          </nav>

        </div>

      </IonContent>
    </IonPage>
  );
}