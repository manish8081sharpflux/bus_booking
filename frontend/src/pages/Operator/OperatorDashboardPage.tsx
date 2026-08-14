import {
  IonIcon,
  IonPage,
} from '@ionic/react';

import {
  addOutline,
  busOutline,
  calendarOutline,
  cashOutline,
  peopleOutline,
  refreshOutline,
  statsChartOutline,
} from 'ionicons/icons';

import {
  Redirect,
  useHistory,
} from 'react-router-dom';

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import OperatorTopbar
  from '../../components/operator/OperatorTopbar';

import DashboardStatCard
  from '../../components/operator/DashboardStatCard';

import './OperatorDashboardPage.css';

interface StoredOperator {
  id?: string;
  operatorId?: string;

  operatorName?: string;
  displayName?: string;
  legalName?: string;
  name?: string;
}

interface OperatorBus {
  id: string;

  operator_id: string;

  registration_number: string;

  name: string;

  bus_type: string;

  manufacturer:
    string | null;

  model:
    string | null;

  manufacture_year:
    number | null;

  seat_capacity: number;

  deck_type:
    string | null;

  amenities: string[];

  status: string;

  created_at: string;

  updated_at: string;
}

interface BusListResponse {
  success: boolean;

  count?: number;

  buses?: OperatorBus[];

  message?: string;
}

const OPERATOR_API_BASE_URL =
  'http://localhost:4600';

const formatBusType = (
  value: string,
) => {
  switch (value) {
    case 'AC_SEATER':
      return 'AC Seater';

    case 'NON_AC_SEATER':
      return 'Non-AC Seater';

    case 'AC_SLEEPER':
      return 'AC Sleeper';

    case 'NON_AC_SLEEPER':
      return 'Non-AC Sleeper';

    case 'AC_SEATER_SLEEPER':
      return 'AC Seater + Sleeper';

    default:
      return value
        ? value
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
            )
        : '-';
  }
};

const formatDeckType = (
  value:
    string | null,
) => {
  switch (value) {
    case 'SINGLE':
      return 'Single Deck';

    case 'DOUBLE':
      return 'Upper + Lower';

    default:
      return '-';
  }
};

const getStatusClassName = (
  status: string,
) => {
  switch (status) {
    case 'ACTIVE':
      return (
        'operator-status active'
      );

    case 'DRAFT':
      return (
        'operator-status draft'
      );

    case 'PENDING_VERIFICATION':
      return (
        'operator-status pending'
      );

    case 'REJECTED':
      return (
        'operator-status rejected'
      );

    default:
      return (
        'operator-status inactive'
      );
  }
};

