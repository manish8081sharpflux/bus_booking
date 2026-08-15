import { useEffect, useState } from 'react';
import {
  IonContent,
  IonIcon,
  IonPage,
  IonToast,
} from '@ionic/react';
import {
  arrowBackOutline,
  cloudUploadOutline,
  shieldCheckmarkOutline,
} from 'ionicons/icons';
import {
  Redirect,
  useHistory,
  useParams,
} from 'react-router-dom';
import OperatorSidebar from '../../components/operator/OperatorSidebar';
import './BusComplianceRenewalPage.css';

const API =
  import.meta.env.VITE_OPERATOR_API_URL ||
  'http://localhost:4000/api';

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED = [
  'application/pdf',
  'image/jpeg',
  'image/png',
];

type ComplianceForm = {
  registrationDate: string;
  insuranceNumber: string;
  insuranceExpiry: string;
  permitNumber: string;
  permitExpiry: string;
  fitnessCertificateNumber: string;
  fitnessExpiry: string;
  pucNumber: string;
  pucExpiry: string;
};

type FilesState = {
  rcDocument: File | null;
  insuranceDocument: File | null;
  permitDocument: File | null;
  fitnessDocument: File | null;
  pucDocument: File | null;
};

const emptyFiles: FilesState = {
  rcDocument: null,
  insuranceDocument: null,
  permitDocument: null,
  fitnessDocument: null,
  pucDocument: null,
};

const toDateInput = (value?: string | null) =>
  value ? String(value).slice(0, 10) : '';

