const api=(process.env.BUSGO_API_URL||'http://127.0.0.1:4000').replace(/\/$/,'');
const web=(process.env.BUSGO_WEB_URL||'http://127.0.0.1:5173').replace(/\/$/,'');
const admin=(process.env.BUSGO_ADMIN_URL||'http://127.0.0.1:5174').replace(/\/$/,'');
async function req(name,url,statuses){const c=new AbortController();const t=setTimeout(()=>c.abort(),8000);try{const r=await fetch(url,{signal:c.signal,redirect:'manual'});if(!statuses.includes(r.status))throw new Error(`${r.status}`);console.log(`✓ ${name} (${r.status})`)}finally{clearTimeout(t)}}
try{
 await req('API health',`${api}/health`,[200,204]);
 await req('anonymous booking data protected',`${api}/api/bookings/customer`,[401,403,404]);
 await req('customer web reachable',web,[200,301,302,304]);
 await req('admin web reachable',admin,[200,301,302,304]);
 console.log('\nLive BusGo smoke validation passed.');
}catch(e){console.error(`\nLive validation failed: ${e.message}`);process.exit(1)}
