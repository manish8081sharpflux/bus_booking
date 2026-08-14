import {
  useEffect,
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
  chevronBackOutline,
  chevronForwardOutline,
  giftOutline,
  homeOutline,
  locationOutline,
  logoWhatsapp,
  personOutline,
  receiptOutline,
  searchOutline,
  swapVerticalOutline,
  ticketOutline,
} from 'ionicons/icons';

import { useHistory } from 'react-router-dom';

import './HomePage.css';

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

const toInputDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const fromInputDate = (value: string) => {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
};

const formatDate = (value: string) => {
  if (!value) return 'Select journey date';

  const date = fromInputDate(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const formatQuickDate = (value: string) => {
  if (!value) return '';

  return fromInputDate(value).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
  });
};

const sameDate = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const startOfDay = (date: Date) => {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
};

const startOfMonth = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), 1);

const monthKey = (date: Date) =>
  `${date.getFullYear()}-${date.getMonth()}`;

export default function HomePage() {
  const history = useHistory();

  const today = useMemo(() => startOfDay(new Date()), []);

  const tomorrow = useMemo(() => {
    const date = new Date(today);
    date.setDate(date.getDate() + 1);
    return date;
  }, [today]);

  const todayValue = toInputDate(today);
  const tomorrowValue = toInputDate(tomorrow);

  const [search, setSearch] = useState<SearchForm>({
    from: 'Pune',
    to: 'Mumbai',
    date: todayValue,
  });

  const [error, setError] = useState('');
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() =>
    startOfMonth(fromInputDate(todayValue)),
  );

  const calendarRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!calendarOpen) return;

    const handleOutsideClick = (event: MouseEvent) => {
      if (
        calendarRef.current &&
        !calendarRef.current.contains(event.target as Node)
      ) {
        setCalendarOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setCalendarOpen(false);
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [calendarOpen]);

  const popularRoutes: PopularRoute[] = [
    {
      from: 'Pune',
      to: 'Mumbai',
      subtitle: 'Frequent buses available',
    },
    {
      from: 'Pune',
      to: 'Goa',
      subtitle: 'Popular weekend route',
    },
    {
      from: 'Mumbai',
      to: 'Pune',
      subtitle: 'Multiple daily services',
    },
    {
      from: 'Pune',
      to: 'Nashik',
      subtitle: 'Comfortable city travel',
    },
  ];

  const offers: Offer[] = [
    {
      title: 'Easy Cancellation',
      description: 'Flexible cancellation on selected services.',
      badge: 'Flexible',
    },
    {
      title: 'Live Seat Availability',
      description: 'Choose from real-time available seats.',
      badge: 'Live',
    },
    {
      title: 'Secure Booking',
      description: 'Safe booking and instant confirmation.',
      badge: 'Secure',
    },
  ];

  const selectedDate = useMemo(
    () => fromInputDate(search.date || todayValue),
    [search.date, todayValue],
  );

  const calendarDays = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const first = new Date(year, month, 1);
    const last = new Date(year, month + 1, 0);

    // Monday = 0, Tuesday = 1 ... Sunday = 6
    const leading = (first.getDay() + 6) % 7;
    const result: Array<Date | null> = Array.from(
      { length: leading },
      () => null,
    );

    for (let day = 1; day <= last.getDate(); day += 1) {
      result.push(new Date(year, month, day));
    }

    while (result.length % 7 !== 0) result.push(null);
    return result;
  }, [calendarMonth]);

  const currentMonthStart = useMemo(() => startOfMonth(today), [today]);
  const canGoPrevious =
    monthKey(calendarMonth) !== monthKey(currentMonthStart) &&
    calendarMonth > currentMonthStart;

  const openCalendar = () => {
    setError('');
    setCalendarMonth(startOfMonth(selectedDate));
    setCalendarOpen(true);
  };

  const chooseDate = (date: Date) => {
    if (startOfDay(date) < today) return;

    setSearch((previous) => ({
      ...previous,
      date: toInputDate(date),
    }));
    setError('');
    setCalendarOpen(false);
  };

  const handleSearch = () => {
    const from = search.from.trim();
    const to = search.to.trim();

    if (!from || !to) {
      setError('Please enter both departure and destination cities.');
      return;
    }

    if (from.toLowerCase() === to.toLowerCase()) {
      setError('Departure and destination cannot be the same.');
      return;
    }

    if (!search.date) {
      setError('Please select your journey date.');
      return;
    }

    const chosen = startOfDay(fromInputDate(search.date));
    if (chosen < today) {
      setError('Journey date cannot be in the past.');
      return;
    }

    setError('');

    history.push(
      `/search?from=${encodeURIComponent(from)}&to=${encodeURIComponent(
        to,
      )}&date=${encodeURIComponent(search.date)}`,
    );
  };

  const swapCities = () => {
    setSearch((previous) => ({
      ...previous,
      from: previous.to,
      to: previous.from,
    }));
    setError('');
  };

  const chooseRoute = (route: PopularRoute) => {
    setSearch((previous) => ({
      ...previous,
      from: route.from,
      to: route.to,
    }));
    setError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <IonPage>
      <IonContent fullscreen>
        <div className="customer-home-page">
          <header className="customer-navbar">
            <button
              type="button"
              className="customer-brand"
              onClick={() => history.push('/home')}
            >
              <span className="customer-brand-icon">
                <IonIcon icon={busOutline} />
              </span>

              <span className="customer-brand-copy">
                <strong>BusGo</strong>
                <small>Smart bus booking</small>
              </span>
            </button>

            <nav className="customer-navbar-menu">
              <button
                type="button"
                className="active"
                onClick={() => history.push('/home')}
              >
                <IonIcon icon={homeOutline} />
                Home
              </button>

              <button type="button" onClick={() => history.push('/bookings')}>
                <IonIcon icon={ticketOutline} />
                Bookings
              </button>

              <button type="button" onClick={() => history.push('/offers')}>
                <IonIcon icon={giftOutline} />
                Offers
              </button>

              <button type="button" onClick={() => history.push('/profile')}>
                <IonIcon icon={personOutline} />
                Profile
              </button>
            </nav>

            <button
              type="button"
              className="customer-my-trips"
              onClick={() => history.push('/bookings')}
            >
              <IonIcon icon={receiptOutline} />
              My Trips
            </button>
          </header>

          <section className="customer-hero">
            <div className="customer-hero-overlay" />

            <div className="customer-hero-content">
              <span className="customer-hero-eyebrow">
                YOUR JOURNEY, SIMPLIFIED
              </span>

              <h1>
                Find the right bus.
                <br />
                Travel comfortably.
              </h1>

              <p>
                Search routes, compare services and reserve your preferred seat
                in just a few steps.
              </p>
            </div>
          </section>

          <section className="customer-search-area">
            <div className="customer-search-card">
              <div className="customer-search-heading">
                <div>
                  <span>PLAN YOUR TRIP</span>
                  <h2>Search buses</h2>
                  <p>Where would you like to travel?</p>
                </div>

                <span className="customer-fast-booking">
                  <IonIcon icon={checkmarkCircleOutline} />
                  Fast booking
                </span>
              </div>

              <div className="customer-search-form">
                <div className="customer-search-field">
                  <span className="customer-field-icon">
                    <IonIcon icon={locationOutline} />
                  </span>

                  <div className="customer-field-copy">
                    <label>FROM</label>
                    <input
                      type="text"
                      placeholder="Enter departure city"
                      value={search.from}
                      onChange={(event) => {
                        setSearch((previous) => ({
                          ...previous,
                          from: event.target.value,
                        }));
                        setError('');
                      }}
                    />
                  </div>
                </div>

                <div className="customer-swap-row">
                  <span />
                  <button
                    type="button"
                    className="customer-swap-button"
                    onClick={swapCities}
                    aria-label="Swap departure and destination"
                  >
                    <IonIcon icon={swapVerticalOutline} />
                  </button>
                </div>

                <div className="customer-search-field">
                  <span className="customer-field-icon destination">
                    <IonIcon icon={busOutline} />
                  </span>

                  <div className="customer-field-copy">
                    <label>TO</label>
                    <input
                      type="text"
                      placeholder="Enter destination city"
                      value={search.to}
                      onChange={(event) => {
                        setSearch((previous) => ({
                          ...previous,
                          to: event.target.value,
                        }));
                        setError('');
                      }}
                    />
                  </div>
                </div>

                <div
                  className={`customer-search-field customer-date-field${
                    calendarOpen ? ' calendar-open' : ''
                  }`}
                  ref={calendarRef}
                >
                  <span className="customer-field-icon date">
                    <IonIcon icon={calendarOutline} />
                  </span>

                  <div className="customer-field-copy customer-date-copy">
                    <label>JOURNEY DATE</label>

                    <button
                      type="button"
                      className="customer-date-trigger"
                      onClick={() =>
                        calendarOpen ? setCalendarOpen(false) : openCalendar()
                      }
                      aria-haspopup="dialog"
                      aria-expanded={calendarOpen}
                    >
                      <strong>{formatDate(search.date)}</strong>
                      <IonIcon icon={calendarOutline} />
                    </button>

                    {calendarOpen && (
                      <div
                        className="customer-calendar-popover"
                        role="dialog"
                        aria-label="Choose journey date"
                      >
                        <div className="customer-calendar-header">
                          <button
                            type="button"
                            className="customer-calendar-nav"
                            onClick={() =>
                              setCalendarMonth(
                                (previous) =>
                                  new Date(
                                    previous.getFullYear(),
                                    previous.getMonth() - 1,
                                    1,
                                  ),
                              )
                            }
                            disabled={!canGoPrevious}
                            aria-label="Previous month"
                          >
                            <IonIcon icon={chevronBackOutline} />
                          </button>

                          <strong>
                            {calendarMonth.toLocaleDateString('en-IN', {
                              month: 'long',
                              year: 'numeric',
                            })}
                          </strong>

                          <button
                            type="button"
                            className="customer-calendar-nav"
                            onClick={() =>
                              setCalendarMonth(
                                (previous) =>
                                  new Date(
                                    previous.getFullYear(),
                                    previous.getMonth() + 1,
                                    1,
                                  ),
                              )
                            }
                            aria-label="Next month"
                          >
                            <IonIcon icon={chevronForwardOutline} />
                          </button>
                        </div>

                        <div className="customer-calendar-weekdays">
                          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(
                            (day) => (
                              <span key={day}>{day}</span>
                            ),
                          )}
                        </div>

                        <div className="customer-calendar-grid">
                          {calendarDays.map((date, index) => {
                            if (!date) {
                              return (
                                <span
                                  className="customer-calendar-empty"
                                  key={`empty-${index}`}
                                />
                              );
                            }

                            const disabled = startOfDay(date) < today;
                            const active = sameDate(date, selectedDate);
                            const isToday = sameDate(date, today);

                            return (
                              <button
                                type="button"
                                key={toInputDate(date)}
                                className={[
                                  'customer-calendar-day',
                                  active ? 'active' : '',
                                  isToday ? 'today' : '',
                                ]
                                  .filter(Boolean)
                                  .join(' ')}
                                disabled={disabled}
                                onClick={() => chooseDate(date)}
                                aria-label={date.toLocaleDateString('en-IN', {
                                  day: 'numeric',
                                  month: 'long',
                                  year: 'numeric',
                                })}
                                aria-pressed={active}
                              >
                                {date.getDate()}
                              </button>
                            );
                          })}
                        </div>

                        <div className="customer-calendar-footer">
                          <button
                            type="button"
                            onClick={() => {
                              setCalendarMonth(startOfMonth(today));
                              chooseDate(today);
                            }}
                          >
                            Today
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {error && <div className="customer-search-error">{error}</div>}

                <button
                  type="button"
                  className="customer-search-submit"
                  onClick={handleSearch}
                >
                  <span>Search Buses</span>
                  <IonIcon icon={searchOutline} />
                </button>

                <button
                  type="button"
                  className="customer-whatsapp-book"
                  onClick={() => {
                    const number =
                      import.meta.env.VITE_BUSGO_WHATSAPP_NUMBER || '';
                    const text = encodeURIComponent('BOOK');

                    if (number) {
                      window.open(
                        `https://wa.me/${String(number).replace(
                          /\D/g,
                          '',
                        )}?text=${text}`,
                        '_blank',
                        'noopener,noreferrer',
                      );
                    } else {
                      setError('WhatsApp booking number is not configured yet.');
                    }
                  }}
                >
                  <IonIcon icon={logoWhatsapp} />
                  <span>
                    <strong>Book on WhatsApp</strong>
                    <small>Chat with BusGo to search and reserve seats</small>
                  </span>
                  <IonIcon icon={chevronForwardOutline} />
                </button>
              </div>

              <div className="customer-quick-date-area">
                <span className="customer-quick-label">Quick dates</span>

                <button
                  type="button"
                  className={
                    search.date === todayValue
                      ? 'customer-quick-date active'
                      : 'customer-quick-date'
                  }
                  onClick={() => {
                    setSearch((previous) => ({
                      ...previous,
                      date: todayValue,
                    }));
                    setError('');
                    setCalendarOpen(false);
                  }}
                >
                  <span className="customer-quick-dot" />
                  <span>
                    <strong>Today</strong>
                    <small>{formatQuickDate(todayValue)}</small>
                  </span>
                </button>

                <button
                  type="button"
                  className={
                    search.date === tomorrowValue
                      ? 'customer-quick-date active'
                      : 'customer-quick-date'
                  }
                  onClick={() => {
                    setSearch((previous) => ({
                      ...previous,
                      date: tomorrowValue,
                    }));
                    setError('');
                    setCalendarOpen(false);
                  }}
                >
                  <span className="customer-quick-dot" />
                  <span>
                    <strong>Tomorrow</strong>
                    <small>{formatQuickDate(tomorrowValue)}</small>
                  </span>
                </button>

                <button
                  type="button"
                  className="customer-choose-date"
                  onClick={openCalendar}
                >
                  <span className="customer-choose-date-plus">+</span>
                  <span>
                    <strong>Choose another date</strong>
                    <small>Open calendar</small>
                  </span>
                </button>
              </div>
            </div>
          </section>

          <section className="customer-home-section">
            <div className="customer-section-heading">
              <div>
                <span>EXPLORE</span>
                <h2>Popular routes</h2>
                <p>Quickly select one of the frequently travelled routes.</p>
              </div>
            </div>

            <div className="customer-routes-grid">
              {popularRoutes.map((route) => (
                <button
                  type="button"
                  key={`${route.from}-${route.to}`}
                  className="customer-route-card"
                  onClick={() => chooseRoute(route)}
                >
                  <span className="customer-route-icon">
                    <IonIcon icon={busOutline} />
                  </span>

                  <span className="customer-route-content">
                    <strong>
                      {route.from} {' → '} {route.to}
                    </strong>
                    <small>{route.subtitle}</small>
                  </span>

                  <IonIcon
                    className="customer-route-arrow"
                    icon={chevronForwardOutline}
                  />
                </button>
              ))}
            </div>
          </section>

          <section className="customer-home-section customer-benefits-section">
            <div className="customer-section-heading">
              <div>
                <span>WHY BUSGO</span>
                <h2>Better booking experience</h2>
                <p>Everything you need before starting your journey.</p>
              </div>
            </div>

            <div className="customer-benefits-grid">
              {offers.map((offer, index) => (
                <article key={offer.title} className="customer-benefit-card">
                  <div className={`customer-benefit-icon benefit-${index + 1}`}>
                    {index === 0 ? (
                      <IonIcon icon={calendarOutline} />
                    ) : index === 1 ? (
                      <IonIcon icon={busOutline} />
                    ) : (
                      <IonIcon icon={checkmarkCircleOutline} />
                    )}
                  </div>

                  <span className="customer-benefit-badge">{offer.badge}</span>
                  <h3>{offer.title}</h3>
                  <p>{offer.description}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="customer-home-cta">
            <div>
              <span>READY TO TRAVEL?</span>
              <h2>Find your next bus in seconds.</h2>
              <p>
                Search available trips, choose your seat and complete your
                booking.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                window.scrollTo({ top: 0, behavior: 'smooth' })
              }
            >
              Search Now
              <IonIcon icon={chevronForwardOutline} />
            </button>
          </section>

          <nav className="customer-mobile-nav">
            <button type="button" className="active">
              <IonIcon icon={homeOutline} />
              <span>Home</span>
            </button>

            <button type="button" onClick={() => history.push('/bookings')}>
              <IonIcon icon={ticketOutline} />
              <span>Bookings</span>
            </button>

            <button type="button" onClick={() => history.push('/offers')}>
              <IonIcon icon={giftOutline} />
              <span>Offers</span>
            </button>

            <button type="button" onClick={() => history.push('/profile')}>
              <IonIcon icon={personOutline} />
              <span>Profile</span>
            </button>
          </nav>
        </div>
      </IonContent>
    </IonPage>
  );
}