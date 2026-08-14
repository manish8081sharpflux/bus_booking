import { useEffect, useMemo, useState } from 'react';
import { IonContent, IonIcon, IonPage } from '@ionic/react';
import {
  arrowBackOutline,
  banOutline,
  locationOutline,
  pricetagOutline,
  saveOutline,
  shieldCheckmarkOutline,
} from 'ionicons/icons';
import { useHistory, useParams } from 'react-router-dom';
import './TripOperationsPage.css';

const API = import.meta.env.VITE_OPERATOR_API_URL || 'http://localhost:4000/api';
const operatorId = () => {
  try {
    const x = JSON.parse(localStorage.getItem('operator_profile') || localStorage.getItem('operator') || '{}');
    return x.id || x.operatorId || x.operator_id || '';
  } catch {
    return '';
  }
};
const token = () => localStorage.getItem('operator_access_token') || '';

async function api(path: string, options: RequestInit = {}) {
  const h = new Headers(options.headers);
  h.set('Content-Type', 'application/json');
  if (token()) h.set('Authorization', `Bearer ${token()}`);
  const r = await fetch(`${API}${path}`, { ...options, headers: h });
  const b = await r.json();
  if (!r.ok || b.success === false) throw new Error(b.message || 'Request failed');
  return b.data ?? b;
}

type Stop = {
  id: string;
  city: string;
  location_name: string;
  address?: string;
  landmark?: string;
  contact_number?: string;
  scheduled_at?: string;
  is_boarding_allowed: boolean;
  is_dropping_allowed: boolean;
};

type Seat = { id: string; seat_number: string; status: string };

type RuleCondition = {
  days?: number[];
  minPercent?: number;
  maxPercent?: number;
  hoursBefore?: number;
  minHoursBefore?: number;
  date?: string;
  dates?: string[];
};

type Rule = {
  name: string;
  rule_type: 'WEEKEND' | 'OCCUPANCY' | 'LAST_MINUTE' | 'DATE';
  adjustment_type: 'PERCENTAGE' | 'FIXED';
  adjustment_value: number;
  condition_json?: RuleCondition;
  priority?: number;
  is_active?: boolean;
};

const defaultRule = (): Rule => ({
  name: 'Weekend demand',
  rule_type: 'WEEKEND',
  adjustment_type: 'PERCENTAGE',
  adjustment_value: 10,
  condition_json: { days: [0, 6] },
  priority: 100,
  is_active: true,
});

