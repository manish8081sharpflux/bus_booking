import { useEffect, useMemo, useState } from 'react';
import {
  Armchair,
  BusFront,
  Check,
  CheckCircle2,
  ChevronRight,
  FileCheck2,
  RefreshCw,
  ShieldCheck,
  Wifi,
  X,
} from 'lucide-react';
import * as authHelper from '@/auth/lib/helpers';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import './BusVerificationPage.css';

const API = import.meta.env.VITE_OPERATOR_API_URL || 'http://localhost:4000/api';

type Document = {
  id: string;
  document_type: string;
  original_file_name: string;
  verification_status: string;
};

type Bus = {
  id: string;
  name: string;
  registration_number: string;
  operator_name: string;
  bus_type: string;
  seat_capacity: number;
  configured_seats: number;
  amenities: string[];
  status: string;
  seats?: unknown[];
  compliance?: Record<string, unknown>;
  documents?: Document[];
};

async function call(path: string, options?: RequestInit) {
  const token = authHelper.getAuth()?.access_token;
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options?.headers || {}),
    },
  });

  const contentType = response.headers.get('content-type') || '';
  const body = contentType.includes('application/json') ? await response.json() : { message: await response.text() };

  if (!response.ok || body.success === false) {
    throw new Error(body.message || 'Request failed');
  }

  return body;
}

