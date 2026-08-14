import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  IonIcon,
  IonPage,
} from '@ionic/react';

import {
  addOutline,
  busOutline,
  calendarOutline,
  closeOutline,
  locationOutline,
  refreshOutline,
  saveOutline,
  settingsOutline,
  trashOutline,
} from 'ionicons/icons';

import {
  Redirect,
  useHistory,
  useLocation,
} from 'react-router-dom';

import OperatorSidebar from '../../components/operator/OperatorSidebar';

import './OperatorManagementPage.css';

/* =========================================================
   API
========================================================= */

const API =
  import.meta.env.VITE_OPERATOR_API_URL ||
  'http://localhost:4000/api';

/* =========================================================
   OPERATOR
========================================================= */

const getOperator = () => {
  try {
    return JSON.parse(
      localStorage.getItem(
        'operator_profile',
      ) ||
        localStorage.getItem(
          'operator',
        ) ||
        '{}',
    );
  } catch {
    return {};
  }
};

/* =========================================================
   TITLES
========================================================= */

const titleMap = {
  buses: [
    'Buses',
    'Manage only the vehicles registered to your operator account.',
  ],

  routes: [
    'Routes',
    'View and create the routes used by your services.',
  ],

  trips: [
    'Trips',
    'View scheduled services and continue to seat inventory.',
  ],

  settings: [
    'Settings',
    'Review your operator account and console preferences.',
  ],
} as const;

/* =========================================================
   PAGE
========================================================= */