export default function TripOperationsPage() {
  const { tripId } = useParams<{ tripId: string }>();
  const history = useHistory();
  const [data, setData] = useState<any>(null);
  const [stops, setStops] = useState<Stop[]>([]);
  const [rules, setRules] = useState<Rule[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [reason, setReason] = useState('');

  async function load() {
    try {
      setBusy(true);
      const d = await api(`/trips/${tripId}/operations?operatorId=${operatorId()}`);
      setData(d);
      setStops(d.stops || []);
      setRules((d.fare_rules || []).map((r: Rule) => ({ ...r, condition_json: r.condition_json || {} })));
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Unable to load trip');
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => { void load(); }, [tripId]);

  const inventory: Seat[] = data?.inventory || [];
  const blocked = useMemo(() => inventory.filter(x => x.status === 'BLOCKED').length, [inventory]);

  function updateRule(index: number, patch: Partial<Rule>) {
    setRules(current => current.map((rule, i) => i === index ? { ...rule, ...patch } : rule));
  }

  function updateCondition(index: number, patch: Partial<RuleCondition>) {
    setRules(current => current.map((rule, i) => i === index ? {
      ...rule,
      condition_json: { ...(rule.condition_json || {}), ...patch },
    } : rule));
  }

  async function saveStops() {
    try {
      setBusy(true);
      await api(`/trips/${tripId}/stops`, {
        method: 'PUT',
        body: JSON.stringify({
          operatorId: operatorId(),
          stops: stops.map(s => ({
            id: s.id,
            city: s.city,
            locationName: s.location_name,
            address: s.address,
            landmark: s.landmark,
            contactNumber: s.contact_number,
            scheduledAt: s.scheduled_at,
            isBoardingAllowed: s.is_boarding_allowed,
            isDroppingAllowed: s.is_dropping_allowed,
          })),
        }),
      });
      setMsg('Boarding and dropping points saved.');
      await load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  }

  async function block(value: boolean) {
    try {
      setBusy(true);
      await api(`/trips/${tripId}/seats/block`, {
        method: 'PATCH',
        body: JSON.stringify({ operatorId: operatorId(), seatIds: selected, blocked: value, reason }),
      });
      setSelected([]);
      setMsg(value ? 'Seats blocked from sale.' : 'Seats reopened for sale.');
      await load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Seat update failed');
    } finally {
      setBusy(false);
    }
  }

  async function saveRules() {
    try {
      setBusy(true);
      await api(`/trips/${tripId}/fare-rules`, {
        method: 'PUT',
        body: JSON.stringify({
          operatorId: operatorId(),
          rules: rules.map(r => ({
            name: r.name,
            ruleType: r.rule_type,
            adjustmentType: r.adjustment_type,
            adjustmentValue: Number(r.adjustment_value),
            condition: r.condition_json || {},
            priority: r.priority || 100,
            isActive: r.is_active !== false,
          })),
        }),
      });
      setMsg('Dynamic fare rules saved. New checkout quotes will use these rules.');
      await load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Fare rules failed');
    } finally {
      setBusy(false);
    }
  }

  async function cancel() {
    if (!reason.trim() || !confirm('Cancel this trip and all active bookings?')) return;
    try {
      setBusy(true);
      const r = await api(`/trips/${tripId}/cancel`, {
        method: 'PATCH',
        body: JSON.stringify({ operatorId: operatorId(), reason }),
      });
      setMsg(`Trip cancelled. ${r.affectedBookings} booking(s) affected.`);
      await load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Cancellation failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <IonPage>
      <IonContent fullscreen>
        <main className="trip-ops">
          <button className="trip-ops-back" onClick={() => history.push('/operator/trips')}>
            <IonIcon icon={arrowBackOutline} /> Trips
          </button>

          <header>
            <div>
              <span>TRIP CONTROL CENTER</span>
              <h1>{data?.service_number || 'Trip operations'}</h1>
              <p>{data ? `${data.source_city} → ${data.destination_city} · ${data.bus_name}` : 'Loading trip…'}</p>
            </div>
            <b className={`trip-status ${data?.status?.toLowerCase()}`}>{data?.status || '—'}</b>
          </header>

          {msg && <div className="trip-ops-message">{msg}</div>}

          <section className="trip-ops-grid">
            <article className="trip-ops-card wide">
              <div className="card-title"><IonIcon icon={locationOutline} /><div><h2>Boarding & dropping points</h2><p>Set pickup details, landmarks, contacts and trip-specific times.</p></div></div>
              {stops.map((s, i) => (
                <div className="stop-editor" key={s.id}>
                  <b>{i + 1}</b>
                  <input value={s.location_name} onChange={e => setStops(x => x.map(v => v.id === s.id ? { ...v, location_name: e.target.value } : v))} placeholder="Point name" />
                  <input value={s.landmark || ''} onChange={e => setStops(x => x.map(v => v.id === s.id ? { ...v, landmark: e.target.value } : v))} placeholder="Landmark" />
                  <input value={s.contact_number || ''} onChange={e => setStops(x => x.map(v => v.id === s.id ? { ...v, contact_number: e.target.value } : v))} placeholder="Contact" />
                  <input type="datetime-local" value={s.scheduled_at ? s.scheduled_at.slice(0, 16) : ''} onChange={e => setStops(x => x.map(v => v.id === s.id ? { ...v, scheduled_at: e.target.value } : v))} />
                  <label><input type="checkbox" checked={s.is_boarding_allowed} onChange={e => setStops(x => x.map(v => v.id === s.id ? { ...v, is_boarding_allowed: e.target.checked } : v))} />Board</label>
                  <label><input type="checkbox" checked={s.is_dropping_allowed} onChange={e => setStops(x => x.map(v => v.id === s.id ? { ...v, is_dropping_allowed: e.target.checked } : v))} />Drop</label>
                </div>
              ))}
              <button className="primary" onClick={saveStops} disabled={busy}><IonIcon icon={saveOutline} />Save stops</button>
            </article>

            <article className="trip-ops-card">
              <div className="card-title"><IonIcon icon={shieldCheckmarkOutline} /><div><h2>Seat blocking</h2><p>{blocked} currently blocked</p></div></div>
              <div className="seat-grid">
                {inventory.map(s => <button key={s.id} disabled={s.status === 'BOOKED' || s.status === 'HELD'} className={`${s.status.toLowerCase()} ${selected.includes(s.id) ? 'selected' : ''}`} onClick={() => setSelected(x => x.includes(s.id) ? x.filter(v => v !== s.id) : [...x, s.id])}>{s.seat_number}</button>)}
              </div>
              <input className="full-input" value={reason} onChange={e => setReason(e.target.value)} placeholder="Operational reason" />
              <div className="actions"><button onClick={() => block(true)} disabled={!selected.length || busy}>Block selected</button><button onClick={() => block(false)} disabled={!selected.length || busy}>Reopen selected</button></div>
            </article>

            <article className="trip-ops-card pricing-card">
              <div className="card-title"><IonIcon icon={pricetagOutline} /><div><h2>Dynamic fare rules</h2><p>Rules are evaluated in priority order. Existing checkout quotes remain unchanged.</p></div></div>
              {rules.length === 0 && <div className="pricing-empty">No dynamic rules. Customers currently pay the configured seat fare.</div>}
              {rules.map((r, i) => (
                <div className="fare-rule-card" key={i}>
                  <div className="fare-rule-main">
                    <input value={r.name} onChange={e => updateRule(i, { name: e.target.value })} placeholder="Rule name" />
                    <select value={r.rule_type} onChange={e => updateRule(i, { rule_type: e.target.value as Rule['rule_type'], condition_json: {} })}>
                      <option value="WEEKEND">Weekend</option><option value="OCCUPANCY">Occupancy</option><option value="LAST_MINUTE">Last minute</option><option value="DATE">Specific date</option>
                    </select>
                    <select value={r.adjustment_type} onChange={e => updateRule(i, { adjustment_type: e.target.value as Rule['adjustment_type'] })}>
                      <option value="PERCENTAGE">Percentage</option><option value="FIXED">Fixed ₹</option>
                    </select>
                    <input type="number" step="0.01" value={r.adjustment_value} onChange={e => updateRule(i, { adjustment_value: Number(e.target.value) })} />
                    <input type="number" min="1" value={r.priority || 100} onChange={e => updateRule(i, { priority: Number(e.target.value) })} title="Priority" />
                    <label className="rule-toggle"><input type="checkbox" checked={r.is_active !== false} onChange={e => updateRule(i, { is_active: e.target.checked })} />Active</label>
                    <button className="rule-remove" onClick={() => setRules(x => x.filter((_, j) => j !== i))}>×</button>
                  </div>

                  <div className="fare-condition">
                    {r.rule_type === 'WEEKEND' && <><span>Apply on</span><select value={(r.condition_json?.days || [0, 6]).join(',')} onChange={e => updateCondition(i, { days: e.target.value.split(',').map(Number) })}><option value="0,6">Saturday + Sunday</option><option value="6">Saturday</option><option value="0">Sunday</option><option value="5,6,0">Friday–Sunday</option></select></>}
                    {r.rule_type === 'OCCUPANCY' && <><span>Occupancy</span><input type="number" min="0" max="100" value={r.condition_json?.minPercent ?? 70} onChange={e => updateCondition(i, { minPercent: Number(e.target.value) })} /><em>to</em><input type="number" min="0" max="100" value={r.condition_json?.maxPercent ?? 100} onChange={e => updateCondition(i, { maxPercent: Number(e.target.value) })} /><em>%</em></>}
                    {r.rule_type === 'LAST_MINUTE' && <><span>Within</span><input type="number" min="0" value={r.condition_json?.hoursBefore ?? 24} onChange={e => updateCondition(i, { hoursBefore: Number(e.target.value) })} /><em>hours of departure</em></>}
                    {r.rule_type === 'DATE' && <><span>Travel date</span><input type="date" value={r.condition_json?.date || ''} onChange={e => updateCondition(i, { date: e.target.value })} /></>}
                  </div>
                </div>
              ))}
              <div className="pricing-actions"><button className="secondary" onClick={() => setRules(x => [...x, defaultRule()])}>+ Add rule</button><button className="primary" onClick={saveRules} disabled={busy}><IonIcon icon={saveOutline} />Save fare rules</button></div>
            </article>

            <article className="trip-ops-card danger">
              <div className="card-title"><IonIcon icon={banOutline} /><div><h2>Cancel trip</h2><p>Cancel service, release inventory and notify affected customers.</p></div></div>
              <textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="Cancellation reason" />
              <button onClick={cancel} disabled={busy || data?.status === 'CANCELLED'}>Cancel trip</button>
            </article>
          </section>
        </main>
      </IonContent>
    </IonPage>
  );
}
