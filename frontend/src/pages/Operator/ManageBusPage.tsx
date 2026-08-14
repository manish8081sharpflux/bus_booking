import { useEffect, useMemo, useState } from 'react';
import {
  IonContent,
  IonIcon,
  IonPage,
} from '@ionic/react';

import {
  alertCircleOutline,
  arrowBackOutline,
  busOutline,
  calendarOutline,
  checkmarkCircleOutline,
  documentTextOutline,
  gridOutline,
  refreshOutline,
  shieldCheckmarkOutline,
} from 'ionicons/icons';

import {
  Redirect,
  useHistory,
  useParams,
} from 'react-router-dom';

import OperatorSidebar from '../../components/operator/OperatorSidebar';
import './ManageBusPage.css';

const API =
  import.meta.env.VITE_OPERATOR_API_URL ||
  'http://localhost:4000/api';

/* ============================================================
   HELPERS
============================================================ */

const label = (value: unknown) => {
  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return 'Not provided';
  }

  return String(value)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
};

const date = (value: unknown) => {
  if (!value) return 'Not provided';

  const parsed = new Date(String(value));

  return Number.isNaN(parsed.getTime())
    ? String(value)
    : parsed.toLocaleDateString('en-IN');
};

const isDateField = (key: string) =>
  key.toLowerCase().includes('date') ||
  key.toLowerCase().includes('expiry') ||
  key.toLowerCase().includes('valid_until');

/* ============================================================
   TYPES
============================================================ */

interface BusDocument {
  id?: string;
  document_type?: string;
  type?: string;
  file_name?: string;
  original_name?: string;
  file_url?: string;
  url?: string;
}

interface BusData {
  id: string;

  name?: string;
  bus_name?: string;

  registration_number?: string;

  status?: string;

  bus_type?: string;
  ac_type?: string;
  seating_type?: string;
  seat_layout?: string;
  layout_type?: string;
  deck_type?: string;

  manufacturer?: string;
  model?: string;
  manufacturing_year?: number | string;

  seat_capacity?: number;
  total_seats?: number;

  seats?: unknown[];

  amenities?: unknown[];

  documents?: BusDocument[];

  compliance?: Record<string, unknown>;

  rejection_reason?: string;
  review_reason?: string;
}

/* ============================================================
   SMALL COMPONENTS
============================================================ */

function StatCard({
  icon,
  value,
  labelText,
  variant,
}: {
  icon: string;
  value: number | string;
  labelText: string;
  variant?: 'pink' | 'blue' | 'green';
}) {
  return (
    <article className="manage-bus-stat">
      <div
        className={`manage-bus-stat-icon ${
          variant || 'pink'
        }`}
      >
        <IonIcon icon={icon} />
      </div>

      <div className="manage-bus-stat-copy">
        <strong>{value}</strong>
        <span>{labelText}</span>
      </div>
    </article>
  );
}

function InfoTile({
  labelText,
  value,
}: {
  labelText: string;
  value: unknown;
}) {
  return (
    <div className="manage-bus-info-tile">
      <span>{labelText}</span>
      <strong>{label(value)}</strong>
    </div>
  );
}

function ManageBusLoading() {
  return (
    <div className="manage-bus-loading">
      <div className="manage-bus-loading-card">
        <div className="manage-bus-skeleton avatar" />

        <div className="manage-bus-loading-copy">
          <div className="manage-bus-skeleton title" />
          <div className="manage-bus-skeleton line" />
          <div className="manage-bus-skeleton short" />
        </div>
      </div>

      <div className="manage-bus-loading-stats">
        <div className="manage-bus-skeleton block" />
        <div className="manage-bus-skeleton block" />
        <div className="manage-bus-skeleton block" />
      </div>
    </div>
  );
}

/* ============================================================
   PAGE
============================================================ */

