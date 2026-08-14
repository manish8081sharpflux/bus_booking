import {
  FormEvent,
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
  locationOutline,
  pricetagOutline,
  saveOutline,
  timeOutline,
  walletOutline,
} from 'ionicons/icons';

import {
  useHistory,
  useParams,
} from 'react-router-dom';

import './TripFaresPage.css';

/* =========================================================
   API
========================================================= */

const API =
  import.meta.env.VITE_OPERATOR_API_URL ||
  'http://localhost:4000/api';

/* =========================================================
   TYPES
========================================================= */

interface Fare {
  seat_type: string;
  fare: string | number;
}

interface SeatType {
  seat_type: string;
  seat_count: number;
}

interface Trip {
  id?: string;

  bus_name: string;

  service_number: string;

  source_city: string;

  destination_city: string;

  departure_at: string;

  arrival_at: string;

  seat_capacity: number;

  status: string;

  registration_number?: string;

  base_fare?: number | string | null;
}

interface FareResponse {
  trip: Trip;

  seatTypes: SeatType[];

  fares: Fare[];
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

const getToken = () => {
  return (
    localStorage.getItem(
      'operator_access_token',
    ) || ''
  );
};

/* =========================================================
   API REQUEST
========================================================= */

const api = async <T,>(
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
      `Server returned ${response.status}. Please confirm that the API gateway and trip service are running.`,
    );
  }

  if (
    !response.ok ||
    body?.success === false
  ) {
    const error =
      new Error(
        body?.message ||
          'Request failed.',
      ) as Error & {
        errors?: Record<
          string,
          string
        >;
      };

    error.errors =
      body?.errors;

    throw error;
  }

  return (
    body?.data ??
    body
  ) as T;
};

/* =========================================================
   FORMATTERS
========================================================= */

const formatDate = (
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

  return date.toLocaleTimeString(
    'en-IN',
    {
      hour: '2-digit',
      minute: '2-digit',
    },
  );
};

