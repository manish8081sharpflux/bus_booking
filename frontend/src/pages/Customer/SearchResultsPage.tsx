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
  arrowForwardOutline,
  busOutline,
  calendarOutline,
  checkmarkOutline,
  chevronDownOutline,
  flashOutline,
  locationOutline,
  navigateOutline,
  searchOutline,
  swapHorizontalOutline,
  timeOutline,
  wifiOutline,
} from 'ionicons/icons';

import {
  useHistory,
  useLocation,
} from 'react-router-dom';

import './SearchResultsPage.css';

/* =========================================================
   API
========================================================= */

const API =
  import.meta.env.VITE_OPERATOR_API_URL ||
  'http://localhost:4000/api';

/* =========================================================
   TYPES
========================================================= */

interface SearchTrip {
  id: string;

  operator?: string;
  operator_name?: string;
  display_name?: string;

  bus?: string;
  bus_name?: string;

  bus_type: string;

  service_number?: string;

  source_city?: string;
  destination_city?: string;

  departure_at: string;
  arrival_at: string;

  amenities?: string[];

  starting_fare:
    | number
    | string;

  available_seats: number;

  total_seats?: number;

  rating?: number;

  review_count?: number;
  dynamic_adjustment?: number;
  pricing_rules_applied?: {name:string;delta:number;after:number}[];

  boarding_points?: {id:string;name:string;city?:string;address?:string;landmark?:string}[];

  dropping_points?: {id:string;name:string;city?:string;address?:string;landmark?:string}[];
}

interface Filters {
  ac: boolean;
  nonAc: boolean;
  sleeper: boolean;
  seater: boolean;

  before6: boolean;
  morning: boolean;
  afternoon: boolean;
  evening: boolean;

  wifi: boolean;
  charging: boolean;
  gps: boolean;
  tv: boolean;
}

type SortType =
  | 'recommended'
  | 'departure'
  | 'arrival'
  | 'duration'
  | 'price';

const SEARCH_LOCATIONS = [
  ['Pune', 'Maharashtra'], ['Mumbai', 'Maharashtra'], ['Nashik', 'Maharashtra'],
  ['Nagpur', 'Maharashtra'], ['Aurangabad', 'Maharashtra'], ['Kolhapur', 'Maharashtra'],
  ['Ahmednagar', 'Maharashtra'], ['Solapur', 'Maharashtra'], ['Goa', 'Goa'],
  ['Bengaluru', 'Karnataka'], ['Hyderabad', 'Telangana'], ['Indore', 'Madhya Pradesh'],
  ['Surat', 'Gujarat'], ['Ahmedabad', 'Gujarat'],
] as const;

const recentLocations = () => {
  try {
    const stored = JSON.parse(localStorage.getItem('busgo_recent_locations') || '[]');
    return Array.isArray(stored) ? stored.filter((item) => typeof item === 'string').slice(0, 5) : [];
  } catch { return []; }
};

function ModifyLocationField({ label, value, icon, onChange }: {
  label: string; value: string; icon: string; onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const query = value.trim().toLowerCase();
  const matches = SEARCH_LOCATIONS.filter(([name, region]) =>
    `${name} ${region}`.toLowerCase().includes(query),
  );
  const choose = (name: string) => { onChange(name); setOpen(false); };

  return (
    <div className={`modify-search-field modify-location-field${open ? ' is-open' : ''}`}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node)) setOpen(false);
      }}>
      <IonIcon icon={icon} />
      <div>
        <label>{label}</label>
        <input type="text" autoComplete="off" value={value}
          onFocus={() => setOpen(true)}
          onChange={(event) => { onChange(event.target.value); setOpen(true); }}
          onKeyDown={(event) => { if (event.key === 'Escape') setOpen(false); }} />
      </div>
      {value && <button type="button" className="modify-location-clear"
        aria-label={`Clear ${label}`} onClick={() => { onChange(''); setOpen(true); }}>×</button>}
      {open && <div className="modify-location-menu">
        {!query && recentLocations().length > 0 && <section>
          <h3>Recent searches</h3>
          {recentLocations().map((name) => <button type="button" key={name} onClick={() => choose(name)}>
            <IonIcon icon={timeOutline} /><span><strong>{name}</strong><small>Recent location</small></span>
          </button>)}
        </section>}
        <section>
          <h3>{query ? 'Search results' : 'Popular locations near you'}</h3>
          {(query ? matches : SEARCH_LOCATIONS.slice(0, 6)).map(([name, region]) =>
            <button type="button" key={name} onClick={() => choose(name)}>
              <IonIcon icon={query ? locationOutline : navigateOutline} />
              <span><strong>{name}</strong><small>{region}</small></span>
            </button>)}
          {query && matches.length === 0 && <p>No matching location found.</p>}
        </section>
      </div>}
    </div>
  );
}

