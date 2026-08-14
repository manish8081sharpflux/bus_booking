import { useEffect, useMemo, useState } from 'react';
import { BusFront, CheckCircle2, Clock3, RefreshCw, Search, ShieldCheck } from 'lucide-react';
import { AdminBus, getAdminBuses } from './services/admin-operations-api';
import './admin-operations.css';

const filters = ['ALL','ACTIVE','PENDING_APPROVAL','REJECTED'];

export function AllBusesPage() {
  const [items,setItems]=useState<AdminBus[]>([]); const [loading,setLoading]=useState(true); const [error,setError]=useState('');
  const [query,setQuery]=useState(''); const [filter,setFilter]=useState('ALL');
  async function load(){try{setLoading(true);setError('');setItems(await getAdminBuses())}catch(e){setError(e instanceof Error?e.message:'Unable to load buses.')}finally{setLoading(false)}}
  useEffect(()=>{void load()},[]);
  const visible=useMemo(()=>items.filter(b=>(filter==='ALL'||b.status===filter)&&`${b.name} ${b.registration_number} ${b.operator_name} ${b.bus_type}`.toLowerCase().includes(query.toLowerCase())),[items,filter,query]);
  const stats={total:items.length,active:items.filter(x=>x.status==='ACTIVE').length,pending:items.filter(x=>x.status==='PENDING_APPROVAL').length,rejected:items.filter(x=>x.status==='REJECTED').length};
  return <div className="admin-ops-page">
    <PageHeader title="All buses" description="Monitor the complete fleet across every operator, including verification and compliance readiness." loading={loading} onRefresh={load}/>
    {error&&<div className="admin-ops-error">{error}</div>}
    <div className="admin-ops-stats"><Stat icon={<BusFront/>} label="Total buses" value={stats.total}/><Stat icon={<CheckCircle2/>} label="Active" value={stats.active}/><Stat icon={<Clock3/>} label="Pending review" value={stats.pending}/><Stat icon={<ShieldCheck/>} label="Rejected" value={stats.rejected}/></div>
    <section className="admin-ops-panel"><Toolbar query={query} setQuery={setQuery} filters={filters} filter={filter} setFilter={setFilter}/>
      <div className="admin-ops-table-wrap"><table className="admin-ops-table"><thead><tr><th>Bus</th><th>Operator</th><th>Configuration</th><th>Compliance</th><th>Status</th><th>Added</th></tr></thead><tbody>
        {visible.map(bus=><tr key={bus.id}><td><strong>{bus.name}</strong><span className="admin-ops-sub">{bus.registration_number} · {bus.manufacturer||'—'} {bus.model||''}</span></td><td><strong>{bus.operator_name}</strong><span className="admin-ops-sub">{bus.bus_type}</span></td><td><strong>{bus.configured_seats}/{bus.seat_capacity} seats</strong><span className="admin-ops-sub">{human(bus.deck_type)} · {bus.document_count} docs</span></td><td><Badge value={bus.compliance_status||'PENDING'}/><span className="admin-ops-sub">{expiryHint(bus)}</span></td><td><Badge value={bus.status}/></td><td>{date(bus.created_at)}</td></tr>)}
      </tbody></table>{!loading&&!visible.length&&<Empty icon={<BusFront/>} title="No buses found" text="Try another status or search term."/>}</div>
    </section>
  </div>
}
function expiryHint(b:AdminBus){const ds=[b.insurance_expiry,b.permit_expiry,b.fitness_expiry,b.puc_expiry].filter(Boolean) as string[];if(!ds.length)return'No expiry data';const next=ds.map(x=>new Date(x)).filter(x=>!Number.isNaN(x.getTime())).sort((a,b)=>a.getTime()-b.getTime())[0];return next?`Next expiry ${date(next.toISOString())}`:'No expiry data'}
export function PageHeader({title,description,loading,onRefresh}:{title:string;description:string;loading:boolean;onRefresh:()=>void}){return <header className="admin-ops-header"><div><span className="admin-ops-eyebrow">PLATFORM OPERATIONS</span><h1>{title}</h1><p>{description}</p></div><div className="admin-ops-actions"><button className="admin-ops-btn" onClick={onRefresh} disabled={loading}><RefreshCw className={loading?'admin-ops-loading':''}/>Refresh</button></div></header>}
export function Stat({icon,label,value}:{icon:React.ReactNode;label:string;value:string|number}){return <article className="admin-ops-stat"><span className="admin-ops-stat-icon">{icon}</span><div><span>{label}</span><strong>{value}</strong></div></article>}
export function Toolbar({query,setQuery,filters,filter,setFilter}:{query:string;setQuery:(v:string)=>void;filters:string[];filter:string;setFilter:(v:string)=>void}){return <div className="admin-ops-toolbar"><div className="admin-ops-search"><Search/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search…"/></div><div className="admin-ops-filters">{filters.map(f=><button key={f} className={`admin-ops-filter ${filter===f?'active':''}`} onClick={()=>setFilter(f)}>{human(f)}</button>)}</div></div>}
export function Badge({value}:{value:string}){return <span className={`admin-ops-badge ${String(value).toLowerCase()}`}>{human(value)}</span>}
export function Empty({icon,title,text}:{icon:React.ReactNode;title:string;text:string}){return <div className="admin-ops-empty">{icon}<h3>{title}</h3><p>{text}</p></div>}
export const human=(v:string)=>String(v||'—').replaceAll('_',' ').toLowerCase().replace(/\b\w/g,c=>c.toUpperCase());
export const date=(v:string)=>{const d=new Date(v);return Number.isNaN(d.getTime())?'—':new Intl.DateTimeFormat('en-IN',{day:'2-digit',month:'short',year:'numeric'}).format(d)};
export const money=(v:string|number,c='INR')=>new Intl.NumberFormat('en-IN',{style:'currency',currency:c,maximumFractionDigits:0}).format(Number(v)||0);
