const pool=require('../infrastructure/database/postgres.connection')
const paymentProvider=require('../integrations/payment.provider')

let running=false
async function processRefunds(){
  if(running)return
  running=true
  try{
    const {rows}=await pool.query(`SELECT r.id,r.amount,r.retry_count,p.provider_payment_id,b.booking_reference
      FROM refunds r JOIN payments p ON p.id=r.payment_id LEFT JOIN bookings b ON b.id=r.booking_id
      WHERE r.status='PENDING' AND (r.next_retry_at IS NULL OR r.next_retry_at<=NOW()) AND r.retry_count<8
      ORDER BY r.created_at LIMIT 20`)
    for(const item of rows){
      try{
        await pool.query(`UPDATE refunds SET last_attempt_at=NOW(),retry_count=retry_count+1 WHERE id=$1::uuid`,[item.id])
        const result=await paymentProvider.refund({paymentId:item.provider_payment_id,amount:item.amount,notes:{reason:'operator_trip_cancellation',bookingReference:item.booking_reference},idempotencyKey:`refund_${String(item.id).replace(/-/g,'_')}`})
        await pool.query(`UPDATE refunds SET provider_refund_id=$2,status=$3::payment_status,failure_message=NULL,next_retry_at=NULL,updated_at=NOW() WHERE id=$1::uuid`,[item.id,result.id,result.status==='processed'?'REFUNDED':'PENDING'])
      }catch(error){
        await pool.query(`UPDATE refunds SET failure_message=$2,next_retry_at=NOW()+(LEAST(3600,POWER(2,retry_count)*30)::text||' seconds')::interval,status=CASE WHEN retry_count>=8 THEN 'FAILED'::payment_status ELSE 'PENDING'::payment_status END,updated_at=NOW() WHERE id=$1::uuid`,[item.id,String(error.message||error).slice(0,1000)])
      }
    }
  }finally{running=false}
}

function startRefundWorker(){
  void processRefunds()
  const timer=setInterval(()=>void processRefunds(),30000)
  timer.unref?.()
  return timer
}
module.exports={processRefunds,startRefundWorker}