export default function OperatorManagementPage({
  section,
}: {
  section: keyof typeof titleMap;
}) {
  const history =
    useHistory();

  const location =
    useLocation();

  const token =
    localStorage.getItem(
      'operator_access_token',
    ) || '';

  const operator =
    useMemo(
      getOperator,
      [],
    );

  const operatorId =
    operator.id ||
    operator.operatorId ||
    operator.operator_id ||
    '';

  const operatorName =
    operator.operatorName ||
    operator.displayName ||
    operator.legalName ||
    operator.name ||
    'Bus Operator';

  const [
    items,
    setItems,
  ] =
    useState<any[]>([]);

  const [
    loading,
    setLoading,
  ] =
    useState(
      section !==
        'settings',
    );

  const [
    error,
    setError,
  ] =
    useState('');

  /* =======================================================
     LOAD
  ======================================================= */

  const load =
    async () => {
      if (
        section ===
        'settings'
      ) {
        return;
      }

      if (
        !operatorId
      ) {
        setError(
          'Operator information was not found.',
        );

        setLoading(
          false,
        );

        return;
      }

      try {
        setLoading(
          true,
        );

        setError('');

        const path =
          section ===
          'buses'
            ? `/buses?operatorId=${encodeURIComponent(
                operatorId,
              )}`
            : `/${section}?operatorId=${encodeURIComponent(
                operatorId,
              )}`;

        const response =
          await fetch(
            `${API}${path}`,
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

        const body =
          text
            ? JSON.parse(
                text,
              )
            : {};

        if (response.status === 401) {
          localStorage.removeItem('operator_access_token');
          localStorage.removeItem('operator');
          history.replace('/operator');
          return;
        }

        if (
          !response.ok ||
          body.success ===
            false
        ) {
          throw new Error(
            body.message ||
              `Unable to load ${section}.`,
          );
        }

        const data =
          body.data ??
          body;

        setItems(
          Array.isArray(
            data,
          )
            ? data
            : Array.isArray(
                  data?.[
                    section
                  ],
                )
              ? data[
                  section
                ]
              : Array.isArray(
                    body[
                      section
                    ],
                  )
                ? body[
                    section
                  ]
                : [],
        );
      } catch (
        reason
      ) {
        setError(
          reason instanceof
            Error
            ? reason.message
            : `Unable to load ${section}.`,
        );
      } finally {
        setLoading(
          false,
        );
      }
    };

  useEffect(
    () => {
      void load();
    },
    [
      section,
      operatorId,
      location.key,
    ],
  );

  /* =======================================================
     ROUTE STOPS (BOARDING / DROPPING POINTS)
  ======================================================= */

  type StopRow = {
    city: string;
    locationName: string;
    address: string;
    landmark: string;
    latitude: string;
    longitude: string;
    contactNumber: string;
    instructions: string;
    arrivalOffsetMinutes: number;
    departureOffsetMinutes: number;
    isBoardingAllowed: boolean;
    isDroppingAllowed: boolean;
  };

  const [stopsRoute, setStopsRoute] = useState<any | null>(null);
  const [stopsForm, setStopsForm] = useState<StopRow[]>([]);
  const [stopsBusy, setStopsBusy] = useState(false);
  const [stopsError, setStopsError] = useState('');

  useEffect(() => {
    if (!stopsRoute) return;

    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = prev;
    };
  }, [stopsRoute]);

  function openStops(route: any) {
    const existing: StopRow[] =
      Array.isArray(route.stops) && route.stops.length
        ? route.stops.map((s: any) => ({
            city: s.city || '',
            locationName: s.location_name || s.locationName || '',
            address: s.address || '',
            landmark: s.landmark || '',
            latitude: s.latitude == null ? '' : String(s.latitude),
            longitude: s.longitude == null ? '' : String(s.longitude),
            contactNumber: s.contact_number || s.contactNumber || '',
            instructions: s.instructions || '',
            arrivalOffsetMinutes: Number(s.arrival_offset_minutes || 0),
            departureOffsetMinutes: Number(s.departure_offset_minutes || 0),
            isBoardingAllowed: s.is_boarding_allowed !== false,
            isDroppingAllowed: s.is_dropping_allowed !== false,
          }))
        : [
            { city: route.source_city || '', locationName: route.source_city || '', address: '', landmark: '', latitude: '', longitude: '', contactNumber: '', instructions: '', arrivalOffsetMinutes: 0, departureOffsetMinutes: 0, isBoardingAllowed: true, isDroppingAllowed: false },
            { city: route.destination_city || '', locationName: route.destination_city || '', address: '', landmark: '', latitude: '', longitude: '', contactNumber: '', instructions: '', arrivalOffsetMinutes: Number(route.estimated_duration_minutes || 0), departureOffsetMinutes: Number(route.estimated_duration_minutes || 0), isBoardingAllowed: false, isDroppingAllowed: true },
          ];

    setStopsRoute(route);
    setStopsForm(existing);
    setStopsError('');
  }

  function closeStops() {
    if (stopsBusy) return;
    setStopsRoute(null);
    setStopsForm([]);
    setStopsError('');
  }

  function updateStop<K extends keyof StopRow>(index: number, key: K, value: StopRow[K]) {
    setStopsForm((current) => current.map((s, i) => (i === index ? { ...s, [key]: value } : s)));
  }

  function addStopRow() {
    setStopsForm((current) => [
      ...current,
      { city: '', locationName: '', address: '', landmark: '', latitude: '', longitude: '', contactNumber: '', instructions: '', arrivalOffsetMinutes: current.at(-1)?.departureOffsetMinutes || 0, departureOffsetMinutes: current.at(-1)?.departureOffsetMinutes || 0, isBoardingAllowed: true, isDroppingAllowed: true },
    ]);
  }

  function removeStopRow(index: number) {
    setStopsForm((current) => current.filter((_, i) => i !== index));
  }

  async function saveStops(e: React.FormEvent) {
    e.preventDefault();
    if (!stopsRoute) return;

    if (stopsForm.length < 2) {
      setStopsError('Add at least a boarding and a dropping point.');
      return;
    }
    if (stopsForm.some((s) => !s.city.trim() || !s.locationName.trim())) {
      setStopsError('Every stop needs a city and a location name.');
      return;
    }
    if (!stopsForm.some((s) => s.isBoardingAllowed)) {
      setStopsError('At least one stop must allow boarding.');
      return;
    }
    if (!stopsForm.some((s) => s.isDroppingAllowed)) {
      setStopsError('At least one stop must allow dropping.');
      return;
    }
    if (stopsForm.some((s, index) => s.arrivalOffsetMinutes < 0 || s.departureOffsetMinutes < s.arrivalOffsetMinutes || (index > 0 && s.arrivalOffsetMinutes < stopsForm[index - 1].departureOffsetMinutes))) {
      setStopsError('Stop offsets must move forward, and departure must be after arrival.');
      return;
    }

    try {
      setStopsBusy(true);
      setStopsError('');

      const response = await fetch(`${API}/routes/${encodeURIComponent(stopsRoute.id)}/stops`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          operatorId,
          stops: stopsForm.map((s) => ({
            city: s.city.trim(),
            locationName: s.locationName.trim(),
            address: s.address.trim() || null,
            isBoardingAllowed: s.isBoardingAllowed,
            isDroppingAllowed: s.isDroppingAllowed,
          })),
        }),
      });

      const text = await response.text();
      const body = text ? JSON.parse(text) : {};

      if (!response.ok || body.success === false) {
        throw new Error(body.message || 'Unable to save boarding & dropping points.');
      }

      closeStops();
      await load();
    } catch (reason) {
      setStopsError(reason instanceof Error ? reason.message : 'Unable to save boarding & dropping points.');
    } finally {
      setStopsBusy(false);
    }
  }

  /* =======================================================
     AUTH
  ======================================================= */

  if (!token) {
    return (
      <Redirect to="/operator" />
    );
  }

  /* =======================================================
     PAGE DATA
  ======================================================= */

  const [
    title,
    subtitle,
  ] =
    titleMap[
      section
    ];

  const icon =
    section ===
    'buses'
      ? busOutline
      : section ===
          'routes'
        ? locationOutline
        : section ===
            'trips'
          ? calendarOutline
          : settingsOutline;

  const addAction =
    section ===
    'buses'
      ? () =>
          history.push(
            '/operator/buses/add',
          )
      : section ===
          'routes'
        ? () =>
            history.push(
              '/operator/trips/create/route',
            )
        : section ===
            'trips'
          ? () =>
              history.push(
                '/operator/trips/create',
              )
          : null;

  /* =======================================================
     UI
  ======================================================= */

  return (
    <IonPage>

      <div className="operator-management-shell">

        <OperatorSidebar />

        <main className="operator-management-main">

          {/* =========================================
              HEADER
          ========================================== */}

          <section className="operator-management-header">

            <div className="operator-management-heading">

              <span className="operator-management-breadcrumb">
                Operator Console
                {' / '}
                {title}
              </span>

              <div className="operator-management-title-row">

                <div className="operator-management-title-icon">

                  <IonIcon
                    icon={
                      icon
                    }
                  />

                </div>

                <div>

                  <h1>
                    {title}
                  </h1>

                  <p>
                    {
                      subtitle
                    }
                  </p>

                </div>

              </div>

            </div>

            <div className="operator-management-actions">

              {section !==
                'settings' && (
                <button
                  type="button"
                  className="operator-management-refresh"
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
              )}

              {addAction && (
                <button
                  type="button"
                  className="operator-management-add"
                  onClick={
                    addAction
                  }
                >

                  <IonIcon
                    icon={
                      addOutline
                    }
                  />

                  {section ===
                  'buses'
                    ? 'Add Bus'
                    : section ===
                        'routes'
                      ? 'Add Route'
                      : 'Create Trip'}

                </button>
              )}

            </div>

          </section>

          {/* =========================================
              ERROR
          ========================================== */}

          {error && (
            <div className="operator-management-error">
              {error}
            </div>
          )}

          {/* =========================================
              SETTINGS
          ========================================== */}

          {section ===
          'settings' ? (
            <section className="operator-settings-card">

              <div className="operator-settings-header">

                <div className="operator-settings-icon">

                  <IonIcon
                    icon={
                      settingsOutline
                    }
                  />

                </div>

                <div>

                  <span>
                    OPERATOR PROFILE
                  </span>

                  <h2>
                    Account settings
                  </h2>

                  <p>
                    Review the operator information used throughout the console.
                  </p>

                </div>

              </div>

              <div className="operator-settings-grid">

                <div className="operator-settings-field">

                  <span>
                    Operator Name
                  </span>

                  <strong>
                    {
                      operatorName
                    }
                  </strong>

                </div>

                <div className="operator-settings-field">

                  <span>
                    Operator ID
                  </span>

                  <strong className="operator-id-value">
                    {operatorId ||
                      'Not available'}
                  </strong>

                </div>

                <div className="operator-settings-field">

                  <span>
                    Account Status
                  </span>

                  <strong className="operator-setting-status">
                    {
                      operator.status ||
                      'ACTIVE'
                    }
                  </strong>

                </div>

                <div className="operator-settings-field">

                  <span>
                    Support Email
                  </span>

                  <strong>
                    {
                      operator.supportEmail ||
                      operator.support_email ||
                      operator.email ||
                      'Not available'
                    }
                  </strong>

                </div>

                <div className="operator-settings-field">

                  <span>
                    Support Mobile
                  </span>

                  <strong>
                    {
                      operator.supportMobile ||
                      operator.support_mobile ||
                      operator.mobile ||
                      'Not available'
                    }
                  </strong>

                </div>

              </div>

              <div className="operator-settings-note">
                Fleet, route, trip and booking management are kept separate from profile settings.
              </div>

            </section>
          ) : loading ? (
            /* =========================================
               LOADING
            ========================================== */

            <section className="operator-management-state">

              <div className="operator-management-spinner" />

              <h2>
                Loading
                {' '}
                {section}
              </h2>

              <p>
                Fetching the latest operator data.
              </p>

            </section>
          ) : items.length ===
            0 ? (
            /* =========================================
               EMPTY
            ========================================== */

            <section className="operator-management-empty">

              <div className="operator-management-empty-icon">

                <IonIcon
                  icon={
                    icon
                  }
                />

              </div>

              <h2>
                No
                {' '}
                {section}
                {' '}
                found
              </h2>

              <p>
                Use the action above to add your first
                {' '}
                {section ===
                'buses'
                  ? 'bus'
                  : section ===
                      'routes'
                    ? 'route'
                    : 'trip'}
                .
              </p>

              {addAction && (
                <button
                  type="button"
                  onClick={
                    addAction
                  }
                >

                  <IonIcon
                    icon={
                      addOutline
                    }
                  />

                  {section ===
                  'buses'
                    ? 'Add Your First Bus'
                    : section ===
                        'routes'
                      ? 'Add Your First Route'
                      : 'Create Your First Trip'}

                </button>
              )}

            </section>
          ) : (
            /* =========================================
               ITEMS
            ========================================== */

            <section className="operator-management-list">

              <div className="operator-management-list-header">

                <div>

                  <strong>
                    {title}
                  </strong>

                  <span>
                    {
                      items.length
                    }
                    {' '}
                    {items.length ===
                    1
                      ? 'record'
                      : 'records'}
                  </span>

                </div>

              </div>

              <div className="operator-management-grid">

                {items.map(
                  (
                    item,
                    index,
                  ) => {
                    const itemStatus =
                      item.status ||
                      (
                        item.is_active ===
                        false
                          ? 'INACTIVE'
                          : 'ACTIVE'
                      );

                    return (
                      <article
                        key={
                          item.id ||
                          index
                        }
                        className="operator-management-card"
                      >

                        <div className="operator-management-card-top">

                          <div className="operator-management-card-icon">

                            <IonIcon
                              icon={
                                icon
                              }
                            />

                          </div>

                          <div className="operator-management-card-title">

                            <span>
                              {section ===
                              'buses'
                                ? item.registration_number
                                : section ===
                                    'trips'
                                  ? item.service_number
                                  : 'ROUTE'}
                            </span>

                            <h2>
                              {section ===
                              'buses'
                                ? item.name
                                : section ===
                                    'routes'
                                  ? `${item.source_city} → ${item.destination_city}`
                                  : `${item.source_city} → ${item.destination_city}`}
                            </h2>

                            <p>
                              {section ===
                              'buses'
                                ? `${String(
                                    item.bus_type ||
                                      '',
                                  ).replaceAll(
                                    '_',
                                    ' ',
                                  )} · ${item.seat_capacity || 0} seats`
                                : section ===
                                    'routes'
                                  ? `${item.distance_km || '—'} km · ${item.estimated_duration_minutes || '—'} minutes`
                                  : `${item.bus_name || 'Bus'} · ${
                                      item.departure_at
                                        ? new Date(
                                            item.departure_at,
                                          ).toLocaleString(
                                            'en-IN',
                                          )
                                        : 'Departure not available'
                                    }`}
                            </p>

                          </div>

                          <span
                            className={`operator-management-status ${String(
                              itemStatus,
                            )
                              .toLowerCase()
                              .replaceAll(
                                '_',
                                '-',
                              )}`}
                          >
                            {
                              itemStatus
                            }
                          </span>

                        </div>

                        {/* BUS DETAILS */}

                        {section ===
                          'buses' && (
                          <div className="operator-management-meta-grid">

                            <div>

                              <span>
                                Manufacturer
                              </span>

                              <strong>
                                {
                                  item.manufacturer ||
                                  '—'
                                }
                              </strong>

                            </div>

                            <div>

                              <span>
                                Model
                              </span>

                              <strong>
                                {
                                  item.model ||
                                  '—'
                                }
                              </strong>

                            </div>

                            <div>

                              <span>
                                Capacity
                              </span>

                              <strong>
                                {
                                  item.seat_capacity ||
                                  0
                                }
                                {' '}
                                seats
                              </strong>

                            </div>

                            <div>

                              <span>
                                Deck
                              </span>

                              <strong>
                                {
                                  item.deck_type ||
                                  '—'
                                }
                              </strong>

                            </div>

                          </div>
                        )}

                        {/* ROUTE DETAILS */}

                        {section ===
                          'routes' && (
                          <div className="operator-management-meta-grid">

                            <div>

                              <span>
                                From
                              </span>

                              <strong>
                                {
                                  item.source_city
                                }
                              </strong>

                            </div>

                            <div>

                              <span>
                                To
                              </span>

                              <strong>
                                {
                                  item.destination_city
                                }
                              </strong>

                            </div>

                            <div>

                              <span>
                                Distance
                              </span>

                              <strong>
                                {
                                  item.distance_km ||
                                  '—'
                                }
                                {' '}
                                km
                              </strong>

                            </div>

                            <div>

                              <span>
                                Duration
                              </span>

                              <strong>
                                {
                                  item.estimated_duration_minutes ||
                                  '—'
                                }
                                {' '}
                                min
                              </strong>

                            </div>

                            <div>

                              <span>
                                Boarding &amp; dropping
                              </span>

                              <strong>
                                {Array.isArray(item.stops) && item.stops.length
                                  ? `${item.stops.filter((s: any) => s.is_boarding_allowed !== false).length} boarding · ${item.stops.filter((s: any) => s.is_dropping_allowed !== false).length} dropping`
                                  : 'Not set'}
                              </strong>

                            </div>

                          </div>
                        )}

                        {/* TRIP DETAILS */}

                        {section ===
                          'trips' && (
                          <div className="operator-management-meta-grid">

                            <div>

                              <span>
                                Bus
                              </span>

                              <strong>
                                {
                                  item.bus_name ||
                                  '—'
                                }
                              </strong>

                            </div>

                            <div>

                              <span>
                                Travel Date
                              </span>

                              <strong>
                                {item.departure_at
                                  ? new Date(
                                      item.departure_at,
                                    ).toLocaleDateString(
                                      'en-IN',
                                    )
                                  : '—'}
                              </strong>

                            </div>

                            <div>

                              <span>
                                Departure
                              </span>

                              <strong>
                                {item.departure_at
                                  ? new Date(
                                      item.departure_at,
                                    ).toLocaleTimeString(
                                      'en-IN',
                                      {
                                        hour:
                                          '2-digit',
                                        minute:
                                          '2-digit',
                                      },
                                    )
                                  : '—'}
                              </strong>

                            </div>

                            <div>

                              <span>
                                Status
                              </span>

                              <strong>
                                {
                                  itemStatus
                                }
                              </strong>

                            </div>

                          </div>
                        )}

                        {/* FOOTER */}

                        <div className="operator-management-card-footer">

                          <span>
                            {section ===
                            'buses'
                              ? 'Fleet vehicle'
                              : section ===
                                  'routes'
                                ? 'Service route'
                                : 'Scheduled service'}
                          </span>

                          {section ===
                            'trips' && (
                            <button
                              type="button"
                              onClick={() =>
                                history.push(
                                  `/operator/trips/inventory?tripId=${encodeURIComponent(
                                    item.id,
                                  )}`,
                                )
                              }
                            >
                              View Inventory
                            </button>
                          )}

                          {section ===
                            'routes' && (
                            <button
                              type="button"
                              onClick={() =>
                                openStops(item)
                              }
                            >
                              Edit boarding &amp; dropping
                            </button>
                          )}

                        </div>

                      </article>
                    );
                  },
                )}

              </div>

            </section>
          )}

        </main>

        {stopsRoute && (
          <div
            className="route-stops-backdrop"
            role="presentation"
            onMouseDown={closeStops}
          >
            <form
              className="route-stops-modal"
              noValidate
              onMouseDown={(e) => e.stopPropagation()}
              onSubmit={saveStops}
            >
              <div className="route-stops-head">

                <div>
                  <h2>
                    Boarding &amp; dropping points
                  </h2>
                  <p>
                    {stopsRoute.source_city} → {stopsRoute.destination_city}
                  </p>
                </div>

                <button
                  type="button"
                  aria-label="Close"
                  onClick={closeStops}
                >
                  <IonIcon icon={closeOutline} />
                </button>

              </div>

              {stopsError && (
                <div className="route-stops-error" role="alert">
                  {stopsError}
                </div>
              )}

              <div className="route-stops-list">

                {stopsForm.map((stop, index) => (
                  <div className="route-stops-row" key={index}>

                    <div className="route-stops-row-fields">

                      <label>
                        City
                        <input
                          value={stop.city}
                          onChange={(e) => updateStop(index, 'city', e.target.value)}
                          required
                        />
                      </label>

                      <label>
                        Location name
                        <input
                          value={stop.locationName}
                          onChange={(e) => updateStop(index, 'locationName', e.target.value)}
                          required
                        />
                      </label>

                      <label>
                        Address (optional)
                        <input
                          value={stop.address}
                          onChange={(e) => updateStop(index, 'address', e.target.value)}
                        />
                      </label>

                      <label>
                        Landmark
                        <input value={stop.landmark} onChange={(e) => updateStop(index, 'landmark', e.target.value)} />
                      </label>

                      <label>
                        Arrival offset (minutes)
                        <input type="number" min="0" value={stop.arrivalOffsetMinutes} onChange={(e) => updateStop(index, 'arrivalOffsetMinutes', Number(e.target.value))} />
                      </label>

                      <label>
                        Departure offset (minutes)
                        <input type="number" min={stop.arrivalOffsetMinutes} value={stop.departureOffsetMinutes} onChange={(e) => updateStop(index, 'departureOffsetMinutes', Number(e.target.value))} />
                      </label>

                      <label>
                        Latitude
                        <input type="number" step="any" min="-90" max="90" value={stop.latitude} onChange={(e) => updateStop(index, 'latitude', e.target.value)} />
                      </label>

                      <label>
                        Longitude
                        <input type="number" step="any" min="-180" max="180" value={stop.longitude} onChange={(e) => updateStop(index, 'longitude', e.target.value)} />
                      </label>

                      <label>
                        Stop contact
                        <input value={stop.contactNumber} onChange={(e) => updateStop(index, 'contactNumber', e.target.value)} />
                      </label>

                      <label className="route-stops-wide-field">
                        Driver instructions
                        <input value={stop.instructions} onChange={(e) => updateStop(index, 'instructions', e.target.value)} />
                      </label>

                    </div>

                    <div className="route-stops-row-flags">

                      <label>
                        <input
                          type="checkbox"
                          checked={stop.isBoardingAllowed}
                          onChange={(e) => updateStop(index, 'isBoardingAllowed', e.target.checked)}
                        />
                        Boarding
                      </label>

                      <label>
                        <input
                          type="checkbox"
                          checked={stop.isDroppingAllowed}
                          onChange={(e) => updateStop(index, 'isDroppingAllowed', e.target.checked)}
                        />
                        Dropping
                      </label>

                      <button
                        type="button"
                        className="route-stops-remove"
                        disabled={stopsForm.length <= 2}
                        onClick={() => removeStopRow(index)}
                        aria-label="Remove stop"
                      >
                        <IonIcon icon={trashOutline} />
                      </button>

                    </div>

                  </div>
                ))}

              </div>

              <button
                type="button"
                className="route-stops-add"
                onClick={addStopRow}
              >
                <IonIcon icon={addOutline} />
                Add stop
              </button>

              <div className="route-stops-actions">

                <button type="button" onClick={closeStops}>
                  Cancel
                </button>

                <button
                  type="submit"
                  className="route-stops-save"
                  disabled={stopsBusy}
                >
                  <IonIcon icon={saveOutline} />
                  {stopsBusy ? 'Saving…' : 'Save points'}
                </button>

              </div>

            </form>
          </div>
        )}

      </div>

    </IonPage>
  );
}
