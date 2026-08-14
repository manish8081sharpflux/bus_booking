import {
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  IonContent,
  IonIcon,
  IonPage,
} from '@ionic/react';

import {
  busOutline,
  calendarOutline,
  checkmarkCircleOutline,
  chevronForwardOutline,
  giftOutline,
  homeOutline,
  locationOutline,
  personOutline,
  receiptOutline,
  searchOutline,
  swapVerticalOutline,
  ticketOutline,
  logoWhatsapp,
} from 'ionicons/icons';

import {
  useHistory,
} from 'react-router-dom';

import './HomePage.css';

/* =========================================================
   TYPES
========================================================= */

type SearchForm = {
  from: string;
  to: string;
  date: string;
};

type PopularRoute = {
  from: string;
  to: string;
  subtitle: string;
};

type Offer = {
  title: string;
  description: string;
  badge: string;
};

/* =========================================================
   DATE HELPERS
========================================================= */

const toInputDate = (
  date: Date,
) => {
  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() + 1,
    ).padStart(
      2,
      '0',
    );

  const day =
    String(
      date.getDate(),
    ).padStart(
      2,
      '0',
    );

  return `${year}-${month}-${day}`;
};

const formatDate = (
  value: string,
) => {
  if (!value) {
    return 'Select journey date';
  }

  const date =
    new Date(
      `${value}T00:00:00`,
    );

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

const formatQuickDate = (
  value: string,
) => {
  if (!value) {
    return '';
  }

  const date =
    new Date(
      `${value}T00:00:00`,
    );

  return date.toLocaleDateString(
    'en-IN',
    {
      day: '2-digit',
      month: 'short',
    },
  );
};

/* =========================================================
   PAGE
========================================================= */

export default function HomePage() {
  const history =
    useHistory();

  const today =
    useMemo(
      () =>
        new Date(),
      [],
    );

  const tomorrow =
    useMemo(
      () => {
        const date =
          new Date();

        date.setDate(
          date.getDate() + 1,
        );

        return date;
      },
      [],
    );

  const todayValue =
    toInputDate(
      today,
    );

  const tomorrowValue =
    toInputDate(
      tomorrow,
    );

  const [
    search,
    setSearch,
  ] =
    useState<SearchForm>({
      from: 'Pune',
      to: 'Mumbai',
      date: todayValue,
    });

  const [
    error,
    setError,
  ] =
    useState('');

  const journeyDateInputRef =
    useRef<HTMLInputElement | null>(
      null,
    );

  const anotherDateInputRef =
    useRef<HTMLInputElement | null>(
      null,
    );

  const openDatePicker = (
    input:
      HTMLInputElement | null,
  ) => {
    if (!input) {
      return;
    }

    setError('');

    try {
      input.focus({
        preventScroll: true,
      });

      if (
        typeof input.showPicker ===
        'function'
      ) {
        input.showPicker();
        return;
      }

      input.click();
    } catch {
      input.click();
    }
  };

  const popularRoutes:
    PopularRoute[] = [
      {
        from: 'Pune',
        to: 'Mumbai',
        subtitle:
          'Frequent buses available',
      },
      {
        from: 'Pune',
        to: 'Goa',
        subtitle:
          'Popular weekend route',
      },
      {
        from: 'Mumbai',
        to: 'Pune',
        subtitle:
          'Multiple daily services',
      },
      {
        from: 'Pune',
        to: 'Nashik',
        subtitle:
          'Comfortable city travel',
      },
    ];

  const offers:
    Offer[] = [
      {
        title:
          'Easy Cancellation',
        description:
          'Flexible cancellation on selected services.',
        badge:
          'Flexible',
      },
      {
        title:
          'Live Seat Availability',
        description:
          'Choose from real-time available seats.',
        badge:
          'Live',
      },
      {
        title:
          'Secure Booking',
        description:
          'Safe booking and instant confirmation.',
        badge:
          'Secure',
      },
    ];

  /* =======================================================
     SEARCH
  ======================================================= */

  const handleSearch =
    () => {
      const from =
        search.from.trim();

      const to =
        search.to.trim();

      if (
        !from ||
        !to
      ) {
        setError(
          'Please enter both departure and destination cities.',
        );

        return;
      }

      if (
        from.toLowerCase() ===
        to.toLowerCase()
      ) {
        setError(
          'Departure and destination cannot be the same.',
        );

        return;
      }

      if (
        !search.date
      ) {
        setError(
          'Please select your journey date.',
        );

        return;
      }

      const selectedDate =
        new Date(
          `${search.date}T00:00:00`,
        );

      const startToday =
        new Date();

      startToday.setHours(
        0,
        0,
        0,
        0,
      );

      if (
        selectedDate <
        startToday
      ) {
        setError(
          'Journey date cannot be in the past.',
        );

        return;
      }

      setError('');

      history.push(
        `/search?from=${encodeURIComponent(
          from,
        )}&to=${encodeURIComponent(
          to,
        )}&date=${encodeURIComponent(
          search.date,
        )}`,
      );
    };

  /* =======================================================
     SWAP
  ======================================================= */

  const swapCities =
    () => {
      setSearch(
        (
          previous,
        ) => ({
          ...previous,

          from:
            previous.to,

          to:
            previous.from,
        }),
      );

      setError('');
    };

  /* =======================================================
     POPULAR ROUTE
  ======================================================= */

  const chooseRoute =
    (
      route:
        PopularRoute,
    ) => {
      setSearch(
        (
          previous,
        ) => ({
          ...previous,

          from:
            route.from,

          to:
            route.to,
        }),
      );

      setError('');

      window.scrollTo({
        top: 0,
        behavior: 'smooth',
      });
    };

  /* =======================================================
     UI
  ======================================================= */

  return (
    <IonPage>

      <IonContent fullscreen>

        <div className="customer-home-page">

          {/* =================================================
              NAVBAR
          ================================================== */}

          <header className="customer-navbar">

            <button
              type="button"
              className="customer-brand"
              onClick={() =>
                history.push(
                  '/home',
                )
              }
            >

              <span className="customer-brand-icon">

                <IonIcon
                  icon={
                    busOutline
                  }
                />

              </span>

              <span className="customer-brand-copy">

                <strong>
                  BusGo
                </strong>

                <small>
                  Smart bus booking
                </small>

              </span>

            </button>

            <nav className="customer-navbar-menu">

              <button
                type="button"
                className="active"
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
                onClick={() =>
                  history.push('/offers')
                }
              >
                <IonIcon
                  icon={giftOutline}
                />

                Offers
              </button>

              <button
                type="button"
                onClick={() => history.push('/profile')}
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
              className="customer-my-trips"
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
              HERO
          ================================================== */}

          <section className="customer-hero">

            <div className="customer-hero-overlay" />

            <div className="customer-hero-content">

              <span className="customer-hero-eyebrow">
                YOUR JOURNEY,
                SIMPLIFIED
              </span>

              <h1>
                Find the right bus.
                <br />
                Travel comfortably.
              </h1>

              <p>
                Search routes, compare
                services and reserve
                your preferred seat in
                just a few steps.
              </p>

            </div>

          </section>

          {/* =================================================
              SEARCH AREA
          ================================================== */}

          <section className="customer-search-area">

            <div className="customer-search-card">

              <div className="customer-search-heading">

                <div>

                  <span>
                    PLAN YOUR TRIP
                  </span>

                  <h2>
                    Search buses
                  </h2>

                  <p>
                    Where would you like
                    to travel?
                  </p>

                </div>

                <span className="customer-fast-booking">

                  <IonIcon
                    icon={
                      checkmarkCircleOutline
                    }
                  />

                  Fast booking

                </span>

              </div>

              <div className="customer-search-form">

                {/* =========================================
                    FROM
                ========================================== */}

                <div className="customer-search-field">

                  <span className="customer-field-icon">

                    <IonIcon
                      icon={
                        locationOutline
                      }
                    />

                  </span>

                  <div className="customer-field-copy">

                    <label>
                      FROM
                    </label>

                    <input
                      type="text"
                      placeholder="Enter departure city"
                      value={
                        search.from
                      }
                      onChange={(
                        event,
                      ) => {
                        setSearch({
                          ...search,

                          from:
                            event
                              .target
                              .value,
                        });

                        setError('');
                      }}
                    />

                  </div>

                </div>

                {/* =========================================
                    SWAP
                ========================================== */}

                <div className="customer-swap-row">

                  <span />

                  <button
                    type="button"
                    className="customer-swap-button"
                    onClick={
                      swapCities
                    }
                    aria-label="Swap departure and destination"
                  >

                    <IonIcon
                      icon={
                        swapVerticalOutline
                      }
                    />

                  </button>

                </div>

                {/* =========================================
                    TO
                ========================================== */}

                <div className="customer-search-field">

                  <span className="customer-field-icon destination">

                    <IonIcon
                      icon={
                        busOutline
                      }
                    />

                  </span>

                  <div className="customer-field-copy">

                    <label>
                      TO
                    </label>

                    <input
                      type="text"
                      placeholder="Enter destination city"
                      value={
                        search.to
                      }
                      onChange={(
                        event,
                      ) => {
                        setSearch({
                          ...search,

                          to:
                            event
                              .target
                              .value,
                        });

                        setError('');
                      }}
                    />

                  </div>

                </div>

                {/* =========================================
                    DATE
                ========================================== */}

                <div className="customer-search-field">

                  <span className="customer-field-icon date">

                    <IonIcon
                      icon={
                        calendarOutline
                      }
                    />

                  </span>

                  <div className="customer-field-copy customer-date-copy">

                    <label>
                      JOURNEY DATE
                    </label>

                    <button
                      type="button"
                      className="customer-date-trigger"
                      onClick={() =>
                        openDatePicker(
                          journeyDateInputRef.current,
                        )
                      }
                    >
                      <strong>
                        {
                          formatDate(
                            search.date,
                          )
                        }
                      </strong>

                      <IonIcon
                        icon={
                          calendarOutline
                        }
                      />
                    </button>

                    <input
                      ref={
                        journeyDateInputRef
                      }
                      className="customer-native-date-input"
                      type="date"
                      min={
                        todayValue
                      }
                      value={
                        search.date
                      }
                      onChange={(
                        event,
                      ) => {
                        setSearch({
                          ...search,

                          date:
                            event
                              .target
                              .value,
                        });

                        setError('');
                      }}
                      aria-label="Journey date"
                    />

                  </div>

                </div>

                {/* =========================================
                    ERROR
                ========================================== */}

                {error && (
                  <div className="customer-search-error">
                    {error}
                  </div>
                )}

                {/* =========================================
                    SEARCH BUTTON
                ========================================== */}

                <button
                  type="button"
                  className="customer-search-submit"
                  onClick={
                    handleSearch
                  }
                >

                  <span>
                    Search Buses
                  </span>

                  <IonIcon
                    icon={
                      searchOutline
                    }
                  />

                </button>

                <button
                  type="button"
                  className="customer-whatsapp-book"
                  onClick={() => {
                    const number = import.meta.env.VITE_BUSGO_WHATSAPP_NUMBER || '';
                    const text = encodeURIComponent('BOOK');
                    if (number) window.open(`https://wa.me/${String(number).replace(/\D/g, '')}?text=${text}`, '_blank', 'noopener,noreferrer');
                    else setError('WhatsApp booking number is not configured yet.');
                  }}
                >
                  <IonIcon icon={logoWhatsapp} />
                  <span><strong>Book on WhatsApp</strong><small>Chat with BusGo to search and reserve seats</small></span>
                  <IonIcon icon={chevronForwardOutline} />
                </button>

              </div>

              {/* ===========================================
                  QUICK DATES
              ============================================ */}

              <div className="customer-quick-date-area">

                <span className="customer-quick-label">
                  Quick dates
                </span>

                <button
                  type="button"
                  className={
                    search.date ===
                      todayValue
                      ? 'customer-quick-date active'
                      : 'customer-quick-date'
                  }
                  onClick={() => {
                    setSearch({
                      ...search,
                      date:
                        todayValue,
                    });

                    setError('');
                  }}
                >

                  <span className="customer-quick-dot" />

                  <span>

                    <strong>
                      Today
                    </strong>

                    <small>
                      {
                        formatQuickDate(
                          todayValue,
                        )
                      }
                    </small>

                  </span>

                </button>

                <button
                  type="button"
                  className={
                    search.date ===
                      tomorrowValue
                      ? 'customer-quick-date active'
                      : 'customer-quick-date'
                  }
                  onClick={() => {
                    setSearch({
                      ...search,
                      date:
                        tomorrowValue,
                    });

                    setError('');
                  }}
                >

                  <span className="customer-quick-dot" />

                  <span>

                    <strong>
                      Tomorrow
                    </strong>

                    <small>
                      {
                        formatQuickDate(
                          tomorrowValue,
                        )
                      }
                    </small>

                  </span>

                </button>

                <div className="customer-choose-date-wrapper">

                  <button
                    type="button"
                    className="customer-choose-date"
                    onClick={() =>
                      openDatePicker(
                        anotherDateInputRef.current,
                      )
                    }
                  >

                    <span className="customer-choose-date-plus">
                      +
                    </span>

                    <span>

                      <strong>
                        Choose another
                        date
                      </strong>

                      <small>
                        Open calendar
                      </small>

                    </span>

                  </button>

                  <input
                    ref={
                      anotherDateInputRef
                    }
                    className="customer-native-date-input"
                    type="date"
                    min={
                      todayValue
                    }
                    value={
                      search.date
                    }
                    onChange={(
                      event,
                    ) => {
                      setSearch({
                        ...search,

                        date:
                          event
                            .target
                            .value,
                      });

                      setError('');
                    }}
                    aria-label="Choose another journey date"
                  />

                </div>

              </div>

            </div>

          </section>

          {/* =================================================
              POPULAR ROUTES
          ================================================== */}

          <section className="customer-home-section">

            <div className="customer-section-heading">

              <div>

                <span>
                  EXPLORE
                </span>

                <h2>
                  Popular routes
                </h2>

                <p>
                  Quickly select one of
                  the frequently travelled
                  routes.
                </p>

              </div>

            </div>

            <div className="customer-routes-grid">

              {popularRoutes.map(
                (
                  route,
                ) => (
                  <button
                    type="button"
                    key={`${route.from}-${route.to}`}
                    className="customer-route-card"
                    onClick={() =>
                      chooseRoute(
                        route,
                      )
                    }
                  >

                    <span className="customer-route-icon">

                      <IonIcon
                        icon={
                          busOutline
                        }
                      />

                    </span>

                    <span className="customer-route-content">

                      <strong>
                        {
                          route.from
                        }
                        {' → '}
                        {
                          route.to
                        }
                      </strong>

                      <small>
                        {
                          route.subtitle
                        }
                      </small>

                    </span>

                    <IonIcon
                      className="customer-route-arrow"
                      icon={
                        chevronForwardOutline
                      }
                    />

                  </button>
                ),
              )}

            </div>

          </section>

          {/* =================================================
              OFFERS / BENEFITS
          ================================================== */}

          <section className="customer-home-section customer-benefits-section">

            <div className="customer-section-heading">

              <div>

                <span>
                  WHY BUSGO
                </span>

                <h2>
                  Better booking experience
                </h2>

                <p>
                  Everything you need
                  before starting your
                  journey.
                </p>

              </div>

            </div>

            <div className="customer-benefits-grid">

              {offers.map(
                (
                  offer,
                  index,
                ) => (
                  <article
                    key={
                      offer.title
                    }
                    className="customer-benefit-card"
                  >

                    <div className={`customer-benefit-icon benefit-${index + 1}`}>

                      {index === 0 ? (
                        <IonIcon
                          icon={
                            calendarOutline
                          }
                        />
                      ) : index ===
                        1 ? (
                        <IonIcon
                          icon={
                            busOutline
                          }
                        />
                      ) : (
                        <IonIcon
                          icon={
                            checkmarkCircleOutline
                          }
                        />
                      )}

                    </div>

                    <span className="customer-benefit-badge">
                      {
                        offer.badge
                      }
                    </span>

                    <h3>
                      {
                        offer.title
                      }
                    </h3>

                    <p>
                      {
                        offer.description
                      }
                    </p>

                  </article>
                ),
              )}

            </div>

          </section>

          {/* =================================================
              CTA
          ================================================== */}

          <section className="customer-home-cta">

            <div>

              <span>
                READY TO TRAVEL?
              </span>

              <h2>
                Find your next bus
                in seconds.
              </h2>

              <p>
                Search available trips,
                choose your seat and
                complete your booking.
              </p>

            </div>

            <button
              type="button"
              onClick={() =>
                window.scrollTo({
                  top: 0,
                  behavior:
                    'smooth',
                })
              }
            >
              Search Now

              <IonIcon
                icon={
                  chevronForwardOutline
                }
              />

            </button>

          </section>

          {/* =================================================
              MOBILE NAVIGATION
          ================================================== */}

          <nav className="customer-mobile-nav">

            <button
              type="button"
              className="active"
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
              onClick={() => history.push('/profile')}
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