/* =========================================================
   REQUEST
========================================================= */

const request =
  async <T,>(
    path: string,
  ): Promise<T> => {
    const response =
      await fetch(
        `${API}${path}`,
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
        `Search service returned ${response.status}.`,
      );
    }

    if (
      !response.ok ||
      body?.success === false
    ) {
      throw new Error(
        body?.message ||
          'Unable to search buses.',
      );
    }

    return (
      body?.data ??
      body
    ) as T;
  };

/* =========================================================
   HELPERS
========================================================= */

const normalize =
  (value?: string) =>
    (
      value || ''
    )
      .trim()
      .toUpperCase();

const formatBusType = (
  value?: string,
) => {
  if (!value) {
    return '';
  }

  return value
    .replaceAll(
      '_',
      ' ',
    )
    .toLowerCase()
    .replace(
      /\b\w/g,
      (letter) =>
        letter.toUpperCase(),
    );
};

const formatAmenity = (
  value: string,
) => {
  return value
    .replaceAll(
      '_',
      ' ',
    )
    .toLowerCase()
    .replace(
      /\b\w/g,
      (letter) =>
        letter.toUpperCase(),
    );
};

const formatTime = (
  value?: string,
) => {
  if (!value) {
    return '--:--';
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

const formatDate = (
  value?: string,
) => {
  if (!value) {
    return '';
  }

  /*
   * Query date normally comes as YYYY-MM-DD
   */

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

const formatCurrency = (
  value:
    | string
    | number,
) => {
  const amount =
    Number(value);

  if (
    !Number.isFinite(
      amount,
    )
  ) {
    return '₹0';
  }

  return new Intl.NumberFormat(
    'en-IN',
    {
      style: 'currency',
      currency: 'INR',

      maximumFractionDigits: 0,
    },
  ).format(amount);
};

const durationInMinutes = (
  departure: string,
  arrival: string,
) => {
  const start =
    new Date(
      departure,
    ).getTime();

  const end =
    new Date(
      arrival,
    ).getTime();

  if (
    !Number.isFinite(start) ||
    !Number.isFinite(end)
  ) {
    return 0;
  }

  let difference =
    end - start;

  /*
   * Defensive fallback if backend sends
   * arrival on next day without date adjustment.
   */

  if (
    difference < 0
  ) {
    difference +=
      24 *
      60 *
      60 *
      1000;
  }

  return Math.max(
    0,
    Math.round(
      difference /
        60000,
    ),
  );
};

const formatDuration = (
  minutes: number,
) => {
  if (
    !minutes
  ) {
    return '--';
  }

  const hours =
    Math.floor(
      minutes /
        60,
    );

  const remaining =
    minutes %
    60;

  if (
    remaining ===
    0
  ) {
    return `${hours}h`;
  }

  return `${hours}h ${remaining}m`;
};

const getHour = (
  value: string,
) => {
  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return 0;
  }

  return date.getHours();
};

const amenityExists = (
  trip: SearchTrip,
  names: string[],
) => {
  const amenities =
    (
      trip.amenities ||
      []
    ).map(
      normalize,
    );

  return names.some(
    (name) =>
      amenities.some(
        (amenity) =>
          amenity.includes(
            normalize(
              name,
            ),
          ),
      ),
  );
};

/* =========================================================
   CHECKBOX
========================================================= */

interface FilterCheckboxProps {
  checked: boolean;

  label: string;

  count?: number;

  onChange:
    () => void;
}

const FilterCheckbox = ({
  checked,
  label,
  count,
  onChange,
}: FilterCheckboxProps) => {
  return (
    <button
      type="button"
      className="search-filter-check"
      onClick={
        onChange
      }
    >
      <span
        className={
          checked
            ? 'search-checkbox checked'
            : 'search-checkbox'
        }
      >
        {checked && (
          <IonIcon
            icon={
              checkmarkOutline
            }
          />
        )}
      </span>

      <span className="search-filter-check-label">
        {label}
      </span>

      {count !==
        undefined && (
        <span className="search-filter-count">
          {count}
        </span>
      )}
    </button>
  );
};

/* =========================================================
   RADIO FILTER
========================================================= */

interface TimeFilterProps {
  active: boolean;

  label: string;

  subLabel?: string;

  onClick:
    () => void;
}

const TimeFilter = ({
  active,
  label,
  subLabel,
  onClick,
}: TimeFilterProps) => {
  return (
    <button
      type="button"
      className={
        active
          ? 'time-filter active'
          : 'time-filter'
      }
      onClick={
        onClick
      }
    >
      <span className="time-radio">

        {active && (
          <span />
        )}

      </span>

      <span>

        <strong>
          {label}
        </strong>

        {subLabel && (
          <small>
            {subLabel}
          </small>
        )}

      </span>
    </button>
  );
};

/* =========================================================
   PAGE
========================================================= */

export default function SearchResultsPage() {
  const history =
    useHistory();

  const location =
    useLocation();

  /* =======================================================
     QUERY PARAMS
  ======================================================= */

  const query =
    useMemo(
      () =>
        new URLSearchParams(
          location.search,
        ),
      [
        location.search,
      ],
    );

  const initialFrom =
    query.get('from') ||
    '';

  const initialTo =
    query.get('to') ||
    '';

  const initialDate =
    query.get('date') ||
    '';

  /* =======================================================
     SEARCH BAR STATE
  ======================================================= */

  const [
    from,
    setFrom,
  ] =
    useState(
      initialFrom,
    );

  const [
    to,
    setTo,
  ] =
    useState(
      initialTo,
    );

  const [
    date,
    setDate,
  ] =
    useState(
      initialDate,
    );

  /* =======================================================
     RESULTS
  ======================================================= */

  const [
    trips,
    setTrips,
  ] =
    useState<
      SearchTrip[]
    >([]);

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
     FILTERS
  ======================================================= */

  const [
    filters,
    setFilters,
  ] =
    useState<Filters>({
      ac: false,
      nonAc: false,
      sleeper: false,
      seater: false,

      before6: false,
      morning: false,
      afternoon: false,
      evening: false,

      wifi: false,
      charging: false,
      gps: false,
      tv: false,
    });

  const [
    sort,
    setSort,
  ] =
    useState<SortType>(
      'recommended',
    );


  const [minRating,setMinRating]=useState(0);
  const [maxPrice,setMaxPrice]=useState(0);
  const [boardingQuery,setBoardingQuery]=useState('');
  const [droppingQuery,setDroppingQuery]=useState('');

  /* =======================================================
     LOAD RESULTS
  ======================================================= */

  const searchBuses =
    async (
      source =
        from,
      destination =
        to,
      travelDate =
        date,
    ) => {
      if (
        !source.trim() ||
        !destination.trim() ||
        !travelDate
      ) {
        setError(
          'Please enter source, destination and travel date.',
        );

        return;
      }

      try {
        setLoading(true);
        setError('');

        const params =
          new URLSearchParams({
            from:
              source.trim(),

            to:
              destination.trim(),

            date:
              travelDate,
          });

        /*
         * If your backend currently uses
         * sourceCity/destinationCity/travelDate,
         * only change these query parameter names.
         */

        const data =
          await request<
            SearchTrip[]
          >(
            `/trips/search/public?${params.toString()}`,
          );

        setTrips(
          Array.isArray(
            data,
          )
            ? data
            : [],
        );
      } catch (
        requestError
      ) {
        setError(
          requestError instanceof
            Error
            ? requestError.message
            : 'Unable to search buses.',
        );

        setTrips([]);
      } finally {
        setLoading(false);
      }
    };

  useEffect(
    () => {
      if (
        initialFrom &&
        initialTo &&
        initialDate
      ) {
        void searchBuses(
          initialFrom,
          initialTo,
          initialDate,
        );
      } else {
        setLoading(false);
      }
    },
    [
      initialFrom,
      initialTo,
      initialDate,
    ],
  );

  /* =======================================================
     MODIFY SEARCH
  ======================================================= */

  const submitSearch =
    () => {
      if (
        !from.trim() ||
        !to.trim() ||
        !date
      ) {
        setError(
          'Please enter source, destination and date.',
        );

        return;
      }

      const updatedRecent = [from.trim(), to.trim(), ...recentLocations()]
        .filter((item, index, all) =>
          all.findIndex((entry) => entry.toLowerCase() === item.toLowerCase()) === index,
        ).slice(0, 5);
      localStorage.setItem('busgo_recent_locations', JSON.stringify(updatedRecent));

      history.push(
        `/search?from=${encodeURIComponent(
          from.trim(),
        )}&to=${encodeURIComponent(
          to.trim(),
        )}&date=${encodeURIComponent(
          date,
        )}`,
      );
    };

  /* =======================================================
     SWAP
  ======================================================= */

  const swapCities =
    () => {
      const oldFrom =
        from;

      setFrom(to);
      setTo(oldFrom);
    };

  /* =======================================================
     TODAY/TOMORROW
  ======================================================= */

  const setDay =
    (
      offset: number,
    ) => {
      const value =
        new Date();

      value.setDate(
        value.getDate() +
          offset,
      );

      const yyyy =
        value.getFullYear();

      const mm =
        String(
          value.getMonth() +
            1,
        ).padStart(
          2,
          '0',
        );

      const dd =
        String(
          value.getDate(),
        ).padStart(
          2,
          '0',
        );

      setDate(
        `${yyyy}-${mm}-${dd}`,
      );
    };

  /* =======================================================
     FILTER COUNTS
  ======================================================= */

  const counts =
    useMemo(
      () => {
        return {
          ac:
            trips.filter(
              (trip) =>
                normalize(
                  trip.bus_type,
                ).includes(
                  'AC',
                ) &&
                !normalize(
                  trip.bus_type,
                ).includes(
                  'NON_AC',
                ),
            ).length,

          nonAc:
            trips.filter(
              (trip) =>
                normalize(
                  trip.bus_type,
                ).includes(
                  'NON_AC',
                ) ||
                normalize(
                  trip.bus_type,
                ).includes(
                  'NON AC',
                ),
            ).length,

          sleeper:
            trips.filter(
              (trip) =>
                normalize(
                  trip.bus_type,
                ).includes(
                  'SLEEPER',
                ),
            ).length,

          seater:
            trips.filter(
              (trip) =>
                normalize(
                  trip.bus_type,
                ).includes(
                  'SEATER',
                ),
            ).length,
        };
      },
      [
        trips,
      ],
    );

  /* =======================================================
     FILTER + SORT
  ======================================================= */

  const visibleTrips =
    useMemo(
      () => {
        let result =
          [
            ...trips,
          ];

        /* BUS TYPE */

        if (
          filters.ac
        ) {
          result =
            result.filter(
              (trip) => {
                const type =
                  normalize(
                    trip.bus_type,
                  );

                return (
                  type.includes(
                    'AC',
                  ) &&
                  !type.includes(
                    'NON_AC',
                  ) &&
                  !type.includes(
                    'NON AC',
                  )
                );
              },
            );
        }

        if (
          filters.nonAc
        ) {
          result =
            result.filter(
              (trip) => {
                const type =
                  normalize(
                    trip.bus_type,
                  );

                return (
                  type.includes(
                    'NON_AC',
                  ) ||
                  type.includes(
                    'NON AC',
                  )
                );
              },
            );
        }

        if (
          filters.sleeper
        ) {
          result =
            result.filter(
              (trip) =>
                normalize(
                  trip.bus_type,
                ).includes(
                  'SLEEPER',
                ),
            );
        }

        if (
          filters.seater
        ) {
          result =
            result.filter(
              (trip) =>
                normalize(
                  trip.bus_type,
                ).includes(
                  'SEATER',
                ),
            );
        }

        /* TIME */

        const anyTime =
          filters.before6 ||
          filters.morning ||
          filters.afternoon ||
          filters.evening;

        if (
          anyTime
        ) {
          result =
            result.filter(
              (trip) => {
                const hour =
                  getHour(
                    trip.departure_at,
                  );

                return (
                  (
                    filters.before6 &&
                    hour < 6
                  ) ||
                  (
                    filters.morning &&
                    hour >= 6 &&
                    hour < 12
                  ) ||
                  (
                    filters.afternoon &&
                    hour >= 12 &&
                    hour < 18
                  ) ||
                  (
                    filters.evening &&
                    hour >= 18
                  )
                );
              },
            );
        }

        /* AMENITIES */

        if (
          filters.wifi
        ) {
          result =
            result.filter(
              (trip) =>
                amenityExists(
                  trip,
                  [
                    'WIFI',
                    'WI-FI',
                  ],
                ),
            );
        }

        if (
          filters.charging
        ) {
          result =
            result.filter(
              (trip) =>
                amenityExists(
                  trip,
                  [
                    'CHARGING',
                    'CHARGING_POINT',
                  ],
                ),
            );
        }

        if (
          filters.gps
        ) {
          result =
            result.filter(
              (trip) =>
                amenityExists(
                  trip,
                  [
                    'GPS',
                    'GPS_TRACKING',
                    'LIVE_TRACKING',
                  ],
                ),
            );
        }

        if (
          filters.tv
        ) {
          result =
            result.filter(
              (trip) =>
                amenityExists(
                  trip,
                  [
                    'TV',
                    'ENTERTAINMENT',
                  ],
                ),
            );
        }

        /* OTA QUALITY / PRICE / STOP FILTERS */
        if (minRating > 0) result = result.filter((trip) => Number(trip.rating || 0) >= minRating);
        if (maxPrice > 0) result = result.filter((trip) => Number(trip.starting_fare || 0) <= maxPrice);
        if (boardingQuery.trim()) {
          const q = boardingQuery.trim().toLowerCase();
          result = result.filter((trip) => (trip.boarding_points || []).some((point) => `${point.name} ${point.city || ''} ${point.address || ''} ${point.landmark || ''}`.toLowerCase().includes(q)));
        }
        if (droppingQuery.trim()) {
          const q = droppingQuery.trim().toLowerCase();
          result = result.filter((trip) => (trip.dropping_points || []).some((point) => `${point.name} ${point.city || ''} ${point.address || ''} ${point.landmark || ''}`.toLowerCase().includes(q)));
        }

        /* SORT */

        if (
          sort ===
          'price'
        ) {
          result.sort(
            (
              first,
              second,
            ) =>
              Number(
                first.starting_fare,
              ) -
              Number(
                second.starting_fare,
              ),
          );
        }

        if (
          sort ===
          'departure'
        ) {
          result.sort(
            (
              first,
              second,
            ) =>
              new Date(
                first.departure_at,
              ).getTime() -
              new Date(
                second.departure_at,
              ).getTime(),
          );
        }

        if (
          sort ===
          'arrival'
        ) {
          result.sort(
            (
              first,
              second,
            ) =>
              new Date(
                first.arrival_at,
              ).getTime() -
              new Date(
                second.arrival_at,
              ).getTime(),
          );
        }

        if (
          sort ===
          'duration'
        ) {
          result.sort(
            (
              first,
              second,
            ) =>
              durationInMinutes(
                first.departure_at,
                first.arrival_at,
              ) -
              durationInMinutes(
                second.departure_at,
                second.arrival_at,
              ),
          );
        }

        return result;
      },
      [
        trips,
        filters,
        sort,
        minRating,
        maxPrice,
        boardingQuery,
        droppingQuery,
      ],
    );

  /* =======================================================
     FILTER SETTER
  ======================================================= */

  const toggleFilter = (
    key:
      keyof Filters,
  ) => {
    setFilters(
      (
        previous,
      ) => ({
        ...previous,

        [key]:
          !previous[key],
      }),
    );
  };

  const clearFilters =
    () => {
      setFilters({
        ac: false,
        nonAc: false,
        sleeper: false,
        seater: false,

        before6: false,
        morning: false,
        afternoon: false,
        evening: false,

        wifi: false,
        charging: false,
        gps: false,
        tv: false,
      });
      setMinRating(0);
      setMaxPrice(0);
      setBoardingQuery('');
      setDroppingQuery('');
    };

  /* =======================================================
     UI
  ======================================================= */

  return (
    <IonPage>

      <IonContent fullscreen>

        <div className="customer-search-page">

          {/* ===============================================
              TOP SEARCH AREA
          ================================================ */}

          <div className="customer-search-top">

            <div className="customer-search-top-inner">

              <button
                type="button"
                className="search-results-back"
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
              </button>

              <div className="search-route-title">

                <strong>
                  {initialFrom ||
                    from ||
                    'From'}
                </strong>

                <IonIcon
                  icon={
                    arrowForwardOutline
                  }
                />

                <strong>
                  {initialTo ||
                    to ||
                    'To'}
                </strong>

              </div>

              <span className="search-result-count-top">
                {
                  visibleTrips.length
                }
                {' '}
                buses
              </span>

            </div>

          </div>

          {/* ===============================================
              COMPACT SEARCH BAR
          ================================================ */}

          <div className="search-modify-wrapper">

            <div className="search-modify-bar">

              {/* FROM */}

              <ModifyLocationField label="From" value={from} icon={busOutline} onChange={setFrom} />

              {/* SWAP */}

              <button
                type="button"
                className="modify-swap-button"
                onClick={
                  swapCities
                }
              >
                <IonIcon
                  icon={
                    swapHorizontalOutline
                  }
                />
              </button>

              {/* TO */}

              <ModifyLocationField label="To" value={to} icon={locationOutline} onChange={setTo} />

              {/* DATE */}

              <div className="modify-search-field date">

                <IonIcon
                  icon={
                    calendarOutline
                  }
                />

                <div>

                  <label>
                    Date of journey
                  </label>

                  <input
                    type="date"
                    value={
                      date
                    }
                    onChange={(
                      event,
                    ) =>
                      setDate(
                        event
                          .target
                          .value,
                      )
                    }
                  />

                </div>

              </div>

              <div className="quick-date-buttons">

                <button
                  type="button"
                  onClick={() =>
                    setDay(0)
                  }
                >
                  Today
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setDay(1)
                  }
                >
                  Tomorrow
                </button>

              </div>

              <button
                type="button"
                className="modify-search-submit"
                onClick={
                  submitSearch
                }
              >
                <IonIcon
                  icon={
                    searchOutline
                  }
                />
              </button>

            </div>

          </div>

          {/* ===============================================
              MAIN RESULTS AREA
          ================================================ */}

          <main className="search-results-main">

            {/* ============================================
                FILTER SIDEBAR
            ============================================= */}

            <aside className="search-filter-sidebar">

              <div className="search-filter-title">

                <h2>
                  Filter buses
                </h2>

                <button
                  type="button"
                  onClick={
                    clearFilters
                  }
                >
                  Clear all
                </button>

              </div>

              {/* BUS TYPE */}

              <div className="search-filter-section">

                <h3>
                  Bus Type
                </h3>

                <FilterCheckbox
                  label="AC"
                  count={
                    counts.ac
                  }
                  checked={
                    filters.ac
                  }
                  onChange={() =>
                    toggleFilter(
                      'ac',
                    )
                  }
                />

                <FilterCheckbox
                  label="Non AC"
                  count={
                    counts.nonAc
                  }
                  checked={
                    filters.nonAc
                  }
                  onChange={() =>
                    toggleFilter(
                      'nonAc',
                    )
                  }
                />

                <FilterCheckbox
                  label="Sleeper"
                  count={
                    counts.sleeper
                  }
                  checked={
                    filters.sleeper
                  }
                  onChange={() =>
                    toggleFilter(
                      'sleeper',
                    )
                  }
                />

                <FilterCheckbox
                  label="Seater"
                  count={
                    counts.seater
                  }
                  checked={
                    filters.seater
                  }
                  onChange={() =>
                    toggleFilter(
                      'seater',
                    )
                  }
                />

              </div>

              {/* DEPARTURE */}

              <div className="search-filter-section">

                <h3>
                  Departure Time
                </h3>

                <TimeFilter
                  active={
                    filters.before6
                  }
                  label="Before 6 AM"
                  subLabel="Early morning"
                  onClick={() =>
                    toggleFilter(
                      'before6',
                    )
                  }
                />

                <TimeFilter
                  active={
                    filters.morning
                  }
                  label="6 AM – 12 PM"
                  subLabel="Morning"
                  onClick={() =>
                    toggleFilter(
                      'morning',
                    )
                  }
                />

                <TimeFilter
                  active={
                    filters.afternoon
                  }
                  label="12 PM – 6 PM"
                  subLabel="Afternoon"
                  onClick={() =>
                    toggleFilter(
                      'afternoon',
                    )
                  }
                />

                <TimeFilter
                  active={
                    filters.evening
                  }
                  label="After 6 PM"
                  subLabel="Evening"
                  onClick={() =>
                    toggleFilter(
                      'evening',
                    )
                  }
                />

              </div>

              {/* RATING & PRICE */}
              <div className="search-filter-section search-filter-advanced">
                <h3>Rating & Price</h3>
                <label className="search-advanced-label">Minimum rating
                  <select value={minRating} onChange={(e)=>setMinRating(Number(e.target.value))}>
                    <option value={0}>Any rating</option>
                    <option value={4.5}>4.5+ Excellent</option>
                    <option value={4}>4.0+ Very good</option>
                    <option value={3.5}>3.5+ Good</option>
                  </select>
                </label>
                <label className="search-advanced-label">Maximum fare
                  <select value={maxPrice} onChange={(e)=>setMaxPrice(Number(e.target.value))}>
                    <option value={0}>Any price</option>
                    <option value={500}>Up to ₹500</option>
                    <option value={750}>Up to ₹750</option>
                    <option value={1000}>Up to ₹1,000</option>
                    <option value={1500}>Up to ₹1,500</option>
                    <option value={2500}>Up to ₹2,500</option>
                  </select>
                </label>
              </div>

              {/* BOARDING / DROPPING */}
              <div className="search-filter-section search-filter-advanced">
                <h3>Boarding & Dropping</h3>
                <label className="search-advanced-label">Boarding point
                  <input value={boardingQuery} onChange={(e)=>setBoardingQuery(e.target.value)} placeholder="e.g. Wakad, Airport" />
                </label>
                <label className="search-advanced-label">Dropping point
                  <input value={droppingQuery} onChange={(e)=>setDroppingQuery(e.target.value)} placeholder="e.g. Andheri, Borivali" />
                </label>
              </div>

              {/* AMENITIES */}

              <div className="search-filter-section">

                <h3>
                  Amenities
                </h3>

                <FilterCheckbox
                  label="Wi-Fi"
                  checked={
                    filters.wifi
                  }
                  onChange={() =>
                    toggleFilter(
                      'wifi',
                    )
                  }
                />

                <FilterCheckbox
                  label="Charging Point"
                  checked={
                    filters.charging
                  }
                  onChange={() =>
                    toggleFilter(
                      'charging',
                    )
                  }
                />

                <FilterCheckbox
                  label="Live Tracking"
                  checked={
                    filters.gps
                  }
                  onChange={() =>
                    toggleFilter(
                      'gps',
                    )
                  }
                />

                <FilterCheckbox
                  label="TV / Entertainment"
                  checked={
                    filters.tv
                  }
                  onChange={() =>
                    toggleFilter(
                      'tv',
                    )
                  }
                />

              </div>

            </aside>

            {/* ============================================
                RIGHT
            ============================================= */}

            <section className="search-results-content">

              {/* OFFERS */}

              <div className="search-offers">

                <div className="search-offer-card pink">

                  <div className="offer-icon">
                    %
                  </div>

                  <div>

                    <strong>
                      Free Cancellation
                    </strong>

                    <span>
                      Easy cancellation
                      on selected buses
                    </span>

                  </div>

                </div>

                <div className="search-offer-card orange">

                  <IonIcon
                    icon={
                      flashOutline
                    }
                  />

                  <div>

                    <strong>
                      Early Booking
                    </strong>

                    <span>
                      Book early for
                      better prices
                    </span>

                  </div>

                </div>

                <div className="search-offer-card blue">

                  <IonIcon
                    icon={
                      wifiOutline
                    }
                  />

                  <div>

                    <strong>
                      Live Amenities
                    </strong>

                    <span>
                      Find Wi-Fi and
                      tracking buses
                    </span>

                  </div>

                </div>

              </div>

              {/* SORT BAR */}

              <div className="search-sort-bar">

                <div>

                  <strong>
                    {
                      visibleTrips.length
                    }
                    {' '}
                    {visibleTrips.length ===
                    1
                      ? 'bus'
                      : 'buses'}
                    {' '}
                    found
                  </strong>

                  <span>
                    {from}
                    {' → '}
                    {to}
                    {' • '}
                    {
                      formatDate(
                        date,
                      )
                    }
                  </span>

                </div>

                <div className="search-sort-options">

                  <span>
                    Sort by:
                  </span>

                  <button
                    type="button"
                    className={
                      sort ===
                      'recommended'
                        ? 'active'
                        : ''
                    }
                    onClick={() =>
                      setSort(
                        'recommended',
                      )
                    }
                  >
                    Recommended
                  </button>

                  <button
                    type="button"
                    className={
                      sort ===
                      'departure'
                        ? 'active'
                        : ''
                    }
                    onClick={() =>
                      setSort(
                        'departure',
                      )
                    }
                  >
                    Departure
                  </button>

                  <button
                    type="button"
                    className={
                      sort ===
                      'duration'
                        ? 'active'
                        : ''
                    }
                    onClick={() =>
                      setSort(
                        'duration',
                      )
                    }
                  >
                    Duration
                  </button>

                  <button
                    type="button"
                    className={
                      sort ===
                      'price'
                        ? 'active'
                        : ''
                    }
                    onClick={() =>
                      setSort(
                        'price',
                      )
                    }
                  >
                    Price
                  </button>

                </div>

              </div>

              {/* ERROR */}

              {error && (
                <div className="customer-search-error">
                  {error}
                </div>
              )}

              {/* LOADING */}

              {loading ? (
                <div className="customer-search-loading">

                  <div className="customer-search-spinner" />

                  <p>
                    Finding the best buses...
                  </p>

                </div>
              ) : visibleTrips.length ===
                0 ? (
                <div className="no-search-results">

                  <div className="no-result-icon">

                    <IonIcon
                      icon={
                        busOutline
                      }
                    />

                  </div>

                  <h2>
                    No buses found
                  </h2>

                  <p>
                    Try another date
                    or remove some filters.
                  </p>

                  <button
                    type="button"
                    onClick={
                      clearFilters
                    }
                  >
                    Clear Filters
                  </button>

                </div>
              ) : (
                <div className="customer-bus-list">

                  {visibleTrips.map(
                    (
                      trip,
                    ) => {
                      const duration =
                        durationInMinutes(
                          trip.departure_at,
                          trip.arrival_at,
                        );

                      const operatorName =
                        trip.operator_name ||
                        trip.display_name ||
                        trip.operator ||
                        'Bus Operator';

                      const busName =
                        trip.bus_name ||
                        trip.bus ||
                        operatorName;

                      const amenities =
                        (
                          trip.amenities ||
                          []
                        ).slice(
                          0,
                          5,
                        );

                      return (
                        <article
                          key={
                            trip.id
                          }
                          className="customer-bus-card"
                        >

                          {/* CARD TOP */}

                          <div className="customer-bus-card-main">

                            {/* BUS */}

                            <div className="customer-bus-info">

                              <div className="customer-bus-logo">

                                <IonIcon
                                  icon={
                                    busOutline
                                  }
                                />

                              </div>

                              <div>

                                <h2>
                                  {
                                    operatorName
                                  }
                                </h2>

                                <strong>
                                  {
                                    busName
                                  }
                                </strong>

                                <span>
                                  {
                                    formatBusType(
                                      trip.bus_type,
                                    )
                                  }
                                </span>

                                {trip.service_number && (
                                  <small>
                                    Service
                                    {' '}
                                    {
                                      trip.service_number
                                    }
                                  </small>
                                )}

                              </div>

                            </div>

                            {/* JOURNEY */}

                            <div className="customer-journey">

                              <div className="journey-time start">

                                <strong>
                                  {
                                    formatTime(
                                      trip.departure_at,
                                    )
                                  }
                                </strong>

                                <span>
                                  {from}
                                </span>

                              </div>

                              <div className="journey-duration">

                                <span>
                                  {
                                    formatDuration(
                                      duration,
                                    )
                                  }
                                </span>

                                <div className="journey-line">

                                  <i />

                                  <b />

                                  <i />

                                </div>

                                <small>
                                  Direct
                                </small>

                              </div>

                              <div className="journey-time end">

                                <strong>
                                  {
                                    formatTime(
                                      trip.arrival_at,
                                    )
                                  }
                                </strong>

                                <span>
                                  {to}
                                </span>

                              </div>

                            </div>

                            {/* PRICE */}

                            <div className="customer-bus-price">

                              <span>
                                Starts from
                              </span>

                              <strong>
                                {
                                  formatCurrency(
                                    trip.starting_fare,
                                  )
                                }
                              </strong>

                              <small>
                                onwards
                              </small>

                              {!!trip.dynamic_adjustment && (
                                <span className="dynamic-fare-badge" title={(trip.pricing_rules_applied || []).map(rule => rule.name).join(', ')}>
                                  Live fare
                                </span>
                              )}

                              <button
                                type="button"
                                onClick={() =>
                                  history.push(
                                    `/trip/${trip.id}/seats`,
                                  )
                                }
                              >
                                View Seats
                              </button>

                            </div>

                          </div>

                          {/* AMENITIES */}

                          <div className="customer-bus-card-bottom">

                            <div className="customer-bus-amenities">

                              {amenities.length >
                                0 ? (
                                amenities.map(
                                  (
                                    amenity,
                                  ) => (
                                    <span
                                      key={
                                        amenity
                                      }
                                    >
                                      {
                                        formatAmenity(
                                          amenity,
                                        )
                                      }
                                    </span>
                                  ),
                                )
                              ) : (
                                <span>
                                  Standard Amenities
                                </span>
                              )}

                            </div>

                            <div className="customer-seat-availability">

                              <span className="availability-dot" />

                              <strong>
                                {
                                  trip.available_seats
                                }
                              </strong>

                              <span>
                                seats available
                              </span>

                            </div>

                          </div>

                        </article>
                      );
                    },
                  )}

                </div>
              )}

            </section>

          </main>

        </div>

      </IonContent>

    </IonPage>
  );
}
