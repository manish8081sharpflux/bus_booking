const digits=(value)=>String(value||'').replace(/\D/g,'');
function normalizePhone(value){
  const n=digits(value);
  if(n.length===12&&n.startsWith('91')) return n.slice(2);
  return n.length>10?n.slice(-10):n;
}
module.exports={digits,normalizePhone};
