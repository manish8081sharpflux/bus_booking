import { useEffect, useMemo, useState } from 'react';
import { IonIcon, IonPage } from '@ionic/react';
import {
  addOutline,
  callOutline,
  carOutline,
  createOutline,
  peopleOutline,
  refreshOutline,
  searchOutline,
} from 'ionicons/icons';
import OperatorSidebar from '../../components/operator/OperatorSidebar';
import {
  firstError,
  normalizeEmail,
  normalizeWhitespace,
  validateEmail,
  validateFutureDate,
  validateIndianMobile,
  validateLicenseNumber,
  validatePersonName,
} from '../../utils/validation';
import './OperatorDashboardPage.css';
import './OperatorStaffPage.css';

const API = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:4600').replace(/\/$/, '');

type Staff = {
  id: string;
  full_name: string;
  mobile: string;
  email?: string;
  role: string;
  license_number?: string;
  license_expiry?: string;
  emergency_contact?: string;
  status: string;
  active_assignments: number;
};

type StaffForm = {
  fullName: string;
  mobile: string;
  email: string;
  role: string;
  licenseNumber: string;
  licenseExpiry: string;
  emergencyContact: string;
};

type FieldErrors = Partial<Record<keyof StaffForm, string>>;

const EMPTY_FORM: StaffForm = {
  fullName: '',
  mobile: '',
  email: '',
  role: 'DRIVER',
  licenseNumber: '',
  licenseExpiry: '',
  emergencyContact: '',
};

function operator() {
  try {
    return JSON.parse(localStorage.getItem('operator') || '{}');
  } catch {
    return {};
  }
}

function validateStaff(form: StaffForm): FieldErrors {
  const errors: FieldErrors = {};

  const name = validatePersonName(form.fullName, 'Full name');
  if (!name.valid) errors.fullName = name.message;

  const mobile = validateIndianMobile(form.mobile);
  if (!mobile.valid) errors.mobile = mobile.message;

  const email = validateEmail(form.email, false);
  if (!email.valid) errors.email = email.message;

  if (!['DRIVER', 'CONDUCTOR', 'MANAGER', 'BOOKING_STAFF', 'ACCOUNTANT', 'ROUTE_MANAGER', 'SUPPORT'].includes(form.role)) {
    errors.role = 'Select a valid staff role.';
  }

  const needsLicence = form.role === 'DRIVER';
  const licence = validateLicenseNumber(form.licenseNumber, needsLicence);
  if (!licence.valid) errors.licenseNumber = licence.message;

  if (needsLicence) {
    const expiry = validateFutureDate(form.licenseExpiry, 'Licence expiry');
    if (!expiry.valid) errors.licenseExpiry = expiry.message;
  } else if (form.licenseExpiry) {
    const expiry = validateFutureDate(form.licenseExpiry, 'Licence expiry');
    if (!expiry.valid) errors.licenseExpiry = expiry.message;
  }

  if (form.emergencyContact) {
    const emergency = validateIndianMobile(form.emergencyContact, 'Emergency contact');
    if (!emergency.valid) errors.emergencyContact = emergency.message;
    if (!errors.emergencyContact && form.emergencyContact === form.mobile) {
      errors.emergencyContact = 'Emergency contact should be different from the staff mobile number.';
    }
  }

  return errors;
}

