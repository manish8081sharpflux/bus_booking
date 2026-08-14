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
  calendarOutline,
  checkmarkCircleOutline,
  chevronDownOutline,
  chevronUpOutline,
  locationOutline,
  pricetagOutline,
  refreshOutline,
  timeOutline,
  walletOutline,
} from 'ionicons/icons';

import {
  useHistory,
  useLocation,
} from 'react-router-dom';

import './TripInventoryPage.css';
import './CreateTripPage.css';

/* =========================================================
   API
========================================================= */

const API =
  import.meta.env.VITE_OPERATOR_API_URL ||
  'http://localhost:4000/api';

/* =========================================================
   TYPES
========================================================= */

type TripStatus =
  | 'DRAFT'
  | 'SCHEDULED'
  | 'PUBLISHED'
  | 'CANCELLED'
  | 'COMPLETED';

interface Trip {
  id: string;

  service_number: string;

  bus_name: string;

  registration_number?: string;

  source_city: string;

  destination_city: string;

  departure_at: string;

  arrival_at?: string;

  status: TripStatus | string;

  total_seats: number;

  available_seats: number;

  base_fare?: number | string | null;
}

type SeatStatus =
  | 'AVAILABLE'
  | 'HELD'
  | 'BOOKED'
  | 'BLOCKED';

interface Seat {
  id: string;

  seat_number: string;

  seat_type: string;

  deck: number | string;

  row_number?: number;

  column_number?: number;

  status: SeatStatus;

  booked_gender?: 'MALE' | 'FEMALE' | 'OTHER' | null;
}

interface InventorySummary {
  available: number;

  held: number;

  booked: number;

  blocked: number;

  total: number;
}

/* =========================================================
   OPERATOR
========================================================= */

const getOperatorId = () => {
  try {
    const raw =
      localStorage.getItem(
        'operator_profile',
      ) ||
      localStorage.getItem(
        'operator',
      );

    if (!raw) {
      return '';
    }

    const value =
      JSON.parse(raw);

    return (
      value.id ||
      value.operatorId ||
      value.operator_id ||
      ''
    );
  } catch {
    return '';
  }
};

/* =========================================================
   TOKEN
========================================================= */

const getToken = () =>
  localStorage.getItem(
    'operator_access_token',
  ) || '';

/* =========================================================
   REQUEST
========================================================= */

const request = async <T,>(
  path: string,
  options?: RequestInit,
): Promise<T> => {
  const headers =
    new Headers(
      options?.headers,
    );

  const token =
    getToken();

  if (
    token &&
    !headers.has(
      'Authorization',
    )
  ) {
    headers.set(
      'Authorization',
      `Bearer ${token}`,
    );
  }

  const response =
    await fetch(
      `${API}${path}`,
      {
        ...options,
        headers,
      },
    );

  const text =
    await response.text();

  let body: any = null;

  try {
    body =
      text
        ? JSON.parse(text)
        : {};
  } catch {
    throw new Error(
      `Inventory service returned ${response.status}. Please check that the trip/booking service is running.`,
    );
  }

  if (
    !response.ok ||
    body?.success === false
  ) {
    throw new Error(
      body?.message ||
        'Request failed.',
    );
  }

  return (
    body?.data ??
    body
  ) as T;
};

/* =========================================================
   FORMATTERS
========================================================= */

