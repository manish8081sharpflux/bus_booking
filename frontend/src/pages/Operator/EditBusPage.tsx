import { useEffect, useMemo, useState } from 'react';
import {
  IonContent,
  IonIcon,
  IonPage,
  IonToast,
} from '@ionic/react';
import {
  arrowBackOutline,
  busOutline,
  saveOutline,
} from 'ionicons/icons';
import {
  Redirect,
  useHistory,
  useParams,
} from 'react-router-dom';
import OperatorSidebar from '../../components/operator/OperatorSidebar';
import './EditBusPage.css';

const API =
  import.meta.env.VITE_OPERATOR_API_URL ||
  'http://localhost:4000/api';

type Seat = {
  seatNumber: string;
  deck: number;
  row: number;
  column: number;
  seatType: 'SEATER' | 'SLEEPER';
  isWindow: boolean;
  isFemaleReserved: boolean;
  isAccessible: boolean;
  berthLevel: '' | 'LOWER' | 'UPPER';
  side: 'LEFT' | 'RIGHT' | 'SIDE';
};

type Form = {
  busName: string;
  registrationNumber: string;
  manufacturer: string;
  model: string;
  manufacturingYear: string;
  totalSeats: string;
  deckType: string;
  fuelType: string;
  ownershipType: string;
  acType: string;
  seatingType: string;
  seatLayout: string;
  busCategory: string;
  axleType: string;
  transmissionType: string;
  suspensionType: string;
  serviceType: string;
  amenities: string[];
};

const options = {
  deckType: ['SINGLE', 'DOUBLE'],
  fuelType: ['DIESEL', 'CNG', 'ELECTRIC', 'HYBRID'],
  ownershipType: ['OWNED', 'LEASED', 'ATTACHED'],
  acType: ['AC', 'NON_AC'],
  seatingType: ['SEATER', 'SLEEPER', 'SEMI_SLEEPER', 'SEATER_SLEEPER'],
  seatLayout: ['2X2', '2X1', '2X1_SEATER', '2X1_SLEEPER', '1X1', '2X3'],
  busCategory: ['STANDARD', 'DELUXE', 'LUXURY', 'PREMIUM'],
  axleType: ['SINGLE_AXLE', 'MULTI_AXLE'],
  transmissionType: ['MANUAL', 'AUTOMATIC', 'AMT'],
  suspensionType: ['AIR', 'LEAF_SPRING', 'HYDRAULIC'],
  serviceType: ['INTERCITY', 'INTRACITY', 'TOURIST', 'STAFF'],
};

const AMENITIES = [
  'AC', 'WIFI', 'CHARGING_POINT', 'WATER_BOTTLE', 'BLANKET',
  'READING_LIGHT', 'CCTV', 'GPS_TRACKING', 'TV', 'SAFETY_EQUIPMENT',
];

const label = (value: string) =>
  value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

const deriveBusType = (acType: string, seatingType: string) => {
  const prefix = acType === 'AC' ? 'AC' : 'NON_AC';
  if (seatingType === 'SLEEPER') return `${prefix}_SLEEPER`;
  if (seatingType === 'SEATER_SLEEPER') return `${prefix}_SEATER_SLEEPER`;
  if (seatingType === 'SEMI_SLEEPER') return `${prefix}_SEMI_SLEEPER`;
  return `${prefix}_SEATER`;
};

const defaultSeat = (index: number, form: Form): Seat => {
  const columns =
    form.seatLayout === '2X2' ? 4 :
    form.seatLayout === '2X3' ? 5 :
    form.seatLayout === '1X1' ? 2 : 3;
  const seatType: 'SEATER' | 'SLEEPER' =
    form.seatingType === 'SLEEPER' ? 'SLEEPER' : 'SEATER';
  return {
    seatNumber: String(index + 1),
    deck: 1,
    row: Math.floor(index / columns) + 1,
    column: (index % columns) + 1,
    seatType,
    isWindow: (index % columns) === 0 || (index % columns) === columns - 1,
    isFemaleReserved: false,
    isAccessible: false,
    berthLevel: seatType === 'SLEEPER' ? 'LOWER' : '',
    side: 'SIDE',
  };
};

