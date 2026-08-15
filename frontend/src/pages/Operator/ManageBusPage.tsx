import { useEffect, useMemo, useState } from 'react';
import {
  IonAlert,
  IonContent,
  IonIcon,
  IonPage,
  IonToast,
} from '@ionic/react';

import {
  alertCircleOutline,
  arrowBackOutline,
  busOutline,
  calendarOutline,
  checkmarkCircleOutline,
  documentTextOutline,
  gridOutline,
  powerOutline,
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
  original_file_name?: string;
  verification_status?: string;
  rejection_reason?: string;
}

interface BusData {
  id: string;

  name?: string;
  bus_name?: string;

  registration_number?: string;

  status?: string;
  operational_status?: string;
  approval_status?: string;

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
  const [resubmitBusy, setResubmitBusy] =
    useState(false);
  const [lifecycleBusy, setLifecycleBusy] =
    useState(false);

  const [confirmLifecycle, setConfirmLifecycle] =
    useState(false);

  const [toastMessage, setToastMessage] =
    useState('');

  const [toastColor, setToastColor] =
    useState<'success' | 'danger'>('success');

  const [blockingTrips, setBlockingTrips] =
    useState<any[]>([]);

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

  const resubmitBusForReview = async () => {
    if (!bus || resubmitBusy) return;

    try {
      setResubmitBusy(true);
      setError('');

      const response = await fetch(
        `${API}/buses/${encodeURIComponent(bus.id)}/resubmit`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const text = await response.text();
      let body: any = {};
      try {
        body = text ? JSON.parse(text) : {};
      } catch {
        body = {};
      }

      if (!response.ok || body.success === false) {
        throw new Error(
          body.message || 'Unable to resubmit this bus.'
        );
      }

      setBus((current) =>
        current
          ? {
              ...current,
              ...body.bus,
              status: 'PENDING_APPROVAL',
              approval_status: 'PENDING_APPROVAL',
              operational_status: 'INACTIVE',
              rejection_reason: undefined,
            }
          : current
      );

      setToastColor('success');
      setToastMessage(
        body.message || 'Bus resubmitted for administrator verification.'
      );
    } catch (cause) {
      const message =
        cause instanceof Error
          ? cause.message
          : 'Unable to resubmit this bus.';
      setError(message);
      setToastColor('danger');
      setToastMessage(message);
    } finally {
      setResubmitBusy(false);
    }
  };
  const previewDocument = async (documentId: string) => {
    try {
      setError('');
      const response = await fetch(
        `${API}/buses/${encodeURIComponent(busId)}/documents/${encodeURIComponent(documentId)}/operator-file`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (!response.ok) {
        const contentType = response.headers.get('content-type') || '';
        const body = contentType.includes('application/json')
          ? await response.json()
          : { message: await response.text() };
        throw new Error(body.message || 'Unable to open document.');
      }
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const opened = window.open(objectUrl, '_blank', 'noopener,noreferrer');
      if (!opened) {
        URL.revokeObjectURL(objectUrl);
        throw new Error('Popup was blocked. Allow popups to preview this document.');
      }
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Unable to open document.';
      setError(message);
      setToastColor('danger');
      setToastMessage(message);
    }
  };
  const changeLifecycleStatus = async () => {
    if (!bus || lifecycleBusy) return;

    const currentStatus = String(
      bus.operational_status ||
        bus.status ||
        'INACTIVE'
    ).toUpperCase();

    const nextStatus =
      currentStatus === 'ACTIVE'
        ? 'INACTIVE'
        : 'ACTIVE';

    try {
      setLifecycleBusy(true);
      setError('');
      setBlockingTrips([]);

      const response = await fetch(
        `${API}/buses/${encodeURIComponent(
          bus.id
        )}/operational-status`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            ...(token
              ? {
                  Authorization: `Bearer ${token}`,
                }
              : {}),
          },
          body: JSON.stringify({
            status: nextStatus,
          }),
        }
      );

      const text = await response.text();
      let body: any = {};

      try {
        body = text ? JSON.parse(text) : {};
      } catch {
        body = {};
      }

      if (!response.ok || body.success === false) {
        if (
          body.code === 'BUS_HAS_ACTIVE_TRIPS' &&
          Array.isArray(body.blockingTrips)
        ) {
          setBlockingTrips(body.blockingTrips);
        }

        throw new Error(
          body.message ||
            'Unable to change bus status.'
        );
      }

      setBus((current) =>
        current
          ? {
              ...current,
              ...body.bus,
              status:
                body.bus?.status ||
                nextStatus,
              operational_status:
                body.bus?.operational_status ||
                nextStatus,
            }
          : current
      );

      setToastColor('success');
      setToastMessage(
        body.message ||
          (nextStatus === 'ACTIVE'
            ? 'Bus activated successfully.'
            : 'Bus deactivated successfully.')
      );
    } catch (cause) {
      const message =
        cause instanceof Error
          ? cause.message
          : 'Unable to change bus status.';

      setError(message);
      setToastColor('danger');
      setToastMessage(message);
    } finally {
      setLifecycleBusy(false);
      setConfirmLifecycle(false);
    }
  };
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

  const approvalStatus =
    String(
      bus?.approval_status ||
        (bus?.status === 'PENDING' ||
        bus?.status === 'REJECTED'
          ? bus?.status
          : 'APPROVED')
    ).toUpperCase();

  const status =
    String(
      bus?.operational_status ||
        bus?.status ||
        'INACTIVE'
    ).toUpperCase();

  const canCreateTrip =
    approvalStatus === 'APPROVED' &&
    status === 'ACTIVE';

