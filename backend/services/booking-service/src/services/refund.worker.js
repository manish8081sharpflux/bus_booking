const pool=require('../infrastructure/database/postgres.connection')
const paymentProvider=require('../integrations/payment.provider')

let running=false
async function processRefunds(){
  if(running)return
  running=true

  try{
    const {rows}=await pool.query(
      `WITH candidates AS (
         SELECT r.id
         FROM refunds r
         WHERE r.status='PENDING'
           AND (
             r.next_retry_at IS NULL
             OR r.next_retry_at<=NOW()
           )
           AND r.retry_count<8
         ORDER BY r.created_at
         FOR UPDATE SKIP LOCKED
         LIMIT 20
       ),
       claimed AS (
         UPDATE refunds r
         SET last_attempt_at=NOW(),
             retry_count=r.retry_count+1,
             next_retry_at=NOW()+INTERVAL '5 minutes',
             updated_at=NOW()
         FROM candidates c
         WHERE r.id=c.id
         RETURNING
           r.id,
           r.payment_id,
           r.amount,
           r.retry_count
       )
       SELECT
         c.id,
         c.payment_id,
         c.amount,
         c.retry_count,
         p.provider_payment_id,
         p.amount payment_amount,
         b.booking_reference
       FROM claimed c
       JOIN payments p ON p.id=c.payment_id
       LEFT JOIN bookings b ON b.id=p.booking_id
       ORDER BY c.id`,
    )

    for(const item of rows){
      try{
        const result=await paymentProvider.refund({
          paymentId:item.provider_payment_id,
          amount:item.amount,
          notes:{
            reason:'operator_trip_cancellation',
            bookingReference:item.booking_reference,
          },
          idempotencyKey:`refund_${String(item.id).replace(/-/g,'_')}`,
        })

        const client=await pool.connect()

        try{
          await client.query('BEGIN')

          const refundStatus=
            result.status==='processed'
              ? 'REFUNDED'
              : 'PENDING'

          await client.query(
            `UPDATE refunds
             SET provider_refund_id=$2,
                 status=$3::payment_status,
                 failure_message=NULL,
                 next_retry_at=NULL,
                 completed_at=CASE
                   WHEN $3='REFUNDED'
                     THEN COALESCE(completed_at,NOW())
                   ELSE completed_at
                 END,
                 updated_at=NOW()
             WHERE id=$1::uuid`,
            [
              item.id,
              result.id,
              refundStatus,
            ],
          )

          if(refundStatus==='REFUNDED'){
            const totals=(await client.query(
              `SELECT
                 p.amount payment_amount,
                 COALESCE(
                   SUM(r.amount) FILTER(
                     WHERE r.status='REFUNDED'
                   ),
                   0
                 ) refunded_amount
               FROM payments p
               LEFT JOIN refunds r ON r.payment_id=p.id
               WHERE p.id=$1::uuid
               GROUP BY p.id,p.amount
               FOR UPDATE OF p`,
              [item.payment_id],
            )).rows[0]

            if(!totals){
              throw new Error(
                'Parent payment not found while synchronizing refund state.',
              )
            }

            const paymentStatus=
              Number(totals.refunded_amount)>=Number(totals.payment_amount)
                ? 'REFUNDED'
                : 'PARTIALLY_REFUNDED'

            await client.query(
              `UPDATE payments
               SET status=$2::payment_status,
                   updated_at=NOW()
               WHERE id=$1::uuid
                 AND status IN(
                   'CAPTURED',
                   'PARTIALLY_REFUNDED',
                   'REFUNDED'
                 )`,
              [
                item.payment_id,
                paymentStatus,
              ],
            )
          }

          await client.query('COMMIT')
        }catch(error){
          await client.query('ROLLBACK')
          throw error
        }finally{
          client.release()
        }
      }catch(error){
        await pool.query(
          `UPDATE refunds
           SET failure_message=$2,
               next_retry_at=NOW()+(
                 LEAST(
                   3600,
                   POWER(2,retry_count)*30
                 )::text || ' seconds'
               )::interval,
               status=CASE
                 WHEN retry_count>=8
                   THEN 'FAILED'::payment_status
                 ELSE 'PENDING'::payment_status
               END,
               updated_at=NOW()
           WHERE id=$1::uuid`,
          [
            item.id,
            String(
              error.message||error,
            ).slice(0,1000),
          ],
        )
      }
    }
  }finally{
    running=false
  }
}
function startRefundWorker(){
  void processRefunds()
  const timer=setInterval(()=>void processRefunds(),30000)
  timer.unref?.()
  return timer
}
module.exports={processRefunds,startRefundWorker}
