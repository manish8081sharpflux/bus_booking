import { FormEvent, useCallback, useEffect, useState } from 'react';
import {
  IonAlert,
  IonContent,
  IonIcon,
  IonPage,
  IonToast,
} from '@ionic/react';
import {
  addOutline,
  arrowBackOutline,
  createOutline,
  personOutline,
  starOutline,
  trashOutline,
} from 'ionicons/icons';
import { useHistory } from 'react-router-dom';
import './CustomerTravellersPage.css';

const API = import.meta.env.VITE_BOOKING_API_URL || 'http://localhost:4000/api/bookings';

type Traveller = {
  id: string;
  full_name: string;
  age: number;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  relation?: string | null;
  is_default: boolean;
};

type FormState = {
  id?: string;
  fullName: string;
  age: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  relation: string;
  isDefault: boolean;
};

const emptyForm: FormState = {
  fullName: '',
  age: '',
  gender: 'MALE',
  relation: '',
  isDefault: false,
};

export default function CustomerTravellersPage() {
  const history = useHistory();
  const token = localStorage.getItem('customer_access_token');
  const [items, setItems] = useState<Traveller[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Traveller | null>(null);
  const [toast, setToast] = useState<{message:string;color?:string}|null>(null);

  const request = useCallback(async (path: string, options?: RequestInit) => {
    if (!token) throw new Error('Please sign in to manage saved travellers.');
    const response = await fetch(`${API}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(options?.body ? {'Content-Type':'application/json'} : {}),
        ...(options?.headers || {}),
      },
    });
    const body = await response.json();
    if (!response.ok || body.success === false) throw new Error(body.message || 'Request failed.');
    return body.data;
  }, [token]);

  const load = useCallback(async () => {
    if (!token) {
      history.replace('/login?returnTo=/profile/travellers');
      return;
    }
    try {
      setLoading(true);
      setItems(await request('/customer/travellers'));
    } catch (error) {
      setToast({message:error instanceof Error?error.message:'Unable to load saved travellers.',color:'danger'});
    } finally {
      setLoading(false);
    }
  }, [history, request, token]);

  useEffect(() => { void load(); }, [load]);

  function edit(item: Traveller) {
    setForm({
      id: item.id,
      fullName: item.full_name,
      age: String(item.age),
      gender: item.gender,
      relation: item.relation || '',
      isDefault: item.is_default,
    });
    window.scrollTo({top:0,behavior:'smooth'});
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      const payload = {
        fullName: form.fullName,
        age: Number(form.age),
        gender: form.gender,
        relation: form.relation,
        isDefault: form.isDefault,
      };
      await request(
        form.id ? `/customer/travellers/${form.id}` : '/customer/travellers',
        {method:form.id?'PATCH':'POST',body:JSON.stringify(payload)},
      );
      setForm(emptyForm);
      setToast({message:form.id?'Traveller updated.':'Traveller saved.',color:'success'});
      await load();
    } catch (error) {
      setToast({message:error instanceof Error?error.message:'Unable to save traveller.',color:'danger'});
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    const target=deleteTarget;
    setDeleteTarget(null);
    if(!target) return;
    try {
      await request(`/customer/travellers/${target.id}`,{method:'DELETE'});
      if(form.id===target.id) setForm(emptyForm);
      setToast({message:'Traveller removed.',color:'success'});
      await load();
    } catch (error) {
      setToast({message:error instanceof Error?error.message:'Unable to remove traveller.',color:'danger'});
    }
  }

  return (
    <IonPage>
      <IonContent fullscreen>
        <div className="travellers-shell">
          <main className="travellers-wrap">
            <button className="travellers-back" type="button" onClick={() => history.push('/profile')}>
              <IonIcon icon={arrowBackOutline}/> Back to profile
            </button>

            <header className="travellers-header">
              <div>
                <span>MY ACCOUNT</span>
                <h1>Saved travellers</h1>
                <p>Save passenger details once and reuse them while booking.</p>
              </div>
            </header>

            <section className="traveller-form-card">
              <h2>{form.id ? 'Edit traveller' : 'Add traveller'}</h2>
              <form onSubmit={submit}>
                <label>Full name<input required minLength={2} maxLength={80} value={form.fullName}
                  onChange={(e)=>setForm({...form,fullName:e.target.value})}/></label>
                <div className="traveller-form-grid">
                  <label>Age<input required type="number" min={1} max={120} value={form.age}
                    onChange={(e)=>setForm({...form,age:e.target.value})}/></label>
                  <label>Gender<select value={form.gender}
                    onChange={(e)=>setForm({...form,gender:e.target.value as FormState['gender']})}>
                    <option value="MALE">Male</option><option value="FEMALE">Female</option><option value="OTHER">Other</option>
                  </select></label>
                </div>
                <label>Relation (optional)<input maxLength={40} placeholder="Self, Mother, Father..." value={form.relation}
                  onChange={(e)=>setForm({...form,relation:e.target.value})}/></label>
                <label className="traveller-default"><input type="checkbox" checked={form.isDefault}
                  onChange={(e)=>setForm({...form,isDefault:e.target.checked})}/> Use as default traveller</label>
                <div className="traveller-actions">
                  {form.id && <button type="button" className="secondary" onClick={()=>setForm(emptyForm)}>Cancel edit</button>}
                  <button type="submit" className="primary" disabled={saving}>
                    <IonIcon icon={form.id?createOutline:addOutline}/>{saving?'Saving…':form.id?'Update traveller':'Save traveller'}
                  </button>
                </div>
              </form>
            </section>

            <section className="traveller-list-card">
              <h2>Your travellers</h2>
              {loading ? <p className="traveller-empty">Loading travellers…</p> :
               !items.length ? <div className="traveller-empty"><IonIcon icon={personOutline}/><strong>No saved travellers yet</strong><span>Add a traveller above to reuse details during booking.</span></div> :
               <div className="traveller-list">
                 {items.map((item)=>(
                   <article key={item.id}>
                     <div className="traveller-avatar">{item.full_name.charAt(0).toUpperCase()}</div>
                     <div className="traveller-copy">
                       <div><strong>{item.full_name}</strong>{item.is_default&&<span className="default-chip"><IonIcon icon={starOutline}/>Default</span>}</div>
                       <p>{item.age} years · {item.gender.toLowerCase()}{item.relation?` · ${item.relation}`:''}</p>
                     </div>
                     <div className="traveller-row-actions">
                       <button type="button" onClick={()=>edit(item)} aria-label={`Edit ${item.full_name}`}><IonIcon icon={createOutline}/></button>
                       <button type="button" className="danger" onClick={()=>setDeleteTarget(item)} aria-label={`Delete ${item.full_name}`}><IonIcon icon={trashOutline}/></button>
                     </div>
                   </article>
                 ))}
               </div>}
            </section>
          </main>
        </div>

        <IonAlert
          isOpen={Boolean(deleteTarget)}
          onDidDismiss={()=>setDeleteTarget(null)}
          header="Remove saved traveller?"
          message={deleteTarget?`${deleteTarget.full_name} will be removed from your saved travellers.`:''}
          buttons={[
            {text:'Cancel',role:'cancel'},
            {text:'Remove',role:'destructive',handler:()=>{void remove();}},
          ]}
        />

        <IonToast
          isOpen={Boolean(toast)}
          message={toast?.message}
          color={toast?.color}
          duration={2200}
          position="bottom"
          onDidDismiss={()=>setToast(null)}
        />
      </IonContent>
    </IonPage>
  );
}