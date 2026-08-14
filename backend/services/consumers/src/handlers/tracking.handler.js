const crypto=require('crypto')
const db=require('../infrastructure/database/postgres.connection')

async function handleTrackingEvent(event) {
  if(event.eventType!=='tracking.updated'||!event.payload?.tripId)return
  const p=event.payload
  const key=event.eventId||crypto.createHash('sha256').update(`${p.tripId}:${p.timestamp}:${p.lat}:${p.lng}`).digest('hex')
  const receipt=await db.query(`INSERT INTO tracking_event_receipts(event_key,trip_id,event_type,recorded_at) VALUES($1,$2::uuid,$3,$4::timestamptz) ON CONFLICT DO NOTHING RETURNING event_key`,[key,p.tripId,event.eventType,p.timestamp])
  if(!receipt.rowCount)return
  const stopped=Number(p.speed||0)<2
  if(stopped){
    const bookings=await db.query(`SELECT id,customer_id FROM bookings WHERE trip_id=$1::uuid AND status='CONFIRMED'`,[p.tripId])
    if(bookings.rowCount && new Date(p.timestamp).getTime()<Date.now()-15*60000){
      for(const b of bookings.rows)await db.query(`INSERT INTO notification_outbox(user_id,booking_id,channel,template_key,payload) VALUES($1::uuid,$2::uuid,'IN_APP','TRACKING_STALE',$3::jsonb)`,[b.customer_id,b.id,JSON.stringify({tripId:p.tripId,lastLocationAt:p.timestamp})])
      await db.query(`UPDATE tracking_event_receipts SET alerts_created=$2 WHERE event_key=$1`,[key,bookings.rowCount])
    }
  }
}

module.exports = { handleTrackingEvent };