export default function OperatorStaffPage() {
  const op = operator();
  const operatorId = op.id || op.operatorId;
  const token=localStorage.getItem('operator_access_token');
  const [items, setItems] = useState<Staff[]>([]);
  const [q, setQ] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState<StaffForm>(EMPTY_FORM);
  const [errors, setErrors] = useState<FieldErrors>({});

  async function load() {
    if (!operatorId) {
      setMessage('Operator profile is missing. Please sign in again.');
      return;
    }
    try {
      setBusy(true);
      const r = await fetch(`${API}/staff`,{headers:{Authorization:`Bearer ${token}`}});
      const b = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(b.message || 'Unable to load staff');
      setItems(Array.isArray(b.staff) ? b.staff : []);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Unable to load staff');
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void load();
  }, [operatorId]);

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return items;
    return items.filter((x) => `${x.full_name} ${x.mobile} ${x.role} ${x.email || ''}`.toLowerCase().includes(term));
  }, [items, q]);

  function update<K extends keyof StaffForm>(key: K, value: StaffForm[K]) {
    let next = String(value);
    if (key === 'fullName') next = normalizeWhitespace(next).slice(0, 80);
    if (key === 'mobile' || key === 'emergencyContact') next = next.replace(/\D/g, '').slice(0, 10);
    if (key === 'email') next = next.replace(/\s/g, '').slice(0, 254);
    if (key === 'licenseNumber') next = next.toUpperCase().replace(/[^A-Z0-9/-]/g, '').slice(0, 24);

    setForm((current) => ({ ...current, [key]: next }));
    setErrors((current) => ({ ...current, [key]: undefined }));
    setMessage('');
  }

  function closeModal() {
    if (busy) return;
    setShow(false);
    setErrors({});
    setForm(EMPTY_FORM);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const nextErrors = validateStaff(form);
    setErrors(nextErrors);
    const error = firstError(Object.values(nextErrors).filter(Boolean).map((message) => ({ valid: false as const, message: message! })));
    if (error) {
      setMessage(error);
      return;
    }

    try {
      setBusy(true);
      setMessage('');
      const r = await fetch(`${API}/staff`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json',Authorization:`Bearer ${token}` },
        body: JSON.stringify({
          fullName: normalizeWhitespace(form.fullName),
          mobile: form.mobile,
          email: normalizeEmail(form.email) || null,
          role: form.role,
          licenseNumber: form.licenseNumber.trim() || null,
          licenseExpiry: form.licenseExpiry || null,
          emergencyContact: form.emergencyContact || null,
        }),
      });
      const b = await r.json().catch(() => ({}));
      if (!r.ok || b.success === false) throw new Error(b.message || 'Unable to add staff');
      setShow(false);
      setForm(EMPTY_FORM);
      setErrors({});
      setMessage('Staff member added successfully.');
      await load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Unable to add staff');
    } finally {
      setBusy(false);
    }
  }

  return (
    <IonPage>
      <div className="operator-dashboard-shell">
        <OperatorSidebar />
        <main className="staff-page">
          <header className="staff-header">
            <div>
              <p className="staff-kicker">Operations team</p>
              <h1>Staff & Drivers</h1>
              <p>Manage drivers, conductors and support staff, including licence validity and trip readiness.</p>
            </div>
            <button className="staff-primary" onClick={() => setShow(true)}>
              <IonIcon icon={addOutline} /> Add staff
            </button>
          </header>

          {message && <div className="staff-message" role="status" aria-live="polite">{message}</div>}

          <section className="staff-stats">
            <article><IonIcon icon={peopleOutline} /><div><span>Total staff</span><strong>{items.length}</strong></div></article>
            <article><IonIcon icon={carOutline} /><div><span>Drivers</span><strong>{items.filter((x) => x.role === 'DRIVER').length}</strong></div></article>
            <article><IonIcon icon={callOutline} /><div><span>Conductors</span><strong>{items.filter((x) => x.role === 'CONDUCTOR').length}</strong></div></article>
            <article><IonIcon icon={createOutline} /><div><span>Licence expiring ≤30d</span><strong>{items.filter((x) => x.license_expiry && new Date(x.license_expiry).getTime() - Date.now() < 30 * 86400000).length}</strong></div></article>
          </section>

          <section className="staff-card">
            <div className="staff-toolbar">
              <label aria-label="Search staff"><IonIcon icon={searchOutline} /><input placeholder="Search name, mobile or role" value={q} onChange={(e) => setQ(e.target.value.slice(0, 80))} /></label>
              <button onClick={() => void load()} disabled={busy}><IonIcon icon={refreshOutline} /> Refresh</button>
            </div>
            <div className="staff-table-wrap">
              <table>
                <thead><tr><th>Staff member</th><th>Role</th><th>Contact</th><th>Driving licence</th><th>Assignments</th><th>Status</th></tr></thead>
                <tbody>{rows.map((x) => <tr key={x.id}><td><strong>{x.full_name}</strong><small>{x.email || 'No email'}</small></td><td><span className="staff-pill">{x.role}</span></td><td>{x.mobile}<small>{x.emergency_contact ? `Emergency: ${x.emergency_contact}` : ''}</small></td><td>{x.license_number || '—'}<small>{x.license_expiry ? `Expires ${new Date(x.license_expiry).toLocaleDateString('en-IN')}` : 'Not provided'}</small></td><td>{x.active_assignments}</td><td><span className={`staff-status ${x.status.toLowerCase()}`}>{x.status}</span></td></tr>)}</tbody>
              </table>
              {!busy && !rows.length && <div className="staff-empty"><IonIcon icon={peopleOutline} /><h3>No staff found</h3><p>Add drivers and conductors to start assigning crew to trips.</p></div>}
            </div>
          </section>

          {show && (
            <div className="staff-modal-backdrop" onMouseDown={closeModal} role="presentation">
              <form className="staff-modal" onSubmit={save} onMouseDown={(e) => e.stopPropagation()} noValidate>
                <div className="staff-modal-head"><div><h2>Add staff member</h2><p>Store operational and licence details for this operator.</p></div><button type="button" onClick={closeModal} aria-label="Close">×</button></div>
                <div className="staff-form-grid">
                  <label>Full name<input aria-invalid={!!errors.fullName} required value={form.fullName} onChange={(e) => update('fullName', e.target.value)} />{errors.fullName && <small className="field-error">{errors.fullName}</small>}</label>
                  <label>Mobile<input aria-invalid={!!errors.mobile} required inputMode="numeric" autoComplete="tel" maxLength={10} value={form.mobile} onChange={(e) => update('mobile', e.target.value)} />{errors.mobile && <small className="field-error">{errors.mobile}</small>}</label>
                  <label>Email<input aria-invalid={!!errors.email} type="email" autoComplete="email" maxLength={254} value={form.email} onChange={(e) => update('email', e.target.value)} />{errors.email && <small className="field-error">{errors.email}</small>}</label>
                  <label>Role<select aria-invalid={!!errors.role} value={form.role} onChange={(e) => update('role', e.target.value)}><option value="DRIVER">Driver</option><option value="CONDUCTOR">Conductor</option><option value="MANAGER">Manager</option><option value="BOOKING_STAFF">Booking staff</option><option value="ACCOUNTANT">Accountant</option><option value="ROUTE_MANAGER">Route manager</option><option value="SUPPORT">Support</option></select>{errors.role && <small className="field-error">{errors.role}</small>}</label>
                  <label>Licence number{form.role === 'DRIVER' && ' *'}<input aria-invalid={!!errors.licenseNumber} required={form.role === 'DRIVER'} value={form.licenseNumber} onChange={(e) => update('licenseNumber', e.target.value)} />{errors.licenseNumber && <small className="field-error">{errors.licenseNumber}</small>}</label>
                  <label>Licence expiry{form.role === 'DRIVER' && ' *'}<input aria-invalid={!!errors.licenseExpiry} required={form.role === 'DRIVER'} type="date" min={new Date().toISOString().slice(0, 10)} value={form.licenseExpiry} onChange={(e) => update('licenseExpiry', e.target.value)} />{errors.licenseExpiry && <small className="field-error">{errors.licenseExpiry}</small>}</label>
                  <label>Emergency contact<input aria-invalid={!!errors.emergencyContact} inputMode="numeric" maxLength={10} value={form.emergencyContact} onChange={(e) => update('emergencyContact', e.target.value)} />{errors.emergencyContact && <small className="field-error">{errors.emergencyContact}</small>}</label>
                </div>
                <div className="staff-actions"><button type="button" onClick={closeModal}>Cancel</button><button className="staff-primary" disabled={busy}>{busy ? 'Saving…' : 'Save staff member'}</button></div>
              </form>
            </div>
          )}
        </main>
      </div>
    </IonPage>
  );
}