const OperatorDashboardPage:
React.FC = () => {
  const history =
    useHistory();

  const token =
    localStorage.getItem(
      'operator_access_token',
    );

  const [
    buses,
    setBuses,
  ] =
    useState<
      OperatorBus[]
    >([]);

  const [
    loading,
    setLoading,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState('');

  if (!token) {
    return (
      <Redirect
        to="/operator"
      />
    );
  }

  const operator =
    useMemo<
      StoredOperator | null
    >(() => {
      try {
        const raw =
          localStorage.getItem(
            'operator',
          );

        if (!raw) {
          return null;
        }

        return JSON.parse(
          raw,
        );
      } catch {
        return null;
      }
    }, []);

  const operatorId =
    operator?.id ??
    operator?.operatorId ??
    null;

  const operatorName =
    operator?.operatorName ??
    operator?.displayName ??
    operator?.legalName ??
    operator?.name ??
    'Bus Operator';

  const loadBuses =
    useCallback(
      async () => {
        if (!operatorId) {
          setError(
            'Operator information was not found.',
          );

          return;
        }

        try {
          setLoading(
            true,
          );

          setError('');

          const response =
            await fetch(
              `${OPERATOR_API_BASE_URL}/buses?operatorId=${encodeURIComponent(
                operatorId,
              )}`,
              {
                headers: {
                  Authorization:
                    `Bearer ${token}`,
                },
              },
            );

          const json =
            await response.json() as
              BusListResponse;

          if (
            !response.ok ||
            !json.success
          ) {
            throw new Error(
              json.message ||
                'Unable to load buses.',
            );
          }

          setBuses(
            Array.isArray(
              json.buses,
            )
              ? json.buses
              : [],
          );
        } catch (
          err
        ) {
          setError(
            err instanceof Error
              ? err.message
              : 'Unable to load buses.',
          );
        } finally {
          setLoading(
            false,
          );
        }
      },
      [
        operatorId,
        token,
      ],
    );

  useEffect(() => {
    void loadBuses();
  }, [loadBuses]);

  const totalBuses =
    buses.length;

  const activeBuses =
    buses.filter(
      (
        bus,
      ) =>
        bus.status ===
        'ACTIVE',
    ).length;

  const draftBuses =
    buses.filter(
      (
        bus,
      ) =>
        bus.status ===
        'DRAFT',
    ).length;

  const todaysBookings = 0;

  const todaysRevenue = 0;

  const occupancy:
    number | null =
    null;

  const latestBuses =
    buses.slice(
      0,
      4,
    );

  const logout = () => {
    localStorage.removeItem(
      'operator_access_token',
    );

    localStorage.removeItem(
      'operator',
    );

    localStorage.removeItem(
      'add_bus_draft',
    );

    localStorage.removeItem(
      'add_bus_seat_layout',
    );

    localStorage.removeItem(
      'add_bus_amenities',
    );

    localStorage.removeItem(
      'add_bus_compliance',
    );

    localStorage.removeItem(
      'add_bus_document_metadata',
    );

    delete (
      window as any
    ).addBusFiles;

    history.replace(
      '/operator',
    );
  };

  const clearBusDraft = () => {
    localStorage.removeItem(
      'add_bus_draft',
    );

    localStorage.removeItem(
      'add_bus_seat_layout',
    );

    localStorage.removeItem(
      'add_bus_amenities',
    );

    localStorage.removeItem(
      'add_bus_compliance',
    );

    localStorage.removeItem(
      'add_bus_document_metadata',
    );

    delete (
      window as any
    ).addBusFiles;
  };

  const goToAddBus = () => {
    clearBusDraft();

    history.push(
      '/operator/buses/add',
    );
  };

  const goToBuses = () => {
    history.push(
      '/operator/buses',
    );
  };

  const goToBusDetails = (
    busId: string,
  ) => {
    history.push(
      `/operator/buses/${busId}`,
    );
  };

  const goToCreateTrip = (
    busId?: string,
  ) => {
    if (busId) {
      history.push(
        `/operator/trips/create?busId=${encodeURIComponent(
          busId,
        )}`,
      );

      return;
    }

    history.push(
      '/operator/trips/create',
    );
  };

  const goToInventory = () => {
    history.push(
      '/operator/trips/inventory',
    );
  };

  return (
    <IonPage>

      <div className="operator-dashboard">

        <OperatorTopbar
          operatorName={
            operatorName
          }
          onLogout={
            logout
          }
        />

        <main className="operator-dashboard-main">

          <div className="operator-dashboard-container">

            <div className="operator-breadcrumb">

              <span>
                Console
              </span>

              <span>
                /
              </span>

              <span className="operator-breadcrumb-current">
                Dashboard
              </span>

            </div>

            <div className="operator-dashboard-header">

              <div>

                <h1 className="operator-dashboard-title">
                  Dashboard
                </h1>

                <p className="operator-dashboard-subtitle">
                  Fleet performance,
                  live trips and today's
                  seat sales.
                </p>

              </div>

              <div className="operator-dashboard-actions">

                <button
                  type="button"
                  className="operator-action-button"
                  disabled={
                    loading
                  }
                  onClick={() =>
                    void loadBuses()
                  }
                >
                  <IonIcon
                    icon={
                      refreshOutline
                    }
                  />

                  Refresh
                </button>

                <button
                  type="button"
                  className="operator-action-button"
                  onClick={() =>
                    goToCreateTrip()
                  }
                >
                  <IonIcon
                    icon={
                      calendarOutline
                    }
                  />

                  Schedule Trip
                </button>

                <button
                  type="button"
                  className="operator-action-button primary"
                  onClick={
                    goToAddBus
                  }
                >
                  <IonIcon
                    icon={
                      addOutline
                    }
                  />

                  Add Bus
                </button>

              </div>

            </div>

            {error && (
              <div className="operator-dashboard-error">
                {error}
              </div>
            )}

            <div className="operator-stats-grid">

              <DashboardStatCard
                title="Buses in fleet"
                value={
                  totalBuses
                }
                subtitle={
                  `${activeBuses} active • ${draftBuses} draft`
                }
                icon={
                  busOutline
                }
                variant="bus"
                loading={
                  loading
                }
                onClick={
                  goToBuses
                }
              />

              <DashboardStatCard
                title="Bookings"
                value={
                  todaysBookings
                }
                subtitle="Today"
                icon={
                  peopleOutline
                }
                variant="booking"
              />

              <DashboardStatCard
                title="Revenue"
                value={
                  `₹${todaysRevenue.toLocaleString(
                    'en-IN',
                  )}`
                }
                subtitle="Today's confirmed bookings"
                icon={
                  cashOutline
                }
                variant="revenue"
              />

              <DashboardStatCard
                title="Occupancy"
                value={
                  occupancy ===
                  null
                    ? '--'
                    : `${occupancy}%`
                }
                subtitle="Seats sold"
                icon={
                  statsChartOutline
                }
                variant="occupancy"
              />

            </div>

            <section className="operator-panel">

              <div className="operator-panel-header">

                <div>

                  <h2 className="operator-panel-title">
                    Fleet
                  </h2>

                  <p className="operator-panel-description">
                    Your recently registered buses.
                  </p>

                </div>

                <button
                  type="button"
                  className="operator-panel-link"
                  onClick={
                    goToBuses
                  }
                >
                  View all buses
                </button>

              </div>

              {!loading &&
                buses.length ===
                  0 && (
                <div className="operator-empty-state">

                  <h3>
                    No buses yet
                  </h3>

                  <p>
                    Add your first bus to start operations.
                  </p>

                  <button
                    type="button"
                    className="operator-action-button primary"
                    onClick={
                      goToAddBus
                    }
                    style={{
                      marginTop:
                        '16px',
                    }}
                  >
                    Add Bus
                  </button>

                </div>
              )}

              {buses.length >
                0 && (
                <div className="operator-bus-list">

                  {latestBuses.map(
                    (
                      bus,
                    ) => (
                      <div
                        key={
                          bus.id
                        }
                        className="operator-bus-row"
                      >

                        <div className="operator-bus-info">

                          <div className="operator-bus-icon">
                            <IonIcon
                              icon={
                                busOutline
                              }
                            />
                          </div>

                          <div>

                            <div className="operator-bus-name-row">

                              <h3 className="operator-bus-name">
                                {
                                  bus.name
                                }
                              </h3>

                              <span
                                className={
                                  getStatusClassName(
                                    bus.status,
                                  )
                                }
                              >
                                {
                                  bus.status
                                }
                              </span>

                            </div>

                            <p className="operator-bus-registration">
                              {
                                bus.registration_number
                              }
                            </p>

                            <div className="operator-bus-meta">

                              <span>
                                {formatBusType(
                                  bus.bus_type,
                                )}
                              </span>

                              <span>
                                {
                                  bus.seat_capacity
                                }
                                {' '}
                                Seats
                              </span>

                              <span>
                                {formatDeckType(
                                  bus.deck_type,
                                )}
                              </span>

                            </div>

                          </div>

                        </div>

                        <div className="operator-bus-actions">

                          <button
                            type="button"
                            className="operator-small-button"
                            onClick={() =>
                              goToBusDetails(
                                bus.id,
                              )
                            }
                          >
                            Manage
                          </button>

                          <button
                            type="button"
                            className="operator-small-button primary"
                            disabled={
                              bus.status !==
                              'ACTIVE'
                            }
                            onClick={() =>
                              goToCreateTrip(
                                bus.id,
                              )
                            }
                          >
                            Create Trip
                          </button>

                        </div>

                      </div>
                    ),
                  )}

                </div>
              )}

            </section>

            <div className="operator-analytics-grid">

              <section className="operator-analytics-card">

                <h2 className="operator-analytics-title">
                  Revenue this week
                </h2>

                <p className="operator-analytics-subtitle">
                  Confirmed bookings by day
                </p>

                <div className="operator-chart">

                  {[
                    22,
                    35,
                    28,
                    48,
                    41,
                    60,
                    52,
                  ].map(
                    (
                      height,
                      index,
                    ) => (
                      <div
                        key={
                          index
                        }
                        className="operator-chart-column"
                      >
                        <div
                          className="operator-chart-bar"
                          style={{
                            height:
                              `${height}%`,
                          }}
                        />
                      </div>
                    ),
                  )}

                </div>

                <p className="operator-placeholder-note">
                  Revenue analytics will appear here
                  when the dashboard API is connected.
                </p>

              </section>

              <section className="operator-analytics-card">

                <h2 className="operator-analytics-title">
                  Seats sold by route
                </h2>

                <p className="operator-analytics-subtitle">
                  Route occupancy overview
                </p>

                <div className="operator-route-list">

                  <RouteProgress
                    label="Pune → Mumbai"
                    value={0}
                  />

                  <RouteProgress
                    label="Pune → Gurgaon"
                    value={0}
                  />

                  <RouteProgress
                    label="Other routes"
                    value={0}
                  />

                </div>

                <button
                  type="button"
                  className="operator-action-button"
                  onClick={
                    goToInventory
                  }
                  style={{
                    width:
                      '100%',
                    marginTop:
                      '24px',
                  }}
                >
                  View Trip Inventory
                </button>

              </section>

            </div>

          </div>

        </main>

      </div>

    </IonPage>
  );
};

interface RouteProgressProps {
  label: string;
  value: number;
}

const RouteProgress:
React.FC<RouteProgressProps> = ({
  label,
  value,
}) => {
  return (
    <div className="operator-route-item">

      <div className="operator-route-header">

        <span className="operator-route-name">
          {label}
        </span>

        <span className="operator-route-value">
          {value}%
        </span>

      </div>

      <div className="operator-route-track">

        <div
          className="operator-route-progress"
          style={{
            width:
              `${value}%`,
          }}
        />

      </div>

    </div>
  );
};

export default OperatorDashboardPage;