const formatDateTime = (
  value?: string,
) => {
  if (!value) {
    return '-';
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

  return date.toLocaleString(
    'en-IN',
    {
      day: '2-digit',
      month: 'short',
      year: 'numeric',

      hour: '2-digit',
      minute: '2-digit',
    },
  );
};

const formatCurrency = (
  value:
    | number
    | string
    | null
    | undefined,
) => {
  const amount =
    Number(value);

  if (
    !Number.isFinite(
      amount,
    )
  ) {
    return 'Not set';
  }

  return new Intl.NumberFormat(
    'en-IN',
    {
      style: 'currency',

      currency: 'INR',

      maximumFractionDigits: 2,
    },
  ).format(amount);
};

/* =========================================================
   STATUS
========================================================= */

const statusClass = (
  status: string,
) => {
  return `trip-status trip-status-${status.toLowerCase()}`;
};

/* =========================================================
   SUMMARY
========================================================= */

const getInventorySummary = (
  seats: Seat[],
): InventorySummary => {
  return seats.reduce(
    (
      summary,
      seat,
    ) => {
      summary.total += 1;

      if (
        seat.status ===
        'AVAILABLE'
      ) {
        summary.available += 1;
      }

      if (
        seat.status ===
        'HELD'
      ) {
        summary.held += 1;
      }

      if (
        seat.status ===
        'BOOKED'
      ) {
        summary.booked += 1;
      }

      if (
        seat.status ===
        'BLOCKED'
      ) {
        summary.blocked += 1;
      }

      return summary;
    },
    {
      available: 0,

      held: 0,

      booked: 0,

      blocked: 0,

      total: 0,
    },
  );
};

/* =========================================================
   SORT SEATS
========================================================= */

const sortSeats = (
  seats: Seat[],
) => {
  return [
    ...seats,
  ].sort(
    (
      first,
      second,
    ) => {
      const firstRow =
        first.row_number ??
        0;

      const secondRow =
        second.row_number ??
        0;

      if (
        firstRow !==
        secondRow
      ) {
        return (
          firstRow -
          secondRow
        );
      }

      const firstColumn =
        first.column_number ??
        0;

      const secondColumn =
        second.column_number ??
        0;

      if (
        firstColumn !==
        secondColumn
      ) {
        return (
          firstColumn -
          secondColumn
        );
      }

      return (
        Number(
          first.seat_number,
        ) -
        Number(
          second.seat_number,
        )
      );
    },
  );
};

/* =========================================================
   SEAT COMPONENT
========================================================= */

const InventorySeat = ({
  seat,
}: {
  seat: Seat;
}) => {
  const sleeper =
    seat.seat_type
      ?.toUpperCase()
      .includes(
        'SLEEPER',
      );

  const classes = [
    'inventory-seat',

    sleeper
      ? 'inventory-sleeper'
      : 'inventory-seater',

    `inventory-seat-${seat.status.toLowerCase()}`,

    seat.status === 'BOOKED' && seat.booked_gender
      ? `inventory-booked-${seat.booked_gender.toLowerCase()}`
      : '',
  ].join(' ');

  return (
    <div
      className={
        classes
      }
      title={
        `${seat.seat_number} • ${seat.status}`
      }
    >
      {seat.status === 'BOOKED' && ['MALE', 'FEMALE'].includes(seat.booked_gender || '') && (
        <span className="inventory-passenger-gender-icon" aria-label={`${seat.booked_gender === 'FEMALE' ? 'Female' : 'Male'} passenger`}>
          {seat.booked_gender === 'FEMALE' ? '👩🏻‍🦰' : '👨🏻‍🦱'}
        </span>
      )}

      {sleeper ? (
        <>
          <span className="inventory-sleeper-pillow" />

          <strong>
            {seat.seat_number}
          </strong>

          <span className="inventory-sleeper-line" />
        </>
      ) : (
        <>
          <span className="inventory-seat-head" />

          <span className="inventory-seat-back" />

          <strong>
            {seat.seat_number}
          </strong>

          <span className="inventory-seat-base" />

          <span className="inventory-seat-arm left" />

          <span className="inventory-seat-arm right" />
        </>
      )}
    </div>
  );
};

/* =========================================================
   DRIVER
========================================================= */

const DriverArea = () => {
  return (
    <div className="inventory-driver-area">
      <div className="inventory-driver">

        <div className="inventory-steering-wheel">

          <span className="steering-center" />

          <span className="steering-spoke steering-left" />

          <span className="steering-spoke steering-right" />

          <span className="steering-spoke steering-bottom" />

        </div>

        <div className="inventory-driver-seat">

          <span className="driver-seat-head" />

          <span className="driver-seat-back" />

          <span className="driver-seat-base" />

        </div>

        <span className="inventory-driver-label">
          Driver
        </span>

      </div>
    </div>
  );
};

/* =========================================================
   2X2 SEAT LAYOUT
========================================================= */

const SeatGrid2X2 = ({
  seats,
}: {
  seats: Seat[];
}) => {
  const sortedSeats =
    sortSeats(seats);

  return (
    <div className="inventory-seat-grid-2x2">

      {sortedSeats.map(
        (
          seat,
          index,
        ) => {
          const position =
            index % 4;

          let columnClass =
            '';

          if (
            position === 0
          ) {
            columnClass =
              'seat-column-1';
          }

          if (
            position === 1
          ) {
            columnClass =
              'seat-column-2';
          }

          if (
            position === 2
          ) {
            columnClass =
              'seat-column-4';
          }

          if (
            position === 3
          ) {
            columnClass =
              'seat-column-5';
          }

          return (
            <div
              key={
                seat.id
              }
              className={
                `inventory-seat-slot ${columnClass}`
              }
            >
              <InventorySeat
                seat={
                  seat
                }
              />
            </div>
          );
        },
      )}

    </div>
  );
};

/* =========================================================
   GENERIC LAYOUT
========================================================= */

const GenericSeatGrid = ({
  seats,
}: {
  seats: Seat[];
}) => {
  const sortedSeats =
    sortSeats(seats);

  return (
    <div className="inventory-seat-grid-generic">

      {sortedSeats.map(
        (
          seat,
        ) => (
          <InventorySeat
            key={
              seat.id
            }
            seat={
              seat
            }
          />
        ),
      )}

    </div>
  );
};

/* =========================================================
   DECK COMPONENT
========================================================= */

const InventoryDeck = ({
  seats,
  title,
  showDriver,
}: {
  seats: Seat[];

  title: string;

  showDriver: boolean;
}) => {
  if (
    seats.length === 0
  ) {
    return null;
  }

  const sortedSeats =
    sortSeats(seats);

  /*
   * For now:
   *
   * If row/column are present and there
   * are 4 seats per row, use the 2×2
   * layout.
   *
   * For old data, 12 seats will also
   * use 2×2 fallback.
   */

  const hasCoordinates =
    sortedSeats.some(
      (
        seat,
      ) =>
        seat.row_number !==
          undefined &&
        seat.column_number !==
          undefined,
    );

  const columns =
    new Set(
      sortedSeats
        .map(
          (
            seat,
          ) =>
            seat.column_number,
        )
        .filter(
          (
            value,
          ) =>
            value !==
            undefined,
        ),
    );

  const use2X2 =
    columns.size === 4 ||
    (
      !hasCoordinates &&
      sortedSeats.length %
        4 ===
        0
    );

  return (
    <div className="inventory-deck">

      <div className="inventory-deck-header">

        <div>
          <span>
            DECK
          </span>

          <strong>
            {title}
          </strong>
        </div>

        <div className="inventory-deck-seat-count">
          {
            seats.length
          }
          {' '}
          seats
        </div>

      </div>

      <div className="inventory-bus-layout">

        {showDriver && (
          <DriverArea />
        )}

        <div className="inventory-passenger-area">

          {use2X2 ? (
            <SeatGrid2X2
              seats={
                sortedSeats
              }
            />
          ) : (
            <GenericSeatGrid
              seats={
                sortedSeats
              }
            />
          )}

        </div>

        <div className="inventory-bus-rear">

          <span />

          <span />

        </div>

      </div>

    </div>
  );
};

/* =========================================================
   INVENTORY PANEL
========================================================= */

const InventoryPanel = ({
  seats,
}: {
  seats: Seat[];
}) => {
  const summary =
    useMemo(
      () =>
        getInventorySummary(
          seats,
        ),
      [
        seats,
      ],
    );

  const lowerDeck =
    seats.filter(
      (
        seat,
      ) =>
        String(
          seat.deck,
        ).toUpperCase() ===
          'LOWER' ||
        Number(
          seat.deck,
        ) === 1,
    );

  const upperDeck =
    seats.filter(
      (
        seat,
      ) =>
        String(
          seat.deck,
        ).toUpperCase() ===
          'UPPER' ||
        Number(
          seat.deck,
        ) === 2,
    );

  const knownDeck =
    lowerDeck.length >
      0 ||
    upperDeck.length >
      0;

  return (
    <div className="inventory-expanded">

      {/* SUMMARY */}

      <div className="inventory-summary">

        <div className="inventory-summary-item available">

          <span className="summary-dot" />

          <div>
            <strong>
              {
                summary.available
              }
            </strong>

            <small>
              Available
            </small>
          </div>

        </div>

        <div className="inventory-summary-item held">

          <span className="summary-dot" />

          <div>
            <strong>
              {
                summary.held
              }
            </strong>

            <small>
              Held
            </small>
          </div>

        </div>

        <div className="inventory-summary-item booked">

          <span className="summary-dot" />

          <div>
            <strong>
              {
                summary.booked
              }
            </strong>

            <small>
              Booked
            </small>
          </div>

        </div>

        <div className="inventory-summary-item blocked">

          <span className="summary-dot" />

          <div>
            <strong>
              {
                summary.blocked
              }
            </strong>

            <small>
              Blocked
            </small>
          </div>

        </div>

      </div>

      {/* DECKS */}

      <div className="inventory-decks">

        {knownDeck ? (
          <>
            <InventoryDeck
              seats={
                lowerDeck
              }
              title="Lower Deck"
              showDriver
            />

            <InventoryDeck
              seats={
                upperDeck
              }
              title="Upper Deck"
              showDriver={
                false
              }
            />
          </>
        ) : (
          <InventoryDeck
            seats={
              seats
            }
            title="Seat Layout"
            showDriver
          />
        )}

      </div>

      {/* LEGEND */}

      <div className="inventory-legend">

        <div>
          <span className="legend-dot available" />
          Available
        </div>

        <div>
          <span className="legend-dot held" />
          Held
        </div>

        <div>
          <span className="legend-dot booked" />
          Booked
        </div>

        <div>
          <span className="legend-dot blocked" />
          Blocked
        </div>

      </div>

    </div>
  );
};

/* =========================================================
   PAGE
========================================================= */

export default function TripInventoryPage() {
  const history =
    useHistory();

  const location =
    useLocation();

  const isPublishStep =
    location.pathname ===
    '/operator/trips/publish';

  const operatorId =
    getOperatorId();

  const selectedTripId =
    useMemo(
      () =>
        new URLSearchParams(
          location.search,
        ).get(
          'tripId',
        ) || '',
      [
        location.search,
      ],
    );

  const [
    trips,
    setTrips,
  ] =
    useState<Trip[]>(
      [],
    );

  const [
    seats,
    setSeats,
  ] =
    useState<
      Record<
        string,
        Seat[]
      >
    >(
      {},
    );

  const [
    openTripId,
    setOpenTripId,
  ] =
    useState('');

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    inventoryLoading,
    setInventoryLoading,
  ] =
    useState('');

  const [
    publishing,
    setPublishing,
  ] =
    useState('');

  const [
    message,
    setMessage,
  ] =
    useState('');

  const [
    error,
    setError,
  ] =
    useState('');

  /* =======================================================
     ORDER TRIPS
  ======================================================= */

  const orderedTrips =
    useMemo(
      () => {
        return selectedTripId
          ? trips.filter((trip) => trip.id === selectedTripId)
          : trips;
      },
      [
        trips,
        selectedTripId,
      ],
    );

  /* =======================================================
     LOAD TRIPS
  ======================================================= */

  const loadTrips =
    async (
      showLoading =
        false,
    ) => {
      if (
        !operatorId
      ) {
        setError(
          'Operator account could not be identified.',
        );

        setLoading(false);

        return;
      }

      try {
        if (
          showLoading
        ) {
          setLoading(true);
        }

        setError('');

        const data =
          await request<
            Trip[]
          >(
            `/trips?operatorId=${encodeURIComponent(
              operatorId,
            )}`,
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
            : 'Unable to load trips.',
        );
      } finally {
        setLoading(false);
      }
    };

  useEffect(
    () => {
      void loadTrips(true);
    },
    [
      operatorId,
    ],
  );

  /* =======================================================
     LOAD INVENTORY
  ======================================================= */

  const loadInventory =
    async (
      tripId: string,
    ) => {
      try {
        setInventoryLoading(
          tripId,
        );

        setError('');

        const data =
          await request<
            Seat[]
          >(
            `/trips/${tripId}/inventory?operatorId=${encodeURIComponent(
              operatorId,
            )}`,
          );

        const result =
          Array.isArray(
            data,
          )
            ? data
            : [];

        setSeats(
          (
            previous,
          ) => ({
            ...previous,

            [tripId]:
              result,
          }),
        );

        return result;
      } catch (
        requestError
      ) {
        setError(
          requestError instanceof
            Error
            ? requestError.message
            : 'Unable to load seat inventory.',
        );

        return null;
      } finally {
        setInventoryLoading('');
      }
    };

  /* =======================================================
     OPEN SELECTED TRIP
  ======================================================= */

  useEffect(
    () => {
      if (
        !selectedTripId ||
        trips.length ===
          0
      ) {
        return;
      }

      const exists =
        trips.some(
          (
            trip,
          ) =>
            trip.id ===
            selectedTripId,
        );

      if (
        exists &&
        !openTripId
      ) {
        setOpenTripId(
          selectedTripId,
        );

        if (
          !seats[
            selectedTripId
          ]
        ) {
          void loadInventory(
            selectedTripId,
          );
        }
      }
    },
    [
      selectedTripId,
      trips,
    ],
  );

  /* =======================================================
     TOGGLE
  ======================================================= */

  const toggleInventory =
    async (
      tripId:
        string,
    ) => {
      if (
        openTripId ===
        tripId
      ) {
        setOpenTripId('');

        return;
      }

      setOpenTripId(
        tripId,
      );

      if (
        !seats[
          tripId
        ]
      ) {
        await loadInventory(
          tripId,
        );
      }
    };

  /* =======================================================
     PUBLISH
  ======================================================= */

  const publishTrip =
    async (
      trip: Trip,
    ) => {
      if (
        trip.status ===
          'PUBLISHED' ||
        trip.status ===
          'SCHEDULED'
      ) {
        setError(
          'This trip is already published.',
        );

        return;
      }

      if (
        Number(
          trip.base_fare,
        ) <= 0
      ) {
        setError(
          'Please set a valid fare before publishing.',
        );

        return;
      }

      let tripSeats =
        seats[
          trip.id
        ];

      if (
        !tripSeats
      ) {
        const loaded =
          await loadInventory(
            trip.id,
          );

        if (!loaded) {
          return;
        }

        tripSeats =
          loaded;
      }

      if (
        tripSeats.length ===
        0
      ) {
        setError(
          'Seat inventory is empty. Generate inventory before publishing.',
        );

        return;
      }

      const available =
        tripSeats.filter(
          (
            seat,
          ) =>
            seat.status ===
            'AVAILABLE',
        ).length;

      if (
        available === 0
      ) {
        setError(
          'At least one seat must be available before publishing.',
        );

        return;
      }

      const confirmed =
        window.confirm(
          `Publish ${trip.service_number}: ${trip.source_city} → ${trip.destination_city}?`,
        );

      if (!confirmed) {
        return;
      }

      try {
        setPublishing(
          trip.id,
        );

        setError('');
        setMessage('');

        await request(
          `/trips/${trip.id}/publish`,
          {
            method: 'PATCH',

            headers: {
              'Content-Type':
                'application/json',
            },

            body:
              JSON.stringify({
                operatorId,
              }),
          },
        );

        setMessage(
          `Service ${trip.service_number} published successfully. Customers can now search and book it.`,
        );

        await loadTrips();
      } catch (
        requestError
      ) {
        setError(
          requestError instanceof
            Error
            ? requestError.message
            : 'Unable to publish trip.',
        );
      } finally {
        setPublishing('');
      }
    };

  /* =======================================================
     MISSING OPERATOR
  ======================================================= */

  if (
    !operatorId
  ) {
    return (
      <IonPage>

        <IonContent fullscreen>

          <div className="trip-inventory-page">

            <div className="inventory-empty-state">

              <IonIcon
                icon={
                  busOutline
                }
              />

              <h2>
                Operator not found
              </h2>

              <p>
                Please log in again.
              </p>

              <button
                type="button"
                className="inventory-primary-button"
                onClick={() =>
                  history.push(
                    '/operator',
                  )
                }
              >
                Operator Login
              </button>

            </div>

          </div>

        </IonContent>

      </IonPage>
    );
  }

  /* =======================================================
     UI
  ======================================================= */

  return (
    <IonPage>

      <IonContent fullscreen>

        <div className="trip-inventory-page">

          <div className="trip-inventory-container">

            {/* HEADER */}

            <div className="inventory-page-header">

              <button
                type="button"
                className="inventory-back-button"
                onClick={() =>
                  history.push(
                    '/operator/dashboard',
                  )
                }
              >
                <IonIcon
                  icon={
                    arrowBackOutline
                  }
                />
              </button>

              <div className="inventory-page-heading">

                <span className="inventory-eyebrow">
                  Trip Management
                </span>

                <h1>
                  Trips & Seat Inventory
                </h1>

                <p>
                  Review trip details, fares and
                  seat inventory before publishing.
                </p>

              </div>

              <button
                type="button"
                className="inventory-refresh-button"
                disabled={
                  loading
                }
                onClick={() =>
                  void loadTrips(
                    true,
                  )
                }
              >

                <IonIcon
                  icon={
                    refreshOutline
                  }
                />

                Refresh

              </button>

            </div>

            <div className="trip-workflow inventory-workflow">
              <div className="trip-workflow-step completed">
                <span>1</span>
                <div><strong>Route</strong><small>Create or select</small></div>
              </div>
              <div className="trip-workflow-line" />
              <div className="trip-workflow-step completed">
                <span>2</span>
                <div><strong>Trip</strong><small>Schedule service</small></div>
              </div>
              <div className="trip-workflow-line" />
              <div className={`trip-workflow-step ${isPublishStep ? 'completed' : 'active'}`}>
                <span>3</span>
                <div><strong>Inventory</strong><small>Review seats</small></div>
              </div>
              <div className="trip-workflow-line" />
              <div className={`trip-workflow-step ${isPublishStep ? 'active' : ''}`}>
                <span>4</span>
                <div><strong>Publish</strong><small>Go live</small></div>
              </div>
            </div>

            {isPublishStep && (
              <div className="inventory-publish-purpose">
                <IonIcon icon={checkmarkCircleOutline} />
                <div>
                  <strong>Step 4: Publish and go live</strong>
                  <p>
                    Publishing makes this service visible in customer search and allows customers to select seats and book tickets. Review the route, schedule, fare and available inventory below before going live.
                  </p>
                </div>
              </div>
            )}

            {/* SUCCESS */}

            {message && (
              <div className="inventory-success-message">

                <IonIcon
                  icon={
                    checkmarkCircleOutline
                  }
                />

                {message}

              </div>
            )}

            {/* ERROR */}

            {error && (
              <div className="inventory-error-message">
                {error}
              </div>
            )}

            {/* LOADING */}

            {loading ? (
              <div className="inventory-loading">

                <div className="inventory-spinner" />

                <span>
                  Loading trips...
                </span>

              </div>
            ) : orderedTrips.length ===
              0 ? (
              <div className="inventory-empty-state">

                <IonIcon
                  icon={
                    busOutline
                  }
                />

                <h2>
                  No trips created yet
                </h2>

                <p>
                  Create a trip from an
                  active bus first.
                </p>

              </div>
            ) : (
              <div className="trip-list">

                {orderedTrips.map(
                  (
                    trip,
                  ) => {
                    const isSelected =
                      trip.id ===
                      selectedTripId;

                    const isOpen =
                      openTripId ===
                      trip.id;

                    const tripSeats =
                      seats[
                        trip.id
                      ] || [];

                    return (
                      <section
                        key={
                          trip.id
                        }
                        className={[
                          'inventory-trip-card',

                          isSelected
                            ? 'selected-trip'
                            : '',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                      >

                        {isSelected && (
                          <div className="inventory-current-trip-label">
                            Newly Created Trip
                          </div>
                        )}

                        <div className="inventory-trip-main">

                          {/* ROUTE */}

                          <div className="inventory-trip-route">

                            <div className="inventory-route-icon">

                              <IonIcon
                                icon={
                                  busOutline
                                }
                              />

                            </div>

                            <div>

                              <div className="inventory-trip-title">

                                <strong>
                                  {
                                    trip.service_number
                                  }
                                </strong>

                                <span>
                                  {
                                    trip.source_city
                                  }
                                  {' → '}
                                  {
                                    trip.destination_city
                                  }
                                </span>

                              </div>

                              <div className="inventory-trip-meta">

                                <span>

                                  <IonIcon
                                    icon={
                                      busOutline
                                    }
                                  />

                                  {
                                    trip.bus_name
                                  }

                                </span>

                                <span>

                                  <IonIcon
                                    icon={
                                      calendarOutline
                                    }
                                  />

                                  {
                                    formatDateTime(
                                      trip.departure_at,
                                    )
                                  }

                                </span>

                              </div>

                            </div>

                          </div>

                          {/* STATS */}

                          <div className="inventory-trip-stats">

                            <div>

                              <span>
                                Seats
                              </span>

                              <strong>
                                {
                                  trip.available_seats
                                }
                                /
                                {
                                  trip.total_seats
                                }
                              </strong>

                            </div>

                            <div>

                              <span>
                                Base Fare
                              </span>

                              <strong>
                                {
                                  formatCurrency(
                                    trip.base_fare,
                                  )
                                }
                              </strong>

                            </div>

                            <div>

                              <span>
                                Status
                              </span>

                              <strong
                                className={
                                  statusClass(
                                    trip.status,
                                  )
                                }
                              >
                                {
                                  trip.status
                                }
                              </strong>

                            </div>

                          </div>

                          {/* ACTIONS */}

                          <div className="inventory-trip-actions">

                            <button
                              type="button"
                              className="inventory-secondary-button"
                              onClick={() =>
                                history.push(
                                  `/operator/trips/${trip.id}/fares`,
                                )
                              }
                            >

                              <IonIcon
                                icon={
                                  walletOutline
                                }
                              />

                              Set Fares

                            </button>

                            <button
                              type="button"
                              className="inventory-outline-button"
                              disabled={
                                inventoryLoading ===
                                trip.id
                              }
                              onClick={() =>
                                void toggleInventory(
                                  trip.id,
                                )
                              }
                            >

                              {isOpen
                                ? 'Hide Seats'
                                : 'View Seats'}

                              <IonIcon
                                icon={
                                  isOpen
                                    ? chevronUpOutline
                                    : chevronDownOutline
                                }
                              />

                            </button>

                            {trip.status !==
                              'PUBLISHED' &&
                              trip.status !==
                                'SCHEDULED' && (
                              <button
                                type="button"
                                className="inventory-primary-button"
                                disabled={
                                  isPublishStep && publishing ===
                                  trip.id
                                }
                                onClick={() =>
                                  isPublishStep
                                    ? void publishTrip(trip)
                                    : history.push(
                                        `/operator/trips/publish?tripId=${encodeURIComponent(trip.id)}`,
                                      )
                                }
                              >

                                <IonIcon
                                  icon={
                                    checkmarkCircleOutline
                                  }
                                />

                                {isPublishStep && publishing ===
                                trip.id
                                  ? 'Publishing...'
                                  : isPublishStep
                                    ? 'Publish & Go Live'
                                    : 'Continue to Publish'}

                              </button>
                            )}

                            {(trip.status === 'PUBLISHED' || trip.status === 'SCHEDULED') && (
                              <span className="inventory-live-badge">
                                <IonIcon icon={checkmarkCircleOutline} />
                                Live for customers
                              </span>
                            )}

                          </div>

                        </div>

                        {/* REVIEW STRIP */}

                        {isSelected && (
                          <div className="inventory-review-strip">

                            <div>

                              <IonIcon
                                icon={
                                  locationOutline
                                }
                              />

                              <span>
                                Route
                              </span>

                              <strong>
                                {
                                  trip.source_city
                                }
                                {' → '}
                                {
                                  trip.destination_city
                                }
                              </strong>

                            </div>

                            <div>

                              <IonIcon
                                icon={
                                  timeOutline
                                }
                              />

                              <span>
                                Departure
                              </span>

                              <strong>
                                {
                                  formatDateTime(
                                    trip.departure_at,
                                  )
                                }
                              </strong>

                            </div>

                            <div>

                              <IonIcon
                                icon={
                                  pricetagOutline
                                }
                              />

                              <span>
                                Fare
                              </span>

                              <strong>
                                {
                                  formatCurrency(
                                    trip.base_fare,
                                  )
                                }
                              </strong>

                            </div>

                          </div>
                        )}

                        {/* INVENTORY */}

                        {isOpen && (
                          <>
                            {inventoryLoading ===
                            trip.id ? (
                              <div className="inventory-inline-loading">

                                <div className="inventory-spinner small" />

                                Loading seat inventory...

                              </div>
                            ) : tripSeats.length ===
                              0 ? (
                              <div className="inventory-no-seats">
                                No seat inventory was generated.
                              </div>
                            ) : (
                              <InventoryPanel
                                seats={
                                  tripSeats
                                }
                              />
                            )}
                          </>
                        )}

                      </section>
                    );
                  },
                )}

              </div>
            )}

          </div>

        </div>

      </IonContent>

    </IonPage>
  );
}