export function BusVerificationPage() {
  const [items, setItems] = useState<Bus[]>([]);
  const [selected, setSelected] = useState<Bus | null>(null);
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [confirmDecision, setConfirmDecision] = useState<'APPROVE' | 'REJECT' | null>(null);

  async function load() {
    try {
      setLoading(true);
      setMessage('');
      const body = await call('/buses/verification/pending');
      setItems(body.buses || []);
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function inspect(id: string) {
    try {
      setLoading(true);
      setMessage('');
      const body = await call(`/buses/${id}`);
      setSelected(body.bus);
      setReason('');
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function review(decision: 'APPROVE' | 'REJECT') {
    if (!selected) return;
    if (decision === 'REJECT' && !reason.trim()) {
      setMessage('Please enter a rejection reason before rejecting this bus.');
      setConfirmDecision(null);
      return;
    }

    try {
      setReviewing(true);
      setMessage('');
      await call(`/buses/${selected.id}/review`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision, reason: reason.trim() }),
      });
      setSelected(null);
      setReason('');
      setConfirmDecision(null);
      setMessage(decision === 'APPROVE' ? 'Bus approved and activated successfully.' : 'Bus rejected successfully.');
      await load();
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setReviewing(false);
    }
  }

  const configuredSeats = selected?.seats?.length || selected?.configured_seats || 0;
  const seatPercentage = selected ? Math.min(100, Math.round((configuredSeats / Math.max(selected.seat_capacity, 1)) * 100)) : 0;
  const documentCount = selected?.documents?.length || 0;

  const complianceEntries = useMemo(() => Object.entries(selected?.compliance || {}), [selected?.compliance]);

  return (
    <div className="verification-page">
      <header className="verification-page-header">
        <div>
          <span className="verification-eyebrow">BUS MANAGEMENT</span>
          <h1>Bus verification</h1>
          <p>Review vehicle details, seating, amenities, compliance and documents before activation.</p>
        </div>
        <button className="verification-refresh" onClick={() => void load()} disabled={loading} type="button">
          <RefreshCw className={loading ? 'verification-spin' : ''} />
          Refresh
        </button>
      </header>

      {message && <div className="verification-message">{message}</div>}

      <section className="verification-summary-grid">
        <SummaryCard icon={<ShieldCheck />} label="Pending verification" value={items.length} helper="Buses waiting for review" />
        <SummaryCard icon={<BusFront />} label="Selected bus" value={selected ? selected.name : '—'} helper={selected?.registration_number || 'Choose a bus from the queue'} />
        <SummaryCard icon={<Armchair />} label="Seat configuration" value={selected ? `${configuredSeats}/${selected.seat_capacity}` : '—'} helper={selected ? `${seatPercentage}% configured` : 'No bus selected'} />
        <SummaryCard icon={<FileCheck2 />} label="Documents" value={selected ? documentCount : '—'} helper={selected ? 'Uploaded documents' : 'No bus selected'} />
      </section>

      <div className="verification-workspace">
        <section className="verification-panel verification-queue-panel">
          <div className="verification-panel-header">
            <div><h2>Pending queue</h2><p>Select a bus to inspect.</p></div>
            <span className="verification-count-badge">{items.length}</span>
          </div>

          <div className="verification-queue-list">
            {loading && items.length === 0 ? (
              <div className="verification-empty">Loading pending buses…</div>
            ) : items.length === 0 ? (
              <div className="verification-empty">
                <CheckCircle2 />
                <h3>Queue is clear</h3>
                <p>No buses are waiting for verification.</p>
              </div>
            ) : items.map((bus) => (
              <button
                key={bus.id}
                type="button"
                onClick={() => void inspect(bus.id)}
                className={`verification-bus-row ${selected?.id === bus.id ? 'active' : ''}`}
              >
                <span className="verification-bus-icon"><BusFront /></span>
                <span className="verification-bus-copy">
                  <span className="verification-bus-title-line"><strong>{bus.name}</strong><em>Pending</em></span>
                  <span>{bus.registration_number} · {bus.operator_name}</span>
                  <small>{bus.bus_type} · {bus.configured_seats}/{bus.seat_capacity} seats</small>
                </span>
                <ChevronRight />
              </button>
            ))}
          </div>
        </section>

        <section className="verification-panel verification-review-panel">
          {!selected ? (
            <div className="verification-placeholder">
              <span><BusFront /></span>
              <h2>Select a bus to review</h2>
              <p>Choose a pending bus to see its complete verification information.</p>
            </div>
          ) : (
            <>
              <div className="verification-review-heading">
                <div>
                  <div className="verification-review-title"><h2>{selected.name}</h2><span>Pending verification</span></div>
                  <p>{selected.registration_number} · {selected.operator_name}</p>
                </div>
              </div>

              <ReviewSection title="Bus information">
                <div className="verification-info-grid">
                  <Info label="Registration number" value={selected.registration_number} />
                  <Info label="Operator" value={selected.operator_name} />
                  <Info label="Bus type" value={selected.bus_type} />
                  <Info label="Current status" value={selected.status} />
                </div>
              </ReviewSection>

              <ReviewSection title="Seat layout" trailing={`${configuredSeats}/${selected.seat_capacity} configured`}>
                <div className="verification-progress-head"><span>Configuration completeness</span><strong>{seatPercentage}%</strong></div>
                <div className="verification-progress-track"><span style={{ width: `${seatPercentage}%` }} /></div>
                <div className="verification-mini-grid">
                  <Info label="Capacity" value={selected.seat_capacity} />
                  <Info label="Configured" value={configuredSeats} />
                  <Info label="Remaining" value={Math.max(0, selected.seat_capacity - configuredSeats)} />
                </div>
              </ReviewSection>

              <ReviewSection title="Amenities">
                <div className="verification-chip-list">
                  {(selected.amenities || []).length ? selected.amenities.map((amenity) => (
                    <span key={amenity} className="verification-chip"><Wifi /><span>{amenity}</span></span>
                  )) : <p className="verification-muted">No amenities configured.</p>}
                </div>
              </ReviewSection>

              <ReviewSection title="Compliance">
                {complianceEntries.length ? (
                  <div className="verification-compliance-list">
                    {complianceEntries.map(([key, value]) => (
                      <div key={key}><span>{humanize(key)}</span><strong>{formatValue(value)}</strong></div>
                    ))}
                  </div>
                ) : <p className="verification-muted">No compliance information available.</p>}
              </ReviewSection>

              <ReviewSection title="Documents & photos" trailing={`${documentCount} uploaded`}>
                <div className="verification-doc-list">
                  {selected.documents?.length ? selected.documents.map((doc) => (
                    <div key={doc.id} className="verification-doc-row">
                      <span className="verification-doc-icon"><FileCheck2 /></span>
                      <span className="verification-doc-copy"><strong>{humanize(doc.document_type)}</strong><small>{doc.original_file_name}</small></span>
                      <span className={`verification-doc-status status-${doc.verification_status?.toLowerCase()}`}>{doc.verification_status}</span>
                    </div>
                  )) : <p className="verification-muted">No documents uploaded.</p>}
                </div>
              </ReviewSection>

              <ReviewSection title="Admin decision">
                <label className="verification-reason-label" htmlFor="verification-reason">Rejection reason <span>Required only when rejecting</span></label>
                <textarea
                  id="verification-reason"
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder="Explain why the bus should be rejected…"
                  className="verification-reason"
                />
              </ReviewSection>

              <div className="verification-actions">
                <button className="verification-reject" onClick={() => setConfirmDecision('REJECT')} disabled={reviewing} type="button"><X /> Reject bus</button>
                <button className="verification-approve" onClick={() => setConfirmDecision('APPROVE')} disabled={reviewing} type="button"><Check /> Approve & activate</button>
              </div>
            </>
          )}
        </section>
      </div>

      <AlertDialog open={confirmDecision !== null} onOpenChange={(open) => !open && setConfirmDecision(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmDecision === 'APPROVE' ? 'Approve this bus?' : 'Reject this bus?'}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDecision === 'APPROVE'
                ? `${selected?.name || 'This bus'} will be activated after approval.`
                : `This will reject ${selected?.name || 'this bus'} and keep it inactive.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={reviewing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant={confirmDecision === 'REJECT' ? 'destructive' : 'primary'}
              disabled={reviewing}
              onClick={(event) => {
                event.preventDefault();
                if (confirmDecision) void review(confirmDecision);
              }}
            >
              {reviewing ? 'Processing…' : confirmDecision === 'APPROVE' ? 'Approve & activate' : 'Reject bus'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function SummaryCard({ icon, label, value, helper }: { icon: React.ReactNode; label: string; value: React.ReactNode; helper: string }) {
  return <article className="verification-summary-card"><span className="verification-summary-icon">{icon}</span><div><span>{label}</span><strong>{value}</strong><small>{helper}</small></div></article>;
}

function ReviewSection({ title, trailing, children }: { title: string; trailing?: string; children: React.ReactNode }) {
  return <section className="verification-section"><div className="verification-section-head"><h3>{title}</h3>{trailing && <span>{trailing}</span>}</div>{children}</section>;
}

function Info({ label, value }: { label: string; value?: React.ReactNode }) {
  return <div className="verification-info"><span>{label}</span><strong>{value ?? '—'}</strong></div>;
}

function humanize(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatValue(value: unknown) {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}