export default function ManageBusPage() {
  const history = useHistory();

  const { busId } = useParams<{
    busId: string;
  }>();

  const token =
    localStorage.getItem(
      'operator_access_token'
    ) || '';

  const [bus, setBus] =
    useState<BusData | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState('');

  /* ==========================================================
     LOAD BUS
  ========================================================== */

  const load = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await fetch(
        `${API}/buses/${encodeURIComponent(
          busId
        )}`,
        {
          headers: token
            ? {
                Authorization: `Bearer ${token}`,
              }
            : {},
        }
      );

      const text = await response.text();

      let body: any = {};

      try {
        body = text
          ? JSON.parse(text)
          : {};
      } catch {
        body = {};
      }

      if (
        !response.ok ||
        body.success === false
      ) {
        throw new Error(
          body.message ||
            'Unable to load this bus.'
        );
      }

      setBus(body.bus);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Unable to load this bus.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busId]);

  /* ==========================================================
     DERIVED DATA
  ========================================================== */

  const stats = useMemo(() => {
    const seats = Array.isArray(bus?.seats)
      ? bus?.seats
      : [];

    const documents = Array.isArray(
      bus?.documents
    )
      ? bus?.documents
      : [];

    const amenities = Array.isArray(
      bus?.amenities
    )
      ? bus?.amenities
      : [];

    return {
      seats:
        seats.length ||
        bus?.seat_capacity ||
        bus?.total_seats ||
        0,

      documents: documents.length,

      amenities: amenities.length,
    };
  }, [bus]);

  /* ==========================================================
     AUTH
  ========================================================== */

  if (!token) {
    return (
      <Redirect to="/operator" />
    );
  }

  const busName =
    bus?.name ||
    bus?.bus_name ||
    'Manage bus';

  const status =
    String(
      bus?.status || 'PENDING'
    ).toUpperCase();

  const canCreateTrip =
    status === 'ACTIVE';

  /* ==========================================================
     RENDER
  ========================================================== */

  return (
    <IonPage>
      <div className="manage-bus-shell">

        {/* ================= SIDEBAR ================= */}

        <OperatorSidebar />

        {/* ================= SCROLL AREA ================= */}

        <IonContent
          fullscreen
          scrollY={true}
          className="manage-bus-content"
        >
          <main className="manage-bus-main">

            {/* ================= HEADER ================= */}

            <header className="manage-bus-header">
              <div className="manage-bus-header-left">

                <button
                  type="button"
                  className="manage-bus-back"
                  onClick={() =>
                    history.push(
                      '/operator/buses'
                    )
                  }
                  aria-label="Back to buses"
                >
                  <IonIcon
                    icon={
                      arrowBackOutline
                    }
                  />
                </button>

                <div className="manage-bus-heading">
                  <span className="manage-bus-breadcrumb">
                    Operator Console / Buses /
                    Manage
                  </span>

                  <h1>
                    {loading && !bus
                      ? 'Loading bus...'
                      : busName}
                  </h1>

                  <p>
                    Review fleet details,
                    seat configuration,
                    compliance documents and
                    service readiness.
                  </p>
                </div>
              </div>

              <button
                type="button"
                className="manage-bus-refresh"
                onClick={() =>
                  void load()
                }
                disabled={loading}
              >
                <IonIcon
                  icon={refreshOutline}
                />

                <span>
                  {loading
                    ? 'Refreshing...'
                    : 'Refresh'}
                </span>
              </button>
            </header>

            {/* ================= ERROR ================= */}

            {error && (
              <div className="manage-bus-error">
                <div>
                  <IonIcon
                    icon={
                      alertCircleOutline
                    }
                  />

                  <span>{error}</span>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    void load()
                  }
                >
                  Try again
                </button>
              </div>
            )}

            {/* ================= LOADING ================= */}

            {loading && !bus && (
              <ManageBusLoading />
            )}

            {/* ================= CONTENT ================= */}

            {bus && (
              <>
                {/* ======================================
                    HERO
                ====================================== */}

                <section className="manage-bus-hero">

                  <div className="manage-bus-hero-left">

                    <div className="manage-bus-avatar">
                      <IonIcon
                        icon={busOutline}
                      />
                    </div>

                    <div className="manage-bus-identity">

                      <div className="manage-bus-name-row">
                        <h2>
                          {busName}
                        </h2>

                        <span
                          className={`manage-bus-status ${status.toLowerCase()}`}
                        >
                          {label(status)}
                        </span>
                      </div>

                      <strong className="manage-bus-registration">
                        {bus.registration_number ||
                          'Registration not provided'}
                      </strong>

                      <div className="manage-bus-tags">

                        {bus.ac_type && (
                          <span>
                            {label(
                              bus.ac_type
                            )}
                          </span>
                        )}

                        {bus.seating_type && (
                          <span>
                            {label(
                              bus.seating_type
                            )}
                          </span>
                        )}

                        {!bus.ac_type &&
                          !bus.seating_type &&
                          bus.bus_type && (
                            <span>
                              {label(
                                bus.bus_type
                              )}
                            </span>
                          )}

                        {bus.deck_type && (
                          <span>
                            {label(
                              bus.deck_type
                            )}
                          </span>
                        )}

                      </div>
                    </div>
                  </div>

                  <div className="manage-bus-hero-actions">
                    <button
                      type="button"
                      className="manage-bus-trip-button"
                      disabled={
                        !canCreateTrip
                      }
                      onClick={() =>
                        history.push(
                          `/operator/trips/create?busId=${encodeURIComponent(
                            bus.id
                          )}`
                        )
                      }
                    >
                      <IonIcon
                        icon={
                          calendarOutline
                        }
                      />

                      Create trip
                    </button>
                  </div>
                </section>

                {/* ======================================
                    VERIFICATION NOTICE
                ====================================== */}

                {!canCreateTrip && (
                  <div className="manage-bus-notice">

                    <div className="manage-bus-notice-icon">
                      <IonIcon
                        icon={
                          shieldCheckmarkOutline
                        }
                      />
                    </div>

                    <div>
                      <strong>
                        {status ===
                        'REJECTED'
                          ? 'Verification requires changes'
                          : 'Bus verification in progress'}
                      </strong>

                      <p>
                        {bus.rejection_reason ||
                          bus.review_reason ||
                          'Trips can be created after an administrator activates this bus.'}
                      </p>
                    </div>

                  </div>
                )}

                {/* ======================================
                    STATS
                ====================================== */}

                <section className="manage-bus-stats">

                  <StatCard
                    icon={gridOutline}
                    value={
                      stats.seats
                    }
                    labelText="Configured seats"
                    variant="pink"
                  />

                  <StatCard
                    icon={
                      documentTextOutline
                    }
                    value={
                      stats.documents
                    }
                    labelText="Uploaded files"
                    variant="blue"
                  />

                  <StatCard
                    icon={
                      checkmarkCircleOutline
                    }
                    value={
                      stats.amenities
                    }
                    labelText="Amenities"
                    variant="green"
                  />

                </section>

                {/* ======================================
                    MAIN GRID
                ====================================== */}

                <div className="manage-bus-grid">

                  {/* VEHICLE DETAILS */}

                  <section className="manage-bus-card">

                    <div className="manage-bus-card-title">

                      <div className="manage-bus-card-icon pink">
                        <IonIcon
                          icon={
                            busOutline
                          }
                        />
                      </div>

                      <div>
                        <h3>
                          Vehicle details
                        </h3>

                        <p>
                          Registration,
                          configuration and
                          classification
                        </p>
                      </div>

                    </div>

                    <dl className="manage-bus-details-list">

                      <div>
                        <dt>
                          Registration
                          number
                        </dt>

                        <dd>
                          {bus.registration_number ||
                            'Not provided'}
                        </dd>
                      </div>

                      <div>
                        <dt>
                          AC type
                        </dt>

                        <dd>
                          {label(
                            bus.ac_type
                          )}
                        </dd>
                      </div>

                      <div>
                        <dt>
                          Seating type
                        </dt>

                        <dd>
                          {label(
                            bus.seating_type ||
                              bus.bus_type
                          )}
                        </dd>
                      </div>

                      <div>
                        <dt>
                          Deck type
                        </dt>

                        <dd>
                          {label(
                            bus.deck_type
                          )}
                        </dd>
                      </div>

                      <div>
                        <dt>
                          Manufacturer
                        </dt>

                        <dd>
                          {label(
                            bus.manufacturer
                          )}
                        </dd>
                      </div>

                      <div>
                        <dt>
                          Model
                        </dt>

                        <dd>
                          {label(
                            bus.model
                          )}
                        </dd>
                      </div>

                      <div>
                        <dt>
                          Manufacturing
                          year
                        </dt>

                        <dd>
                          {bus.manufacturing_year ||
                            'Not provided'}
                        </dd>
                      </div>

                    </dl>
                  </section>

                  {/* SEAT CONFIGURATION */}

                  <section className="manage-bus-card">

                    <div className="manage-bus-card-title">

                      <div className="manage-bus-card-icon pink">
                        <IonIcon
                          icon={
                            gridOutline
                          }
                        />
                      </div>

                      <div>
                        <h3>
                          Seat configuration
                        </h3>

                        <p>
                          Layout and passenger
                          capacity
                        </p>
                      </div>

                    </div>

                    <div className="manage-bus-seat-grid">

                      <InfoTile
                        labelText="TOTAL CAPACITY"
                        value={`${stats.seats} seats`}
                      />

                      <InfoTile
                        labelText="SEATING TYPE"
                        value={
                          bus.seating_type ||
                          bus.bus_type
                        }
                      />

                      <InfoTile
                        labelText="AC TYPE"
                        value={
                          bus.ac_type
                        }
                      />

                      <InfoTile
                        labelText="DECK TYPE"
                        value={
                          bus.deck_type
                        }
                      />

                      <InfoTile
                        labelText="SEAT LAYOUT"
                        value={
                          bus.seat_layout ||
                          bus.layout_type
                        }
                      />

                      <InfoTile
                        labelText="STATUS"
                        value={status}
                      />

                    </div>
                  </section>

                  {/* COMPLIANCE */}

                  <section className="manage-bus-card full">

                    <div className="manage-bus-card-title">

                      <div className="manage-bus-card-icon green">
                        <IonIcon
                          icon={
                            shieldCheckmarkOutline
                          }
                        />
                      </div>

                      <div>
                        <h3>
                          Compliance
                        </h3>

                        <p>
                          Certificate and
                          validity information
                        </p>
                      </div>

                    </div>

                    {bus.compliance &&
                    Object.keys(
                      bus.compliance
                    ).length ? (
                      <div className="manage-bus-compliance-grid">

                        {Object.entries(
                          bus.compliance
                        )
                          .filter(
                            ([key]) =>
                              ![
                                'id',
                                'bus_id',
                                'created_at',
                                'updated_at',
                              ].includes(
                                key
                              )
                          )
                          .map(
                            ([
                              key,
                              value,
                            ]) => (
                              <div
                                className="manage-bus-compliance-item"
                                key={key}
                              >
                                <span>
                                  {label(
                                    key
                                  )}
                                </span>

                                <strong>
                                  {isDateField(
                                    key
                                  )
                                    ? date(
                                        value
                                      )
                                    : label(
                                        value
                                      )}
                                </strong>
                              </div>
                            )
                          )}

                      </div>
                    ) : (
                      <div className="manage-bus-empty">
                        <IonIcon
                          icon={
                            shieldCheckmarkOutline
                          }
                        />

                        <div>
                          <strong>
                            No compliance
                            details
                          </strong>

                          <p>
                            Compliance
                            information has not
                            been added for this
                            bus.
                          </p>
                        </div>
                      </div>
                    )}

                  </section>

                  {/* DOCUMENTS */}

                  <section className="manage-bus-card full">

                    <div className="manage-bus-card-title">

                      <div className="manage-bus-card-icon blue">
                        <IonIcon
                          icon={
                            documentTextOutline
                          }
                        />
                      </div>

                      <div>
                        <h3>
                          Documents & photos
                        </h3>

                        <p>
                          Files submitted for
                          administrator
                          verification
                        </p>
                      </div>

                    </div>

                    {Array.isArray(
                      bus.documents
                    ) &&
                    bus.documents.length >
                      0 ? (
                      <div className="manage-bus-documents">

                        {bus.documents.map(
                          (
                            document,
                            index
                          ) => {
                            const fileUrl =
                              document.file_url ||
                              document.url;

                            return (
                              <article
                                key={
                                  document.id ||
                                  index
                                }
                              >
                                <div className="manage-bus-document-icon">
                                  <IonIcon
                                    icon={
                                      documentTextOutline
                                    }
                                  />
                                </div>

                                <div className="manage-bus-document-copy">
                                  <strong>
                                    {label(
                                      document.document_type ||
                                        document.type ||
                                        `Document ${
                                          index +
                                          1
                                        }`
                                    )}
                                  </strong>

                                  <span>
                                    {document.file_name ||
                                      document.original_name ||
                                      'Uploaded file'}
                                  </span>
                                </div>

                                {fileUrl && (
                                  <a
                                    href={
                                      fileUrl
                                    }
                                    target="_blank"
                                    rel="noreferrer"
                                  >
                                    View
                                  </a>
                                )}

                              </article>
                            );
                          }
                        )}

                      </div>
                    ) : (
                      <div className="manage-bus-empty">
                        <IonIcon
                          icon={
                            documentTextOutline
                          }
                        />

                        <div>
                          <strong>
                            No documents
                          </strong>

                          <p>
                            No uploaded files
                            were returned for
                            this bus.
                          </p>
                        </div>
                      </div>
                    )}

                  </section>

                </div>
              </>
            )}

          </main>
        </IonContent>

      </div>
    </IonPage>
  );
}