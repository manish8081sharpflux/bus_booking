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
  checkmarkCircleOutline,
  chevronForwardOutline,
  locationOutline,
  mapOutline,
  timeOutline,
  walletOutline,
} from 'ionicons/icons';

import {
  useHistory,
  useLocation,
} from 'react-router-dom';

import './CreateTripPage.css';

/* =========================================================
   API
========================================================= */

const API =
  import.meta.env
    .VITE_OPERATOR_API_URL ||
  'http://localhost:4000/api';

/* =========================================================
   TYPES
========================================================= */

interface Route {
  id: string;

  source_city: string;

  destination_city: string;

  distance_km?: number | null;

  estimated_duration_minutes?:
    number | null;
}

interface RouteForm {
  sourceCity: string;

  destinationCity: string;

  distanceKm: string;

  estimatedDurationMinutes:
    string;
}

interface TripForm {
  routeId: string;

  serviceNumber: string;

  travelDate: string;

  departureTime: string;

  arrivalTime: string;

  baseFare: string;
}

interface CreatedTrip {
  id: string;

  status?: string;

  service_number?: string;
}

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
   OPERATOR ID
========================================================= */

const storedOperatorId =
  () => {
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
        JSON.parse(
          raw,
        );

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
   API REQUEST
========================================================= */

const request = async <T,>(
  path: string,
  options?: RequestInit,
): Promise<T> => {
  const token =
    getToken();

  const headers =
    new Headers(
      options?.headers,
    );

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

  let body:
    any = null;

  try {
    body =
      await response.json();
  } catch {
    throw new Error(
      'The server returned an invalid response.',
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
   DATE HELPER
========================================================= */

const getTodayString =
  () => {
    const now =
      new Date();

    const year =
      now.getFullYear();

    const month =
      String(
        now.getMonth() + 1,
      ).padStart(
        2,
        '0',
      );

    const day =
      String(
        now.getDate(),
      ).padStart(
        2,
        '0',
      );

    return `${year}-${month}-${day}`;
  };

/* =========================================================
   PAGE
========================================================= */

export default function CreateTripPage() {
  const history =
    useHistory();

  const location =
    useLocation();

  /* =======================================================
     BUS ID
  ======================================================= */

  const busId =
    useMemo(
      () =>
        new URLSearchParams(
          location.search,
        ).get(
          'busId',
        ) || '',
      [
        location.search,
      ],
    );

  const routeIdFromQuery =
    useMemo(
      () =>
        new URLSearchParams(
          location.search,
        ).get('routeId') || '',
      [location.search],
    );

  const currentStep =
    location.pathname.endsWith(
      '/trip',
    )
      ? 2
      : 1;

  const operatorId =
    storedOperatorId();

  /* =======================================================
     STATE
  ======================================================= */

  const [
    routes,
    setRoutes,
  ] =
    useState<Route[]>(
      [],
    );

  const [
    route,
    setRoute,
  ] =
    useState<RouteForm>({
      sourceCity: '',

      destinationCity: '',

      distanceKm: '',

      estimatedDurationMinutes:
        '',
    });

  const [
    trip,
    setTrip,
  ] =
    useState<TripForm>({
      routeId:
        routeIdFromQuery,

      serviceNumber: '',

      travelDate: '',

      departureTime: '',

      arrivalTime: '',

      baseFare: '',
    });

  const [recurring, setRecurring] = useState(false);
  const [recurrenceType, setRecurrenceType] = useState<'DAILY' | 'WEEKDAYS' | 'SELECTED_DAYS'>('DAILY');
  const [scheduleEndDate, setScheduleEndDate] = useState('');
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [scheduleExceptions, setScheduleExceptions] = useState<Array<{date:string;action:'CANCEL'|'CHANGE';departureTime:string;reason:string}>>([]);

  const [
    routeBusy,
    setRouteBusy,
  ] =
    useState(
      false,
    );

  const [
    tripBusy,
    setTripBusy,
  ] =
    useState(
      false,
    );

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
    routeCreated,
    setRouteCreated,
  ] =
    useState(
      false,
    );

  /* =======================================================
     SELECTED ROUTE
  ======================================================= */

  const selectedRoute =
    useMemo(
      () =>
        routes.find(
          (
            item,
          ) =>
            item.id ===
            trip.routeId,
        ) ||
        null,
      [
        routes,
        trip.routeId,
      ],
    );

  /* =======================================================
     LOAD ROUTES
  ======================================================= */

  const loadRoutes =
    async () => {
      if (!operatorId) {
        return;
      }

      try {
        setError('');

        const data =
          await request<
            Route[]
          >(
            `/routes?operatorId=${encodeURIComponent(
              operatorId,
            )}`,
          );

        setRoutes(
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
            : 'Unable to load routes.',
        );
      }
    };

  useEffect(
    () => {
      void loadRoutes();
    },
    [
      operatorId,
    ],
  );

  /* =======================================================
     ROUTE FORM
  ======================================================= */

  const updateRoute = (
    field:
      keyof RouteForm,
    value: string,
  ) => {
    setRoute(
      (
        previous,
      ) => ({
        ...previous,

        [field]:
          value,
      }),
    );

    setError('');
    setMessage('');
  };

  /* =======================================================
     TRIP FORM
  ======================================================= */

  const updateTrip = (
    field:
      keyof TripForm,
    value: string,
  ) => {
    setTrip(
      (
        previous,
      ) => ({
        ...previous,

        [field]:
          value,
      }),
    );

    setError('');
    setMessage('');
  };

  /* =======================================================
     VALIDATE ROUTE
  ======================================================= */

  const validateRoute =
    () => {
      const source =
        route.sourceCity.trim();

      const destination =
        route.destinationCity.trim();

      const cityPattern =
        /^[\p{L}\p{M} .'-]+$/u;

      if (!source || source.length < 2 || source.length > 80 || !cityPattern.test(source)) {
        setError('From city must be 2–80 letters and may contain spaces, dots, apostrophes or hyphens.');
        return false;
      }

      if (!destination || destination.length < 2 || destination.length > 80 || !cityPattern.test(destination)) {
        setError('To city must be 2–80 letters and may contain spaces, dots, apostrophes or hyphens.');
        return false;
      }

      if (
        source.toLowerCase() ===
        destination.toLowerCase()
      ) {
        setError(
          'Source and destination cannot be the same.',
        );

        return false;
      }

      if (
        !route.distanceKm ||
        !Number.isFinite(Number(route.distanceKm)) ||
        Number(route.distanceKm) <= 0 ||
        Number(route.distanceKm) > 10000
      ) {
        setError('Distance is required and must be between 0.1 and 10,000 km.');

        return false;
      }

      if (
        !route.estimatedDurationMinutes ||
        !Number.isInteger(Number(route.estimatedDurationMinutes)) ||
        Number(route.estimatedDurationMinutes) < 1 ||
        Number(route.estimatedDurationMinutes) > 10080
      ) {
        setError('Estimated duration is required and must be between 1 and 10,080 minutes.');

        return false;
      }

      return true;
    };

  /* =======================================================
     CREATE ROUTE
  ======================================================= */

  const addRoute =
    async (
      event:
        FormEvent,
    ) => {
      event.preventDefault();

      if (
        !validateRoute()
      ) {
        return;
      }

      try {
        setRouteBusy(
          true,
        );

        setError('');
        setMessage('');

        const created =
          await request<Route>(
            '/routes',
            {
              method:
                'POST',

              headers: {
                'Content-Type':
                  'application/json',
              },

              body:
                JSON.stringify({
                  operatorId,

                  sourceCity:
                    route.sourceCity
                      .trim(),

                  destinationCity:
                    route.destinationCity
                      .trim(),

                  distanceKm:
                    route.distanceKm
                      ? Number(
                          route.distanceKm,
                        )
                      : null,

                  estimatedDurationMinutes:
                    route
                      .estimatedDurationMinutes
                      ? Number(
                          route
                            .estimatedDurationMinutes,
                        )
                      : null,
                }),
            },
          );

        await loadRoutes();

        setTrip(
          (
            previous,
          ) => ({
            ...previous,

            routeId:
              created.id,
          }),
        );

        setRouteCreated(
          true,
        );

        setMessage(
          'Route created successfully. Now configure the trip schedule.',
        );

        history.push(
          `/operator/trips/create/trip?busId=${encodeURIComponent(
            busId,
          )}&routeId=${encodeURIComponent(
            created.id,
          )}`,
        );
      } catch (
        requestError
      ) {
        setError(
          requestError instanceof
            Error
            ? requestError.message
            : 'Unable to create route.',
        );
      } finally {
        setRouteBusy(
          false,
        );
      }
    };

  /* =======================================================
     VALIDATE TRIP
  ======================================================= */

  const validateTrip =
    () => {
      if (
        !trip.routeId
      ) {
        setError(
          'Please select a route.',
        );

        return false;
      }

      if (
        !trip.serviceNumber.trim()
      ) {
        setError(
          'Service number is required.',
        );

        return false;
      }

      const serviceNumber = trip.serviceNumber.trim();

      if (serviceNumber.length < 3 || serviceNumber.length > 30 || !/^[A-Za-z0-9][A-Za-z0-9/_-]*$/.test(serviceNumber)) {
        setError('Service number must be 3–30 characters using letters, numbers, /, _ or -.');
        return false;
      }

      if (
        !trip.travelDate
      ) {
        setError(
          'Travel date is required.',
        );

        return false;
      }

      if (
        trip.travelDate <
        getTodayString()
      ) {
        setError(
          'Travel date cannot be in the past.',
        );

        return false;
      }

      if (
        !trip.departureTime
      ) {
        setError(
          'Departure time is required.',
        );

        return false;
      }

      if (!recurring && !trip.arrivalTime) {
        setError(
          'Arrival time is required.',
        );

        return false;
      }

      if (recurring && (!scheduleEndDate || scheduleEndDate < trip.travelDate)) {
        setError('Recurring schedule end date must be on or after its start date.');
        return false;
      }
      if (recurring && recurrenceType === 'SELECTED_DAYS' && !selectedDays.length) {
        setError('Choose at least one service day.');
        return false;
      }
      if (recurring && (scheduleExceptions.some((item) => !item.date || item.date < trip.travelDate || item.date > scheduleEndDate || (item.action === 'CHANGE' && !item.departureTime)) || new Set(scheduleExceptions.map((item) => item.date)).size !== scheduleExceptions.length)) {
        setError('Each exception needs a unique date inside the schedule range and changed services need a departure time.');
        return false;
      }

      const departure = new Date(`${trip.travelDate}T${trip.departureTime}`);
      const arrival = new Date(`${trip.travelDate}T${trip.arrivalTime || trip.departureTime}`);

      if (Number.isNaN(departure.getTime()) || Number.isNaN(arrival.getTime())) {
        setError('Enter valid departure and arrival times.');
        return false;
      }

      if (departure.getTime() <= Date.now()) {
        setError('Departure must be in the future.');
        return false;
      }

      if (!recurring && arrival <= departure) {
        arrival.setDate(arrival.getDate() + 1);
      }

      const durationMinutes = (arrival.getTime() - departure.getTime()) / 60000;

      if (!recurring && (durationMinutes < 5 || durationMinutes > 2880)) {
        setError('Trip duration must be between 5 minutes and 48 hours.');
        return false;
      }

      const fare =
        Number(
          trip.baseFare,
        );

      if (
        !Number.isFinite(
          fare,
        ) ||
        fare <= 0 ||
        fare > 100000
      ) {
        setError(
          'Enter a valid fare greater than ₹0.',
        );

        return false;
      }

      return true;
    };

  /* =======================================================
     CREATE TRIP
  ======================================================= */

  const createTrip =
    async (
      event:
        FormEvent,
    ) => {
      event.preventDefault();

      if (
        !validateTrip()
      ) {
        return;
      }

      try {
        setTripBusy(
          true,
        );

        setError('');
        setMessage('');

        /*
         * IMPORTANT:
         *
         * We only CREATE the trip here.
         *
         * We do NOT publish it yet.
         *
         * Backend should:
         *
         * 1. Create trip
         * 2. Create fare
         * 3. Create stops
         * 4. Generate seat inventory
         *
         * Then operator reviews inventory
         * before publishing.
         */

        if (recurring) {
          await request('/schedules', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              routeId: trip.routeId,
              busId,
              serviceNumber: trip.serviceNumber.trim(),
              departureTime: trip.departureTime,
              baseFare: Number(trip.baseFare),
              recurrenceType,
              selectedDays,
              startDate: trip.travelDate,
              endDate: scheduleEndDate,
              exceptions: scheduleExceptions,
            }),
          });
          setMessage('Recurring schedule created and dated trips generated successfully.');
          history.push('/operator/trips');
          return;
        }

        const created =
          await request<
            CreatedTrip
          >(
            '/trips',
            {
              method:
                'POST',

              headers: {
                'Content-Type':
                  'application/json',
              },

              body:
                JSON.stringify({
                  operatorId,

                  busId,

                  routeId:
                    trip.routeId,

                  serviceNumber:
                    trip
                      .serviceNumber
                      .trim(),

                  travelDate:
                    trip.travelDate,

                  departureTime:
                    trip.departureTime,

                  arrivalTime:
                    trip.arrivalTime,

                  baseFare:
                    Number(
                      trip.baseFare,
                    ),
                }),
            },
          );

        if (
          !created?.id
        ) {
          throw new Error(
            'Trip was created but the trip ID was not returned.',
          );
        }

        setMessage(
          'Trip created successfully. Seat inventory is ready for review.',
        );

        /*
         * ===============================================
         * NEXT STEP
         *
         * Trip
         * ↓
         * Inventory
         * ↓
         * Review
         * ↓
         * Publish
         * ===============================================
         */

        history.push(
          `/operator/trips/inventory?tripId=${encodeURIComponent(
            created.id,
          )}`,
        );
      } catch (
        requestError
      ) {
        setError(
          requestError instanceof
            Error
            ? requestError.message
            : 'Unable to create trip.',
        );
      } finally {
        setTripBusy(
          false,
        );
      }
    };

  /* =======================================================
     MISSING CONTEXT
  ======================================================= */

  if (
    !operatorId ||
    !busId
  ) {
    return (
      <IonPage>

        <IonContent fullscreen>

          <div className="trip-page">

            <div className="trip-missing-card">

              <div className="trip-missing-icon">

                <IonIcon
                  icon={
                    busOutline
                  }
                />

              </div>

              <h1>
                Unable to Create Trip
              </h1>

              <p>
                The operator or selected bus
                could not be identified.
                Return to the dashboard and
                select
                {' '}
                <strong>
                  Create Trip
                </strong>
                {' '}
                on an active bus.
              </p>

              <button
                type="button"
                className="trip-primary-button"
                onClick={() =>
                  history.push(
                    '/operator/dashboard',
                  )
                }
              >
                Go to Dashboard
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

        <div className="trip-page">

          <div className="trip-container">

            {/* ==========================================
                HEADER
            =========================================== */}

            <div className="trip-header">

              <button
                type="button"
                className="trip-back-button"
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

              <div>

                <p className="trip-eyebrow">
                  Trip Management
                </p>

                <h1>
                  Create Trip / Service
                </h1>

                <p>
                  Create a route, configure the
                  service schedule and generate
                  seat inventory before publishing.
                </p>

              </div>

            </div>

            {/* ==========================================
                WORKFLOW
            =========================================== */}

            <div className="trip-workflow">

              <div className={`trip-workflow-step ${currentStep === 1 ? 'active' : 'completed'}`}>
                <span>
                  1
                </span>

                <div>
                  <strong>
                    Route
                  </strong>

                  <small>
                    Create or select
                  </small>
                </div>
              </div>

              <div className="trip-workflow-line" />

              <div className={`trip-workflow-step ${currentStep === 2 ? 'active' : ''}`}>
                <span>
                  2
                </span>

                <div>
                  <strong>
                    Trip
                  </strong>

                  <small>
                    Schedule service
                  </small>
                </div>
              </div>

              <div className="trip-workflow-line" />

              <div className="trip-workflow-step">
                <span>
                  3
                </span>

                <div>
                  <strong>
                    Inventory
                  </strong>

                  <small>
                    Review seats
                  </small>
                </div>
              </div>

              <div className="trip-workflow-line" />

              <div className="trip-workflow-step">
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

            {/* ==========================================
                MESSAGE
            =========================================== */}

            {message && (
              <div className="trip-success-message">

                <IonIcon
                  icon={
                    checkmarkCircleOutline
                  }
                />

                <span>
                  {message}
                </span>

              </div>
            )}

            {error && (
              <div className="trip-error-message">
                {error}
              </div>
            )}

            {/* ==========================================
                CREATE ROUTE
            =========================================== */}

            {currentStep === 1 && (
            <section className="trip-card">

              <div className="trip-card-header">

                <div className="trip-card-icon">

                  <IonIcon
                    icon={
                      mapOutline
                    }
                  />

                </div>

                <div>

                  <span className="trip-section-number">
                    STEP 1
                  </span>

                  <h2>
                    Add Route
                  </h2>

                  <p>
                    Create the route for this service.
                    Source and destination can later
                    become the default boarding and
                    dropping points.
                  </p>

                </div>

              </div>

              <form
                onSubmit={
                  addRoute
                }
                className="trip-form"
              >

                <div className="trip-form-grid">

                  <div className="trip-field">

                    <label>
                      From City
                      <span>
                        *
                      </span>
                    </label>

                    <div className="trip-input-wrapper">

                      <IonIcon
                        icon={
                          locationOutline
                        }
                      />

                      <input
                        type="text"
                        required
                        minLength={2}
                        maxLength={80}
                        value={
                          route.sourceCity
                        }
                        placeholder="e.g. Pune"
                        onChange={(
                          event,
                        ) =>
                          updateRoute(
                            'sourceCity',
                            event.target.value,
                          )
                        }
                      />

                    </div>

                  </div>

                  <div className="trip-field">

                    <label>
                      To City
                      <span>
                        *
                      </span>
                    </label>

                    <div className="trip-input-wrapper">

                      <IonIcon
                        icon={
                          locationOutline
                        }
                      />

                      <input
                        type="text"
                        required
                        minLength={2}
                        maxLength={80}
                        value={
                          route.destinationCity
                        }
                        placeholder="e.g. Mumbai"
                        onChange={(
                          event,
                        ) =>
                          updateRoute(
                            'destinationCity',
                            event.target.value,
                          )
                        }
                      />

                    </div>

                  </div>

                  <div className="trip-field">

                    <label>
                      Distance
                      <small>
                        {' '}
                        (km)
                      </small>
                    </label>

                    <input
                      type="number"
                      required
                      min="0.1"
                      max="10000"
                      step="0.1"
                      value={
                        route.distanceKm
                      }
                      placeholder="e.g. 150"
                      onChange={(
                        event,
                      ) =>
                        updateRoute(
                          'distanceKm',
                          event.target.value,
                        )
                      }
                    />

                  </div>

                  <div className="trip-field">

                    <label>
                      Estimated Duration
                      <small>
                        {' '}
                        (minutes)
                      </small>
                    </label>

                    <div className="trip-input-wrapper">

                      <IonIcon
                        icon={
                          timeOutline
                        }
                      />

                      <input
                        type="number"
                        required
                        min="1"
                        max="10080"
                        value={
                          route
                            .estimatedDurationMinutes
                        }
                        placeholder="e.g. 240"
                        onChange={(
                          event,
                        ) =>
                          updateRoute(
                            'estimatedDurationMinutes',
                            event.target.value,
                          )
                        }
                      />

                    </div>

                  </div>

                </div>

                <div className="trip-card-footer">

                  <button
                    type="submit"
                    className="trip-primary-button"
                    disabled={
                      routeBusy
                    }
                  >
                    {routeBusy
                      ? 'Saving Route...'
                      : 'Save Route'}
                  </button>

                </div>

              </form>

            </section>
            )}

            {/* ==========================================
                DIVIDER
            =========================================== */}

            {currentStep === 1 && (
            <div className="trip-section-connector">

              <div />

              <span>
                Route
              </span>

              <div />

            </div>
            )}

            {/* ==========================================
                TRIP
            =========================================== */}

            {currentStep === 2 && (
            <section className="trip-card">

              <div className="trip-card-header">

                <div className="trip-card-icon trip-card-icon-green">

                  <IonIcon
                    icon={
                      busOutline
                    }
                  />

                </div>

                <div>

                  <span className="trip-section-number">
                    STEP 2
                  </span>

                  <h2>
                    Configure Service
                  </h2>

                  <p>
                    Select the route and configure
                    the service number, travel date,
                    timings and base fare.
                  </p>

                </div>

              </div>

              <form
                onSubmit={
                  createTrip
                }
                className="trip-form"
              >

                {/* ROUTE */}

                <div className="trip-field trip-field-full">

                  <label>
                    Route
                    <span>
                      *
                    </span>
                  </label>

                  <select
                    required
                    value={
                      trip.routeId
                    }
                    onChange={(
                      event,
                    ) =>
                      updateTrip(
                        'routeId',
                        event.target.value,
                      )
                    }
                  >
                    <option value="">
                      Select a route
                    </option>

                    {routes.map(
                      (
                        routeOption,
                      ) => (
                        <option
                          key={
                            routeOption.id
                          }
                          value={
                            routeOption.id
                          }
                        >
                          {
                            routeOption.source_city
                          }
                          {' → '}
                          {
                            routeOption.destination_city
                          }
                        </option>
                      ),
                    )}

                  </select>

                </div>

                {selectedRoute && (
                  <div className="selected-route-box">

                    <IonIcon
                      icon={
                        mapOutline
                      }
                    />

                    <div>

                      <strong>
                        {
                          selectedRoute.source_city
                        }
                        {' → '}
                        {
                          selectedRoute.destination_city
                        }
                      </strong>

                      <span>
                        {selectedRoute.distance_km
                          ? `${selectedRoute.distance_km} km`
                          : 'Distance not specified'}

                        {' • '}

                        {selectedRoute
                          .estimated_duration_minutes
                          ? `${selectedRoute.estimated_duration_minutes} minutes`
                          : 'Duration not specified'}
                      </span>

                    </div>

                  </div>
                )}

                <div className="trip-form-grid">

                  {/* SERVICE */}

                  <div className="trip-field">

                    <label>
                      Service Number
                      <span>
                        *
                      </span>
                    </label>

                    <input
                      type="text"
                      required
                      minLength={3}
                      maxLength={30}
                      pattern="[A-Za-z0-9][A-Za-z0-9/_-]*"
                      value={
                        trip.serviceNumber
                      }
                      placeholder="e.g. BUS-1001"
                      onChange={(
                        event,
                      ) =>
                        updateTrip(
                          'serviceNumber',
                          event.target.value,
                        )
                      }
                    />

                  </div>

                  <div className="trip-field trip-field-full">
                    <label className="trip-inline-option">
                      <input type="checkbox" checked={recurring} onChange={(event) => setRecurring(event.target.checked)} />
                      Create a recurring schedule
                    </label>
                  </div>

                  {/* TRAVEL DATE */}

                  <div className="trip-field">

                    <label>
                      Travel Date
                      <span>
                        *
                      </span>
                    </label>

                    <input
                      type="date"
                      required
                      min={
                        getTodayString()
                      }
                      value={
                        trip.travelDate
                      }
                      onChange={(
                        event,
                      ) =>
                        updateTrip(
                          'travelDate',
                          event.target.value,
                        )
                      }
                    />

                  </div>

                  {recurring && (
                    <>
                      <div className="trip-field">
                        <label>Repeat</label>
                        <select value={recurrenceType} onChange={(event) => setRecurrenceType(event.target.value as typeof recurrenceType)}>
                          <option value="DAILY">Daily</option>
                          <option value="WEEKDAYS">Weekdays (Mon–Fri)</option>
                          <option value="SELECTED_DAYS">Selected days</option>
                        </select>
                      </div>
                      <div className="trip-field">
                        <label>Schedule End Date <span>*</span></label>
                        <input type="date" min={trip.travelDate || getTodayString()} value={scheduleEndDate} onChange={(event) => setScheduleEndDate(event.target.value)} required />
                      </div>
                      {recurrenceType === 'SELECTED_DAYS' && (
                        <div className="trip-field trip-field-full trip-weekdays">
                          <label>Service days</label>
                          <div>
                            {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((label, day) => (
                              <button type="button" key={label} className={selectedDays.includes(day) ? 'selected' : ''} onClick={() => setSelectedDays((current) => current.includes(day) ? current.filter((item) => item !== day) : [...current, day])}>{label}</button>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="trip-field trip-field-full trip-exceptions">
                        <div className="trip-exceptions-heading">
                          <label>Schedule exceptions</label>
                          <button type="button" onClick={() => setScheduleExceptions((current) => [...current, {date:'',action:'CANCEL',departureTime:'',reason:''}])}>+ Add exception</button>
                        </div>
                        {scheduleExceptions.map((exception, index) => (
                          <div className="trip-exception-row" key={index}>
                            <input aria-label="Exception date" type="date" min={trip.travelDate} max={scheduleEndDate} value={exception.date} onChange={(event) => setScheduleExceptions((current) => current.map((item, itemIndex) => itemIndex === index ? {...item,date:event.target.value} : item))} required />
                            <select aria-label="Exception action" value={exception.action} onChange={(event) => setScheduleExceptions((current) => current.map((item, itemIndex) => itemIndex === index ? {...item,action:event.target.value as 'CANCEL'|'CHANGE'} : item))}>
                              <option value="CANCEL">Cancel service</option>
                              <option value="CHANGE">Change departure</option>
                            </select>
                            {exception.action === 'CHANGE' && <input aria-label="Changed departure time" type="time" value={exception.departureTime} onChange={(event) => setScheduleExceptions((current) => current.map((item, itemIndex) => itemIndex === index ? {...item,departureTime:event.target.value} : item))} required />}
                            <input aria-label="Exception reason" placeholder="Reason (optional)" value={exception.reason} onChange={(event) => setScheduleExceptions((current) => current.map((item, itemIndex) => itemIndex === index ? {...item,reason:event.target.value} : item))} />
                            <button type="button" onClick={() => setScheduleExceptions((current) => current.filter((_, itemIndex) => itemIndex !== index))}>Remove</button>
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  {/* DEPARTURE */}

                  <div className="trip-field">

                    <label>
                      Departure Time
                      <span>
                        *
                      </span>
                    </label>

                    <input
                      type="time"
                      required
                      value={
                        trip.departureTime
                      }
                      onChange={(
                        event,
                      ) =>
                        updateTrip(
                          'departureTime',
                          event.target.value,
                        )
                      }
                    />

                  </div>

                  {/* ARRIVAL */}

                  <div className="trip-field">

                    <label>
                      Arrival Time
                      <span>
                        *
                      </span>
                    </label>

                    <input
                      type="time"
                      required={!recurring}
                      disabled={recurring}
                      value={
                        trip.arrivalTime
                      }
                      onChange={(
                        event,
                      ) =>
                        updateTrip(
                          'arrivalTime',
                          event.target.value,
                        )
                      }
                    />

                  </div>

                  {/* FARE */}

                  <div className="trip-field trip-field-full">

                    <label>
                      Base Fare
                      <span>
                        *
                      </span>
                    </label>

                    <div className="trip-input-wrapper">

                      <IonIcon
                        icon={
                          walletOutline
                        }
                      />

                      <span className="trip-currency">
                        ₹
                      </span>

                      <input
                        className="trip-fare-input"
                        type="number"
                        required
                        min="1"
                        max="100000"
                        step="0.01"
                        value={
                          trip.baseFare
                        }
                        placeholder="e.g. 800"
                        onChange={(
                          event,
                        ) =>
                          updateTrip(
                            'baseFare',
                            event.target.value,
                          )
                        }
                      />

                    </div>

                  </div>

                </div>

                {/* IMPORTANT INFO */}

                <div className="trip-info-box">

                  <IonIcon
                    icon={
                      checkmarkCircleOutline
                    }
                  />

                  <div>

                    <strong>
                      Trip will not be published yet
                    </strong>

                    <p>
                      After creating the trip,
                      review the generated seat
                      inventory, fare and schedule.
                      You can publish it from the
                      next step.
                    </p>

                  </div>

                </div>

                <div className="trip-card-footer trip-card-footer-between">

                  <span className="trip-footer-note">
                    Seat inventory will be generated
                    from this bus&apos;s configured
                    seats.
                  </span>

                  <button
                    type="submit"
                    className="trip-primary-button"
                    disabled={
                      tripBusy
                    }
                  >

                    {tripBusy
                      ? 'Creating Trip...'
                      : 'Create Trip'}

                    {!tripBusy && (
                      <IonIcon
                        icon={
                          chevronForwardOutline
                        }
                      />
                    )}

                  </button>

                </div>

              </form>

            </section>
            )}

          </div>

        </div>

      </IonContent>

    </IonPage>
  );
}