const formatSeatType = (
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
      (
        character,
      ) =>
        character.toUpperCase(),
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
    return '-';
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
   PAGE
========================================================= */

export default function TripFaresPage() {
  const {
    tripId,
  } =
    useParams<{
      tripId: string;
    }>();

  const history =
    useHistory();

  const operatorId =
    getOperatorId();

  const [
    trip,
    setTrip,
  ] =
    useState<
      Trip | null
    >(null);

  const [
    types,
    setTypes,
  ] =
    useState<
      SeatType[]
    >([]);

  const [
    values,
    setValues,
  ] =
    useState<
      Record<
        string,
        string
      >
    >({});

  const [
    originalValues,
    setOriginalValues,
  ] =
    useState<
      Record<
        string,
        string
      >
    >({});

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    saving,
    setSaving,
  ] =
    useState(false);

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

  const [
    errors,
    setErrors,
  ] =
    useState<
      Record<
        string,
        string
      >
    >({});

  /* =======================================================
     LOAD FARES
  ======================================================= */

  const loadFares =
    async () => {
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
        setLoading(true);

        setError('');
        setMessage('');

        const data =
          await api<
            FareResponse
          >(
            `/trips/${tripId}/fares?operatorId=${encodeURIComponent(
              operatorId,
            )}`,
          );

        setTrip(
          data.trip,
        );

        setTypes(
          Array.isArray(
            data.seatTypes,
          )
            ? data.seatTypes
            : [],
        );

        const current:
          Record<
            string,
            string
          > = {};

        (
          data.seatTypes ||
          []
        ).forEach(
          (
            seatType,
          ) => {
            const fare =
              (
                data.fares ||
                []
              ).find(
                (
                  item,
                ) =>
                  item.seat_type ===
                  seatType.seat_type,
              );

            current[
              seatType.seat_type
            ] =
              fare
                ? String(
                    fare.fare,
                  )
                : '';
          },
        );

        setValues(
          current,
        );

        setOriginalValues(
          current,
        );
      } catch (
        requestError
      ) {
        setError(
          requestError instanceof
            Error
            ? requestError.message
            : 'Unable to load trip fares.',
        );
      } finally {
        setLoading(false);
      }
    };

  useEffect(
    () => {
      void loadFares();
    },
    [
      tripId,
      operatorId,
    ],
  );

  /* =======================================================
     CHANGED?
  ======================================================= */

  const hasChanges =
    useMemo(
      () =>
        JSON.stringify(
          values,
        ) !==
        JSON.stringify(
          originalValues,
        ),
      [
        values,
        originalValues,
      ],
    );

  /* =======================================================
     TOTAL / LOWEST FARE
  ======================================================= */

  const lowestFare =
    useMemo(
      () => {
        const numbers =
          Object.values(
            values,
          )
            .map(
              Number,
            )
            .filter(
              (
                value,
              ) =>
                Number.isFinite(
                  value,
                ) &&
                value > 0,
            );

        if (
          numbers.length ===
          0
        ) {
          return null;
        }

        return Math.min(
          ...numbers,
        );
      },
      [
        values,
      ],
    );

  /* =======================================================
     UPDATE FARE
  ======================================================= */

  const updateFare = (
    seatType: string,
    value: string,
  ) => {
    setValues(
      (
        previous,
      ) => ({
        ...previous,

        [seatType]:
          value,
      }),
    );

    setErrors(
      (
        previous,
      ) => ({
        ...previous,

        [seatType]:
          '',
      }),
    );

    setMessage('');
    setError('');
  };

  /* =======================================================
     VALIDATE
  ======================================================= */

  const validate =
    () => {
      const localErrors:
        Record<
          string,
          string
        > = {};

      types.forEach(
        (
          seatType,
        ) => {
          const value =
            Number(
              values[
                seatType.seat_type
              ],
            );

          if (
            !Number.isFinite(
              value,
            ) ||
            value < 1 ||
            value > 100000
          ) {
            localErrors[
              seatType.seat_type
            ] =
              'Enter an amount from ₹1 to ₹100,000.';
          }
        },
      );

      setErrors(
        localErrors,
      );

      return (
        Object.keys(
          localErrors,
        ).length ===
        0
      );
    };

  /* =======================================================
     SAVE FARES
  ======================================================= */

  const save =
    async (
      event:
        FormEvent,
    ) => {
      event.preventDefault();

      if (
        !validate()
      ) {
        setError(
          'Please correct the fare values before saving.',
        );

        return;
      }

      try {
        setSaving(true);

        setMessage('');
        setError('');

        await api(
          `/trips/${tripId}/fares`,
          {
            method: 'PUT',

            headers: {
              'Content-Type':
                'application/json',
            },

            body:
              JSON.stringify({
                operatorId,

                fares:
                  types.map(
                    (
                      seatType,
                    ) => ({
                      seatType:
                        seatType.seat_type,

                      fare:
                        Number(
                          values[
                            seatType.seat_type
                          ],
                        ),
                    }),
                  ),
              }),
          },
        );

        setOriginalValues({
          ...values,
        });

        setMessage(
          'Fares saved successfully. You can now return to the trip review and publish the service.',
        );
      } catch (
        requestError
      ) {
        const typedError =
          requestError as Error & {
            errors?: Record<
              string,
              string
            >;
          };

        setError(
          typedError.message,
        );

        if (
          typedError.errors
        ) {
          setErrors(
            typedError.errors,
          );
        }
      } finally {
        setSaving(false);
      }
    };

  /* =======================================================
     BACK
  ======================================================= */

  const backToInventory =
    () => {
      history.push(
        `/operator/trips/inventory?tripId=${encodeURIComponent(
          tripId,
        )}`,
      );
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

          <div className="trip-fares-page">

            <div className="fare-empty-state">

              <IonIcon
                icon={
                  walletOutline
                }
              />

              <h2>
                Operator not found
              </h2>

              <p>
                Please log in again
                before configuring fares.
              </p>

              <button
                type="button"
                className="fare-primary-button"
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
     LOADING
  ======================================================= */

  if (
    loading
  ) {
    return (
      <IonPage>

        <IonContent fullscreen>

          <div className="trip-fares-page">

            <div className="fare-loading">

              <div className="fare-spinner" />

              <p>
                Loading fare configuration...
              </p>

            </div>

          </div>

        </IonContent>

      </IonPage>
    );
  }

  /* =======================================================
     ERROR WITHOUT TRIP
  ======================================================= */

  if (
    !trip
  ) {
    return (
      <IonPage>

        <IonContent fullscreen>

          <div className="trip-fares-page">

            <div className="fare-empty-state">

              <IonIcon
                icon={
                  walletOutline
                }
              />

              <h2>
                Trip not available
              </h2>

              <p>
                {error ||
                  'Unable to load this trip.'}
              </p>

              <button
                type="button"
                className="fare-primary-button"
                onClick={
                  backToInventory
                }
              >
                Back to Trips
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

        <div className="trip-fares-page">

          <div className="trip-fares-container">

            {/* HEADER */}

            <div className="fare-page-header">

              <button
                type="button"
                className="fare-back-button"
                disabled={
                  saving
                }
                onClick={
                  backToInventory
                }
              >
                <IonIcon
                  icon={
                    arrowBackOutline
                  }
                />
              </button>

              <div className="fare-page-heading">

                <span className="fare-eyebrow">
                  Trip Management
                </span>

                <h1>
                  Set Trip Fares
                </h1>

                <p>
                  Configure pricing by seat type
                  before publishing this service.
                </p>

              </div>

            </div>

            {/* WORKFLOW */}

            <div className="fare-workflow">

              <div className="fare-workflow-step complete">

                <span>
                  ✓
                </span>

                <div>
                  <strong>
                    Trip
                  </strong>

                  <small>
                    Created
                  </small>
                </div>

              </div>

              <div className="fare-workflow-line complete" />

              <div className="fare-workflow-step complete">

                <span>
                  ✓
                </span>

                <div>
                  <strong>
                    Inventory
                  </strong>

                  <small>
                    Generated
                  </small>
                </div>

              </div>

              <div className="fare-workflow-line active" />

              <div className="fare-workflow-step active">

                <span>
                  3
                </span>

                <div>
                  <strong>
                    Fares
                  </strong>

                  <small>
                    Configure
                  </small>
                </div>

              </div>

              <div className="fare-workflow-line" />

              <div className="fare-workflow-step">

                <span>
                  4
                </span>

                <div>
                  <strong>
                    Publish
                  </strong>

                  <small>
                    Go live
                  </small>
                </div>

              </div>

            </div>

            {/* SUCCESS */}

            {message && (
              <div className="fare-success-message">

                <IonIcon
                  icon={
                    checkmarkCircleOutline
                  }
                />

                <div>

                  <strong>
                    Fares saved
                  </strong>

                  <p>
                    {message}
                  </p>

                </div>

              </div>
            )}

            {/* ERROR */}

            {error && (
              <div className="fare-error-message">
                {error}
              </div>
            )}

            {/* TRIP SUMMARY */}

            <section className="fare-trip-card">

              <div className="fare-trip-top">

                <div className="fare-trip-icon">

                  <IonIcon
                    icon={
                      busOutline
                    }
                  />

                </div>

                <div className="fare-trip-title-area">

                  <span className="fare-service-number">
                    {
                      trip.service_number
                    }
                  </span>

                  <h2>
                    {
                      trip.source_city
                    }
                    {' → '}
                    {
                      trip.destination_city
                    }
                  </h2>

                  <p>
                    {trip.bus_name}

                    {trip.registration_number
                      ? ` • ${trip.registration_number}`
                      : ''}
                  </p>

                </div>

                <div
                  className={`fare-status fare-status-${trip.status.toLowerCase()}`}
                >
                  {trip.status}
                </div>

              </div>

              <div className="fare-trip-details">

                <div>

                  <div className="fare-detail-icon">

                    <IonIcon
                      icon={
                        calendarOutline
                      }
                    />

                  </div>

                  <div>

                    <span>
                      Journey
                    </span>

                    <strong>
                      {
                        formatDate(
                          trip.departure_at,
                        )
                      }
                    </strong>

                  </div>

                </div>

                <div>

                  <div className="fare-detail-icon">

                    <IonIcon
                      icon={
                        timeOutline
                      }
                    />

                  </div>

                  <div>

                    <span>
                      Schedule
                    </span>

                    <strong>
                      {
                        formatTime(
                          trip.departure_at,
                        )
                      }
                      {' → '}
                      {
                        formatTime(
                          trip.arrival_at,
                        )
                      }
                    </strong>

                  </div>

                </div>

                <div>

                  <div className="fare-detail-icon">

                    <IonIcon
                      icon={
                        busOutline
                      }
                    />

                  </div>

                  <div>

                    <span>
                      Capacity
                    </span>

                    <strong>
                      {
                        trip.seat_capacity
                      }
                      {' '}
                      seats
                    </strong>

                  </div>

                </div>

                <div>

                  <div className="fare-detail-icon">

                    <IonIcon
                      icon={
                        walletOutline
                      }
                    />

                  </div>

                  <div>

                    <span>
                      Starting Fare
                    </span>

                    <strong>
                      {
                        lowestFare !==
                        null
                          ? formatCurrency(
                              lowestFare,
                            )
                          : 'Not set'
                      }
                    </strong>

                  </div>

                </div>

              </div>

            </section>

            {/* FARE FORM */}

            <section className="fare-config-card">

              <div className="fare-config-header">

                <div>

                  <span className="fare-section-label">
                    PRICING
                  </span>

                  <h2>
                    Fare by Seat Type
                  </h2>

                  <p>
                    Each seat type can have its
                    own base passenger fare.
                  </p>

                </div>

                <div className="fare-seat-type-count">

                  <strong>
                    {
                      types.length
                    }
                  </strong>

                  <span>
                    Seat Types
                  </span>

                </div>

              </div>

              {types.length ===
                0 ? (
                <div className="fare-no-types">

                  <IonIcon
                    icon={
                      pricetagOutline
                    }
                  />

                  <h3>
                    No seat types found
                  </h3>

                  <p>
                    This trip has no seat types
                    available for pricing.
                  </p>

                </div>
              ) : (
                <form
                  onSubmit={
                    save
                  }
                >

                  <div className="fare-type-grid">

                    {types.map(
                      (
                        seatType,
                      ) => {
                        const value =
                          values[
                            seatType.seat_type
                          ] || '';

                        const fieldError =
                          errors[
                            seatType.seat_type
                          ];

                        return (
                          <div
                            key={
                              seatType.seat_type
                            }
                            className={[
                              'fare-type-card',

                              fieldError
                                ? 'has-error'
                                : '',
                            ]
                              .filter(Boolean)
                              .join(' ')}
                          >

                            <div className="fare-type-card-header">

                              <div className="fare-type-icon">

                                <IonIcon
                                  icon={
                                    pricetagOutline
                                  }
                                />

                              </div>

                              <div>

                                <h3>
                                  {
                                    formatSeatType(
                                      seatType.seat_type,
                                    )
                                  }
                                </h3>

                                <span>
                                  {
                                    seatType.seat_count
                                  }
                                  {' '}
                                  {
                                    seatType.seat_count ===
                                    1
                                      ? 'seat'
                                      : 'seats'
                                  }
                                </span>

                              </div>

                            </div>

                            <div className="fare-input-label">

                              <span>
                                Fare per seat
                              </span>

                              <small>
                                ₹1 – ₹100,000
                              </small>

                            </div>

                            <div className="fare-input-wrapper">

                              <span className="fare-currency">
                                ₹
                              </span>

                              <input
                                type="number"
                                min="1"
                                max="100000"
                                step="0.01"
                                required
                                value={
                                  value
                                }
                                placeholder="Enter fare"
                                disabled={
                                  saving
                                }
                                onChange={(
                                  event,
                                ) =>
                                  updateFare(
                                    seatType.seat_type,
                                    event.target.value,
                                  )
                                }
                              />

                              {value &&
                                Number(
                                  value,
                                ) >
                                  0 && (
                                  <span className="fare-valid-icon">
                                    <IonIcon
                                      icon={
                                        checkmarkCircleOutline
                                      }
                                    />
                                  </span>
                                )}

                            </div>

                            {fieldError && (
                              <p className="fare-field-error">
                                {
                                  fieldError
                                }
                              </p>
                            )}

                            {value &&
                              Number(
                                value,
                              ) >
                                0 && (
                                <div className="fare-preview">

                                  <span>
                                    Passenger will see
                                  </span>

                                  <strong>
                                    {
                                      formatCurrency(
                                        value,
                                      )
                                    }
                                  </strong>

                                </div>
                              )}

                          </div>
                        );
                      },
                    )}

                  </div>

                  {/* INFO */}

                  <div className="fare-info-box">

                    <IonIcon
                      icon={
                        walletOutline
                      }
                    />

                    <div>

                      <strong>
                        Fare configuration
                      </strong>

                      <p>
                        These fares will be used
                        when the trip is published.
                        Customers will see pricing
                        based on the seat type they
                        select.
                      </p>

                    </div>

                  </div>

                  {/* FOOTER */}

                  <div className="fare-actions">

                    <button
                      type="button"
                      className="fare-secondary-button"
                      disabled={
                        saving
                      }
                      onClick={
                        backToInventory
                      }
                    >

                      <IonIcon
                        icon={
                          arrowBackOutline
                        }
                      />

                      Back to Inventory

                    </button>

                    <button
                      type="submit"
                      className="fare-primary-button"
                      disabled={
                        saving ||
                        !hasChanges
                      }
                    >

                      <IonIcon
                        icon={
                          saveOutline
                        }
                      />

                      {saving
                        ? 'Saving Fares...'
                        : hasChanges
                          ? 'Save Fares'
                          : 'Fares Saved'}

                    </button>

                  </div>

                </form>
              )}

            </section>

            {/* NEXT STEP */}

            {message && (
              <div className="fare-next-step-card">

                <div>

                  <IonIcon
                    icon={
                      checkmarkCircleOutline
                    }
                  />

                  <div>

                    <strong>
                      Pricing complete
                    </strong>

                    <p>
                      Return to inventory,
                      review the seats and publish
                      this trip when everything
                      is correct.
                    </p>

                  </div>

                </div>

                <button
                  type="button"
                  className="fare-primary-button"
                  onClick={
                    backToInventory
                  }
                >
                  Review & Publish
                </button>

              </div>
            )}

          </div>

        </div>

      </IonContent>

    </IonPage>
  );
}