export default function EditBusPage() {
  const history = useHistory();
  const { busId } = useParams<{ busId: string }>();
  const token = localStorage.getItem('operator_access_token') || '';
  const [form, setForm] = useState<Form | null>(null);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [original, setOriginal] = useState<any>(null);
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
          throw new Error(body.message || 'Unable to load bus.');
        }
        const bus = body.bus;
        setOriginal(bus);
        setForm({
          busName: bus.name || '',
          registrationNumber: bus.registration_number || '',
          manufacturer: bus.manufacturer || '',
          model: bus.model || '',
          manufacturingYear: bus.manufacture_year ? String(bus.manufacture_year) : '',
          totalSeats: String(bus.seat_capacity || bus.seats?.length || ''),
          deckType: bus.deck_type || 'SINGLE',
          fuelType: bus.fuel_type || 'DIESEL',
          ownershipType: bus.ownership_type || 'OWNED',
          acType: bus.ac_type || 'AC',
          seatingType: bus.seating_type || 'SEATER',
          seatLayout: bus.seat_layout || '2X2',
          busCategory: bus.bus_category || 'STANDARD',
          axleType: bus.axle_type || 'SINGLE_AXLE',
          transmissionType: bus.transmission_type || 'MANUAL',
          suspensionType: bus.suspension_type || 'AIR',
          serviceType: bus.service_type || 'INTERCITY',
          amenities: Array.isArray(bus.amenities) ? bus.amenities : [],
        });
        setSeats(
          (Array.isArray(bus.seats) ? bus.seats : []).map((seat: any) => ({
            seatNumber: seat.seat_number || seat.seatNumber || '',
            deck: Number(seat.deck || 1),
            row: Number(seat.row_number || seat.row || 1),
            column: Number(seat.column_number || seat.column || 1),
            seatType: String(seat.seat_type || seat.seatType || 'SEATER').toUpperCase() as 'SEATER' | 'SLEEPER',
            isWindow: Boolean(seat.is_window ?? seat.isWindow),
            isFemaleReserved: Boolean(seat.is_female_reserved ?? seat.isFemaleReserved),
            isAccessible: Boolean(seat.is_accessible ?? seat.isAccessible),
            berthLevel: (seat.berth_level || seat.berthLevel || '') as Seat['berthLevel'],
            side: (seat.side || 'SIDE') as Seat['side'],
          })),
        );
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Unable to load bus.');
      } finally {
        setLoading(false);
      }
    };
    if (token) void load();
  }, [busId, token]);

  const inactive = String(original?.operational_status || original?.status || '').toUpperCase() !== 'ACTIVE';

  const structuralChanged = useMemo(() => {
    if (!form || !original) return false;
    return (
      String(original.seat_capacity || '') !== String(form.totalSeats) ||
      String(original.deck_type || '') !== form.deckType ||
      String(original.seating_type || '') !== form.seatingType ||
      String(original.seat_layout || '') !== form.seatLayout
    );
  }, [form, original]);

  if (!token) return <Redirect to="/operator" />;

  const update = (key: keyof Form, value: string | string[]) => {
    setForm((current) => current ? { ...current, [key]: value } : current);
    setError('');
  };

  const resizeSeats = (count: number, nextForm: Form) => {
    setSeats((current) => {
      const copy = current.slice(0, count);
      while (copy.length < count) copy.push(defaultSeat(copy.length, nextForm));
      return copy;
    });
  };

  const updateSeat = (index: number, patch: Partial<Seat>) => {
    setSeats((current) => current.map((seat, i) => i === index ? { ...seat, ...patch } : seat));
  };

  const save = async () => {
    if (!form || saving) return;
    try {
      setSaving(true);
      setError('');
      const payload: any = {
        ...form,
        totalSeats: Number(form.totalSeats),
        manufacturingYear: form.manufacturingYear ? Number(form.manufacturingYear) : null,
        busType: deriveBusType(form.acType, form.seatingType),
      };
      if (structuralChanged) payload.seats = seats;

      const response = await fetch(
        `${API}/buses/${encodeURIComponent(busId)}/details`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        },
      );
      const text = await response.text();
      let body: any = {};
      try { body = text ? JSON.parse(text) : {}; } catch { body = {}; }
      if (!response.ok || body.success === false) {
        const details = body.errors?.seats;
        throw new Error(
          Array.isArray(details) && details.length
            ? `${body.message || 'Invalid seat layout'} ${details.join(' ')}`
            : body.message || 'Unable to update bus.',
        );
      }
      setToast(body.message || 'Bus updated successfully.');
      setTimeout(() => history.replace(`/operator/buses/${encodeURIComponent(busId)}`), 700);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to update bus.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <IonPage>
      <div className="edit-bus-shell">
        <OperatorSidebar />
        <IonContent fullscreen className="edit-bus-content">
          <main className="edit-bus-main">
            <header className="edit-bus-header">
              <button className="edit-bus-back" onClick={() => history.push(`/operator/buses/${busId}`)}>
                <IonIcon icon={arrowBackOutline} />
              </button>
              <div>
                <span>Operator Console / Buses / Edit</span>
                <h1>Edit bus</h1>
                <p>Update master details and seat configuration safely.</p>
              </div>
            </header>

            {error && <div className="edit-bus-error">{error}</div>}
            {loading && <div className="edit-bus-card">Loading bus details...</div>}

            {form && !loading && (
              <>
                {!inactive && (
                  <div className="edit-bus-warning">
                    This bus is ACTIVE. Deactivate it before changing registration, classification, capacity or layout.
                  </div>
                )}

                <section className="edit-bus-card">
                  <div className="edit-bus-card-title"><IonIcon icon={busOutline} /><h2>Bus details</h2></div>
                  <div className="edit-bus-grid">
                    <label>Bus name<input value={form.busName} onChange={(e) => update('busName', e.target.value)} /></label>
                    <label>Registration<input disabled={!inactive} value={form.registrationNumber} onChange={(e) => update('registrationNumber', e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))} /></label>
                    <label>Manufacturer<input disabled={!inactive} value={form.manufacturer} onChange={(e) => update('manufacturer', e.target.value)} /></label>
                    <label>Model<input disabled={!inactive} value={form.model} onChange={(e) => update('model', e.target.value)} /></label>
                    <label>Manufacturing year<input disabled={!inactive} inputMode="numeric" value={form.manufacturingYear} onChange={(e) => update('manufacturingYear', e.target.value.replace(/\D/g, '').slice(0,4))} /></label>
                    <label>Total seats<input disabled={!inactive} inputMode="numeric" value={form.totalSeats} onChange={(e) => { const value=e.target.value.replace(/\D/g,'').slice(0,2); const next={...form,totalSeats:value}; setForm(next); if(value) resizeSeats(Math.min(80, Number(value)), next); }} /></label>
                    {(Object.keys(options) as Array<keyof typeof options>).map((key) => (
                      <label key={key}>{label(key)}
                        <select disabled={!inactive} value={form[key]} onChange={(e) => update(key as keyof Form, e.target.value)}>
                          {options[key].map((value) => <option key={value} value={value}>{label(value)}</option>)}
                        </select>
                      </label>
                    ))}
                  </div>
                </section>

                <section className="edit-bus-card">
                  <h2>Amenities</h2>
                  <div className="edit-bus-amenities">
                    {AMENITIES.map((amenity) => (
                      <label key={amenity}>
                        <input type="checkbox" checked={form.amenities.includes(amenity)} onChange={() => update('amenities', form.amenities.includes(amenity) ? form.amenities.filter((x) => x !== amenity) : [...form.amenities, amenity])} />
                        {label(amenity)}
                      </label>
                    ))}
                  </div>
                </section>

                {inactive && structuralChanged && (
                  <section className="edit-bus-card">
                    <h2>Seat layout</h2>
                    <p className="edit-bus-hint">Structural details changed. Review every seat before saving.</p>
                    <div className="edit-bus-seat-table-wrap">
                      <table className="edit-bus-seat-table">
                        <thead><tr><th>#</th><th>Seat</th><th>Deck</th><th>Row</th><th>Column</th><th>Type</th><th>Berth</th></tr></thead>
                        <tbody>
                          {seats.map((seat, index) => (
                            <tr key={index}>
                              <td>{index + 1}</td>
                              <td><input value={seat.seatNumber} onChange={(e) => updateSeat(index,{seatNumber:e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,'')})} /></td>
                              <td><select value={seat.deck} onChange={(e) => updateSeat(index,{deck:Number(e.target.value)})}><option value={1}>Lower</option>{form.deckType==='DOUBLE'&&<option value={2}>Upper</option>}</select></td>
                              <td><input inputMode="numeric" value={seat.row} onChange={(e) => updateSeat(index,{row:Number(e.target.value)||1})} /></td>
                              <td><input inputMode="numeric" value={seat.column} onChange={(e) => updateSeat(index,{column:Number(e.target.value)||1})} /></td>
                              <td><select value={seat.seatType} onChange={(e) => updateSeat(index,{seatType:e.target.value as Seat['seatType'],berthLevel:e.target.value==='SLEEPER'?(seat.berthLevel||'LOWER'):''})}><option value="SEATER">Seater</option><option value="SLEEPER">Sleeper</option></select></td>
                              <td>{seat.seatType==='SLEEPER'?<select value={seat.berthLevel} onChange={(e) => updateSeat(index,{berthLevel:e.target.value as Seat['berthLevel']})}><option value="LOWER">Lower</option><option value="UPPER">Upper</option></select>:'-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>
                )}

                <div className="edit-bus-actions">
                  <button className="secondary" onClick={() => history.push(`/operator/buses/${busId}`)}>Cancel</button>
                  <button className="primary" disabled={saving} onClick={() => void save()}><IonIcon icon={saveOutline} />{saving ? 'Saving...' : 'Save changes'}</button>
                </div>
              </>
            )}
          </main>
          <IonToast isOpen={Boolean(toast)} message={toast} color="success" duration={2200} position="top" onDidDismiss={() => setToast('')} />
        </IonContent>
      </div>
    </IonPage>
  );
}