export default function BusComplianceRenewalPage() {
  const history = useHistory();
  const { busId } = useParams<{ busId: string }>();
  const token = localStorage.getItem('operator_access_token') || '';
  const [bus, setBus] = useState<any>(null);
  const [form, setForm] = useState<ComplianceForm | null>(null);
  const [files, setFiles] = useState<FilesState>(emptyFiles);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `${API}/buses/${encodeURIComponent(busId)}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        const body = await response.json();
        if (!response.ok || body.success === false) {
          throw new Error(body.message || 'Unable to load bus compliance.');
        }
        const loadedBus = body.bus;
        const c = loadedBus.compliance || {};
        setBus(loadedBus);
        setForm({
          registrationDate: toDateInput(c.registration_date),
          insuranceNumber: c.insurance_number || '',
          insuranceExpiry: toDateInput(c.insurance_expiry),
          permitNumber: c.permit_number || '',
          permitExpiry: toDateInput(c.permit_expiry),
          fitnessCertificateNumber: c.fitness_certificate_number || '',
          fitnessExpiry: toDateInput(c.fitness_expiry),
          pucNumber: c.puc_number || '',
          pucExpiry: toDateInput(c.puc_expiry),
        });
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Unable to load bus compliance.');
      } finally {
        setLoading(false);
      }
    };
    if (token) void load();
  }, [busId, token]);

  if (!token) return <Redirect to="/operator" />;

  const inactive =
    String(bus?.operational_status || bus?.status || '').toUpperCase() !== 'ACTIVE';

  const update = (field: keyof ComplianceForm, value: string) => {
    setForm((current) => current ? { ...current, [field]: value } : current);
    setError('');
  };

  const chooseFile = (field: keyof FilesState, file: File | null) => {
    if (!file) {
      setFiles((current) => ({ ...current, [field]: null }));
      return;
    }
    if (!ALLOWED.includes(file.type)) {
      setError('Only PDF, JPG and PNG files are allowed.');
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setError('Each document must be 5 MB or smaller.');
      return;
    }
    setFiles((current) => ({ ...current, [field]: file }));
    setError('');
  };

  const submit = async () => {
    if (!form || saving) return;
    if (!inactive) {
      setError('Deactivate this bus before renewing compliance documents.');
      return;
    }
    if (!Object.values(files).some(Boolean)) {
      setError('Upload at least one renewed compliance document.');
      return;
    }

    try {
      setSaving(true);
      setError('');
      const data = new FormData();
      data.append('compliance', JSON.stringify(form));
      Object.entries(files).forEach(([key, file]) => {
        if (file) data.append(key, file);
      });

      const response = await fetch(
        `${API}/buses/${encodeURIComponent(busId)}/compliance-renewal`,
        {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${token}` },
          body: data,
        },
      );

      const text = await response.text();
      let body: any = {};
      try { body = text ? JSON.parse(text) : {}; } catch { body = {}; }

      if (!response.ok || body.success === false) {
        const details = body.errors && typeof body.errors === 'object'
          ? Object.values(body.errors).filter(Boolean).join(' ')
          : '';
        throw new Error(
          [body.message || 'Unable to renew compliance.', details]
            .filter(Boolean)
            .join(' '),
        );
      }

      setToast(body.message || 'Compliance renewal submitted.');
      setTimeout(
        () => history.replace(`/operator/buses/${encodeURIComponent(busId)}`),
        800,
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to renew compliance.');
    } finally {
      setSaving(false);
    }
  };

  const fileRows: Array<[keyof FilesState, string]> = [
    ['rcDocument', 'Registration Certificate (RC)'],
    ['insuranceDocument', 'Insurance Document'],
    ['permitDocument', 'Permit Document'],
    ['fitnessDocument', 'Fitness Certificate'],
    ['pucDocument', 'PUC Document'],
  ];

  return (
    <IonPage>
      <div className="renew-bus-shell">
        <OperatorSidebar />
        <IonContent fullscreen className="renew-bus-content">
          <main className="renew-bus-main">
            <header className="renew-bus-header">
              <button
                className="renew-bus-back"
                type="button"
                onClick={() => history.push(`/operator/buses/${busId}`)}
              >
                <IonIcon icon={arrowBackOutline} />
              </button>
              <div>
                <span>Operator Console / Buses / Compliance</span>
                <h1>Renew compliance</h1>
                <p>Update expiring compliance details and upload renewed documents.</p>
              </div>
            </header>

            {error && <div className="renew-bus-error">{error}</div>}
            {loading && <section className="renew-bus-card">Loading compliance...</section>}

            {form && !loading && (
              <>
                {!inactive && (
                  <div className="renew-bus-warning">
                    This bus is ACTIVE. Deactivate it before submitting compliance renewal.
                  </div>
                )}

                <section className="renew-bus-card">
                  <div className="renew-bus-title">
                    <IonIcon icon={shieldCheckmarkOutline} />
                    <h2>Compliance details</h2>
                  </div>
                  <div className="renew-bus-grid">
                    <label>Registration date<input type="date" value={form.registrationDate} onChange={(e) => update('registrationDate', e.target.value)} /></label>
                    <label>Insurance number<input value={form.insuranceNumber} onChange={(e) => update('insuranceNumber', e.target.value.toUpperCase())} /></label>
                    <label>Insurance expiry<input type="date" value={form.insuranceExpiry} onChange={(e) => update('insuranceExpiry', e.target.value)} /></label>
                    <label>Permit number<input value={form.permitNumber} onChange={(e) => update('permitNumber', e.target.value.toUpperCase())} /></label>
                    <label>Permit expiry<input type="date" value={form.permitExpiry} onChange={(e) => update('permitExpiry', e.target.value)} /></label>
                    <label>Fitness certificate number<input value={form.fitnessCertificateNumber} onChange={(e) => update('fitnessCertificateNumber', e.target.value.toUpperCase())} /></label>
                    <label>Fitness expiry<input type="date" value={form.fitnessExpiry} onChange={(e) => update('fitnessExpiry', e.target.value)} /></label>
                    <label>PUC number<input value={form.pucNumber} onChange={(e) => update('pucNumber', e.target.value.toUpperCase())} /></label>
                    <label>PUC expiry<input type="date" value={form.pucExpiry} onChange={(e) => update('pucExpiry', e.target.value)} /></label>
                  </div>
                </section>

                <section className="renew-bus-card">
                  <h2>Renewed documents</h2>
                  <p className="renew-bus-hint">Upload only the documents you want to replace. PDF/JPG/PNG, max 5 MB each.</p>
                  <div className="renew-bus-files">
                    {fileRows.map(([key, title]) => (
                      <label key={key} className="renew-bus-file">
                        <IonIcon icon={cloudUploadOutline} />
                        <div>
                          <strong>{title}</strong>
                          <span>{files[key]?.name || 'Choose file'}</span>
                        </div>
                        <input
                          type="file"
                          accept="application/pdf,image/jpeg,image/png"
                          onChange={(e) => chooseFile(key, e.target.files?.[0] || null)}
                        />
                      </label>
                    ))}
                  </div>
                </section>

                <div className="renew-bus-actions">
                  <button className="secondary" type="button" onClick={() => history.push(`/operator/buses/${busId}`)}>Cancel</button>
                  <button className="primary" type="button" disabled={saving || !inactive} onClick={() => void submit()}>
                    {saving ? 'Submitting...' : 'Submit for verification'}
                  </button>
                </div>
              </>
            )}
          </main>

          <IonToast
            isOpen={Boolean(toast)}
            message={toast}
            color="success"
            duration={2400}
            position="top"
            onDidDismiss={() => setToast('')}
          />
        </IonContent>
      </div>
    </IonPage>
  );
}