  const canChangeLifecycle =
    approvalStatus === 'APPROVED';

  const nextLifecycleStatus =
    status === 'ACTIVE'
      ? 'INACTIVE'
      : 'ACTIVE';

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

                        {blockingTrips.length > 0 && (
              <div className="manage-bus-blocking-trips">
                <strong>
                  Deactivation blocked by active trips
                </strong>
                <p>
                  Reassign or cancel these trips first:
                </p>
                <ul>
                  {blockingTrips.map((trip) => (
                    <li key={trip.id}>
                      <span>
                        {trip.service_number ||
                          'Scheduled trip'}
                      </span>
                      <span>
                        {trip.departure_at
                          ? new Date(
                              trip.departure_at
                            ).toLocaleString('en-IN')
                          : label(trip.status)}
                      </span>
                    </li>
                  ))}
                </ul>
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
                    {approvalStatus === 'REJECTED' && (
                      <button
                        type="button"
                        className="manage-bus-resubmit-button"
                        disabled={resubmitBusy}
                        onClick={() => void resubmitBusForReview()}
                      >
                        {resubmitBusy
                          ? 'Resubmitting...'
                          : 'Resubmit for review'}
                      </button>
                    )}
                    <button
                      type="button"
                      className="manage-bus-renew-button"
                      onClick={() =>
                        history.push(
                          `/operator/buses/${encodeURIComponent(bus.id)}/compliance-renewal`
                        )
                      }
                    >
                      Renew compliance
                    </button>
                    <button
                      type="button"
                      className="manage-bus-edit-button"
                      onClick={() =>
                        history.push(
                          `/operator/buses/${encodeURIComponent(bus.id)}/edit`
                        )
                      }
                    >
                      Edit bus
                    </button>
                    <button
                      type="button"
                      className={`manage-bus-lifecycle-button ${
                        status === 'ACTIVE'
                          ? 'deactivate'
                          : 'activate'
                      }`}
                      disabled={
                        lifecycleBusy ||
                        !canChangeLifecycle
                      }
                      onClick={() =>
                        setConfirmLifecycle(true)
                      }
                      title={
                        !canChangeLifecycle
                          ? 'Bus must be approved before changing operational status.'
                          : undefined
                      }
                    >
                      <IonIcon icon={powerOutline} />
                      <span>
                        {lifecycleBusy
                          ? 'Updating...'
                          : status === 'ACTIVE'
                            ? 'Deactivate bus'
                            : 'Activate bus'}
                      </span>
                    </button>
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
                          'Trips can be created after administrator approval and operator activation.'}
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
                        <IonIcon icon={documentTextOutline} />
                      </div>
                      <div>
                        <h3>Documents & photos</h3>
                        <p>Files submitted for administrator verification</p>
                      </div>
                    </div>

                    {Array.isArray(bus.documents) && bus.documents.length > 0 ? (
                      <div className="manage-bus-documents">
                        {bus.documents.map((document, index) => {
                          const verificationStatus = String(
                            document.verification_status || 'PENDING'
                          ).toUpperCase();

                          return (
                            <article key={document.id || index}>
                              <div className="manage-bus-document-icon">
                                <IonIcon icon={documentTextOutline} />
                              </div>

                              <div className="manage-bus-document-copy">
                                <strong>
                                  {label(
                                    document.document_type ||
                                      document.type ||
                                      `Document ${index + 1}`
                                  )}
                                </strong>
                                <span>
                                  {document.original_file_name ||
                                    document.file_name ||
                                    document.original_name ||
                                    'Uploaded file'}
                                </span>
                                <div className="manage-bus-document-meta">
                                  <em className={`status-${verificationStatus.toLowerCase()}`}>
                                    {label(verificationStatus)}
                                  </em>
                                  {document.rejection_reason && (
                                    <small>{document.rejection_reason}</small>
                                  )}
                                </div>
                              </div>

                              {document.id && (
                                <button
                                  type="button"
                                  className="manage-bus-document-view"
                                  onClick={() => void previewDocument(document.id as string)}
                                >
                                  View
                                </button>
                              )}
                            </article>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="manage-bus-empty">
                        <IonIcon icon={documentTextOutline} />
                        <div>
                          <strong>No documents</strong>
                          <p>No uploaded files were returned for this bus.</p>
                        </div>
                      </div>
                    )}
                  </section>
                </div>
              </>
            )}

          </main>
        <IonAlert
          isOpen={confirmLifecycle}
          onDidDismiss={() =>
            setConfirmLifecycle(false)
          }
          header={
            nextLifecycleStatus === 'ACTIVE'
              ? 'Activate this bus?'
              : 'Deactivate this bus?'
          }
          message={
            nextLifecycleStatus === 'ACTIVE'
              ? 'The bus will become available for eligible trip operations after all backend safety checks pass.'
              : 'The bus will be removed from customer search. Deactivation will be blocked if it has scheduled or running trips.'
          }
          buttons={[
            {
              text: 'Cancel',
              role: 'cancel',
            },
            {
              text:
                nextLifecycleStatus === 'ACTIVE'
                  ? 'Activate'
                  : 'Deactivate',
              role:
                nextLifecycleStatus === 'ACTIVE'
                  ? undefined
                  : 'destructive',
              handler: () => {
                void changeLifecycleStatus();
                return false;
              },
            },
          ]}
        />

        <IonToast
          isOpen={Boolean(toastMessage)}
          message={toastMessage}
          color={toastColor}
          duration={2800}
          position="top"
          onDidDismiss={() =>
            setToastMessage('')
          }
        />
        </IonContent>

      </div>
    </IonPage>
  );
}