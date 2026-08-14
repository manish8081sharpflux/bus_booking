import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { IonButton, IonContent, IonIcon, IonPage, IonSpinner } from '@ionic/react';
import { busOutline, checkmarkCircleOutline, shieldCheckmarkOutline, timeOutline } from 'ionicons/icons';
import { validateUrlToken } from '../../utils/validation';
import './WhatsAppCheckoutPage.css';

declare global {
  interface Window { Razorpay?: new (options: any) => { open: () => void }; }
}

const API = import.meta.env.VITE_BOOKING_API_URL || 'http://localhost:4000/api/bookings';

type Checkout = {
  booking_id:string; booking_reference:string; status:string; total_amount:string|number; currency:string;
  expires_at:string; service_number:string; departure_at:string; arrival_at:string; source_city:string; destination_city:string;
  operator:string; bus:string; boarding_point:string; dropping_point:string; passengers:Array<{name:string;seat:string;fare:number}>;
  paymentProvider:string; publicKey?:string|null;
};

async function call<T>(path:string, options?:RequestInit):Promise<T>{
  const r=await fetch(`${API}${path}`,options); const b=await r.json().catch(()=>({}));
  if(!r.ok||b.success===false) throw new Error(b.message||b.error||'Request failed');
  return b.data??b;
}

function loadRazorpay(){
  return new Promise<boolean>((resolve)=>{
    if(window.Razorpay) return resolve(true);
    const script=document.createElement('script'); script.src='https://checkout.razorpay.com/v1/checkout.js';
    script.onload=()=>resolve(true); script.onerror=()=>resolve(false); document.body.appendChild(script);
  });
}

export default function WhatsAppCheckoutPage(){
  const {token}=useParams<{token:string}>(); const [data,setData]=useState<Checkout|null>(null); const [busy,setBusy]=useState(true); const [message,setMessage]=useState('');
  const expired=useMemo(()=>data?new Date(data.expires_at).getTime()<=Date.now():false,[data]);
  async function load(){
    const tokenCheck=validateUrlToken(token||'');
    if(!tokenCheck.valid){setMessage(tokenCheck.message);setData(null);setBusy(false);return;}
    try{
      setBusy(true);setMessage('');
      const checkout=await call<Checkout>(`/whatsapp/checkout/${encodeURIComponent(token)}`);
      const amount=Number(checkout.total_amount);
      if(!checkout.booking_id||!checkout.booking_reference||!checkout.source_city||!checkout.destination_city||!Number.isFinite(amount)||amount<0){
        throw new Error('The booking service returned incomplete checkout information.');
      }
      if(!Array.isArray(checkout.passengers)||checkout.passengers.some((p)=>!p?.name||!p?.seat)){
        throw new Error('Passenger information is incomplete. Please restart the booking from WhatsApp.');
      }
      setData(checkout);
    }catch(e){setMessage((e as Error).message);setData(null)}finally{setBusy(false)}
  }
  useEffect(()=>{void load()},[token]);

  async function pay(){
    const tokenCheck=validateUrlToken(token||'');
    if(!tokenCheck.valid){setMessage(tokenCheck.message);return;}
    if(!data||expired||data.status!=='PENDING_PAYMENT')return; try{setBusy(true);setMessage('');
      const order:any=await call(`/whatsapp/checkout/${encodeURIComponent(token)}/order`,{method:'POST'});
      if(order.demo){await call(`/whatsapp/checkout/${encodeURIComponent(token)}/demo-complete`,{method:'POST'});await load();return;}
      const ok=await loadRazorpay(); if(!ok||!window.Razorpay) throw new Error('Unable to load the secure payment window.');
      const rz=new window.Razorpay({
        key:order.publicKey, amount:order.order.amount, currency:order.order.currency, name:'BusGo', description:`Bus booking ${data.booking_reference}`,
        order_id:order.order.id,
        prefill:{}, theme:{color:'#e11d48'},
        handler:async(response:any)=>{
          try{setBusy(true);await call(`/whatsapp/checkout/${encodeURIComponent(token)}/verify`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({providerPaymentId:response.razorpay_payment_id,providerOrderId:response.razorpay_order_id,signature:response.razorpay_signature,method:'UPI'})});await load();}
          catch(e){setMessage((e as Error).message);setBusy(false)}
        }
      }); rz.open();
    }catch(e){setMessage((e as Error).message);setBusy(false)}
  }

  return <IonPage><IonContent fullscreen>
    <div className="wa-checkout-shell">
      <header className="wa-checkout-brand"><div className="wa-brand-mark"><IonIcon icon={busOutline}/></div><div><strong>BusGo</strong><span>WhatsApp secure checkout</span></div></header>
      {busy&&!data?<div className="wa-state"><IonSpinner/><p>Loading your booking…</p></div>:message&&!data?<div className="wa-card wa-error"><h2>Checkout unavailable</h2><p>{message}</p></div>:data&&<>
        <section className={`wa-card wa-hero ${data.status==='CONFIRMED'?'confirmed':''}`}>
          <div className="wa-status-icon"><IonIcon icon={data.status==='CONFIRMED'?checkmarkCircleOutline:timeOutline}/></div>
          <div><span className="wa-eyebrow">{data.status==='CONFIRMED'?'BOOKING CONFIRMED':'SEATS RESERVED'}</span><h1>{data.source_city} <span>→</span> {data.destination_city}</h1><p>{data.operator} · {data.bus}</p></div>
          <div className="wa-pnr"><span>PNR</span><strong>{data.booking_reference}</strong></div>
        </section>
        <section className="wa-card wa-grid">
          <div><span>Departure</span><strong>{new Date(data.departure_at).toLocaleString('en-IN',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}</strong></div>
          <div><span>Boarding</span><strong>{data.boarding_point}</strong></div>
          <div><span>Dropping</span><strong>{data.dropping_point}</strong></div>
          <div><span>Seats</span><strong>{(data.passengers||[]).map(p=>p.seat).join(', ')}</strong></div>
        </section>
        <section className="wa-card wa-passengers"><h3>Passengers</h3>{(data.passengers||[]).map((p,i)=><div className="wa-passenger" key={`${p.seat}-${i}`}><div><span>{i+1}</span><strong>{p.name}</strong></div><b>Seat {p.seat}</b></div>)}</section>
        <section className="wa-card wa-total"><div><span>Total payable</span><strong>₹{Number(data.total_amount).toFixed(2)}</strong></div>{data.status==='PENDING_PAYMENT'&&!expired?<IonButton expand="block" className="wa-pay" disabled={busy} onClick={pay}>{busy?<IonSpinner name="crescent"/>:`Pay securely ₹${Number(data.total_amount).toFixed(0)}`}</IonButton>:data.status==='CONFIRMED'?<div className="wa-success"><IonIcon icon={checkmarkCircleOutline}/> Payment received. Your ticket is confirmed.</div>:<div className="wa-expired">The payment window has expired. Return to WhatsApp and start a new booking.</div>}</section>
        {message&&<div className="wa-inline-error">{message}</div>}
        <footer className="wa-secure"><IonIcon icon={shieldCheckmarkOutline}/><span>Your payment is verified by BusGo's server. Never share OTP, PIN or UPI PIN in WhatsApp.</span></footer>
      </>}
    </div>
  </IonContent></IonPage>
}
