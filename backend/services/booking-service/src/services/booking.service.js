const crypto = require('crypto')
const pool = require('../infrastructure/database/postgres.connection')
const paymentProvider = require('../integrations/payment.provider')
const { evaluateFare, roundMoney } = require('./pricing.engine')

const fail = (message, status = 400) => Object.assign(new Error(message), { status })
const reference = () => `BUS${Date.now().toString(36).toUpperCase()}${crypto.randomBytes(2).toString('hex').toUpperCase()}`

const BUS_BOOKABILITY_SQL = `
  b.status = 'ACTIVE'
  AND b.operational_status = 'ACTIVE'
  AND b.approval_status = 'APPROVED'
  AND EXISTS (
    SELECT 1
    FROM bus_compliance bc
    WHERE bc.bus_id = b.id
      AND bc.verification_status = 'VERIFIED'
      AND bc.insurance_expiry >= CURRENT_DATE
      AND bc.permit_expiry >= CURRENT_DATE
      AND bc.fitness_expiry >= CURRENT_DATE
      AND (
        bc.puc_expiry IS NULL
        OR bc.puc_expiry >= CURRENT_DATE
      )
  )
  AND EXISTS (
    SELECT 1
    FROM bus_documents bd
    WHERE bd.bus_id = b.id
  )
  AND NOT EXISTS (
    SELECT 1
    FROM bus_documents bd
    WHERE bd.bus_id = b.id
      AND bd.verification_status <> 'VERIFIED'
  )
`

const customerBookabilityWhere = (
  alias = 'b',
) =>
  BUS_BOOKABILITY_SQL.replace(
    /\bb\./g,
    `${alias}.`,
  )
const assertBookingStillBookable =
  async (
    client,
    bookingId,
  ) => {
    const { rows } =
      await client.query(
        `SELECT
           bk.id,
           bk.status,
           t.id AS trip_id,
           t.status AS trip_status,
           t.departure_at,
           b.id AS bus_id
         FROM bookings bk
         JOIN trips t
           ON t.id = bk.trip_id
         JOIN buses b
           ON b.id = t.bus_id
         WHERE bk.id = $1::uuid
           AND t.status = 'SCHEDULED'
           AND t.departure_at > NOW()
           AND ${customerBookabilityWhere('b')}
         FOR SHARE OF t, b`,
        [
          bookingId,
        ],
      )

    if (!rows[0]) {
      throw fail(
        'This trip or bus is no longer eligible for booking. Payment cannot be confirmed.',
        409,
      )
    }

    return rows[0]
  }
class BookingService {
  async searchTrips({ from, to, date }) {
    if (!from || !to || !/^\d{4}-\d{2}-\d{2}$/.test(date || '')) throw fail('From, to and date are required.', 422)
    await pool.query('SELECT release_expired_seat_holds()')
    const { rows } = await pool.query(`SELECT t.id,t.service_number,
      COALESCE(origin.scheduled_departure_at,origin.departure_at,origin.scheduled_at,t.departure_at) departure_at,
      COALESCE(destination.scheduled_arrival_at,destination.arrival_at,destination.scheduled_at,t.arrival_at) arrival_at,
      t.base_fare,t.currency,
      o.display_name AS operator,b.name AS bus,b.bus_type,b.amenities,origin.city source_city,destination.city destination_city,
      COALESCE((SELECT MIN(tf.fare) FROM trip_fares tf WHERE tf.trip_id=t.id AND tf.origin_stop_id=origin.id AND tf.destination_stop_id=destination.id),t.base_fare) AS starting_fare,
      origin.id AS origin_stop_id,destination.id AS destination_stop_id,
      COUNT(i.bus_seat_id)::int AS total_seats,
      COUNT(i.bus_seat_id) FILTER(WHERE i.status IN ('AVAILABLE','HELD','BOOKED') AND NOT EXISTS(
        SELECT 1 FROM trip_seat_segment_allocations a WHERE a.trip_id=t.id AND a.bus_seat_id=i.bus_seat_id
          AND a.segment_range && int4range(origin.stop_order,destination.stop_order,'[)')
      ))::int AS available_seats,
      COALESCE((SELECT ROUND(AVG(cr.rating)::numeric,1) FROM customer_reviews cr WHERE cr.operator_id=t.operator_id AND cr.status='PUBLISHED'),0) AS rating,
      COALESCE((SELECT COUNT(*) FROM customer_reviews cr WHERE cr.operator_id=t.operator_id AND cr.status='PUBLISHED'),0)::int AS review_count,
      COALESCE((SELECT JSON_AGG(JSON_BUILD_OBJECT('id',ts.id,'name',ts.location_name,'city',ts.city,'address',ts.address,'landmark',rs.landmark,'latitude',rs.latitude,'longitude',rs.longitude,'contactNumber',rs.contact_number) ORDER BY ts.stop_order) FROM trip_stops ts LEFT JOIN route_stops rs ON rs.route_id=t.route_id AND rs.stop_order=ts.stop_order WHERE ts.trip_id=t.id AND ts.is_boarding_allowed),'[]') AS boarding_points,
      COALESCE((SELECT JSON_AGG(JSON_BUILD_OBJECT('id',ts.id,'name',ts.location_name,'city',ts.city,'address',ts.address,'landmark',rs.landmark,'latitude',rs.latitude,'longitude',rs.longitude,'contactNumber',rs.contact_number) ORDER BY ts.stop_order) FROM trip_stops ts LEFT JOIN route_stops rs ON rs.route_id=t.route_id AND rs.stop_order=ts.stop_order WHERE ts.trip_id=t.id AND ts.is_dropping_allowed),'[]') AS dropping_points
      FROM trips t JOIN operators o ON o.id=t.operator_id JOIN buses b ON b.id=t.bus_id JOIN routes r ON r.id=t.route_id
      JOIN trip_stops origin ON origin.trip_id=t.id AND origin.is_boarding_allowed AND (LOWER(origin.city)=LOWER($1) OR LOWER(origin.location_name)=LOWER($1))
      JOIN trip_stops destination ON destination.trip_id=t.id AND destination.is_dropping_allowed AND destination.stop_order>origin.stop_order
        AND (LOWER(destination.city)=LOWER($2) OR LOWER(destination.location_name)=LOWER($2))
      LEFT JOIN trip_seat_inventory i ON i.trip_id=t.id
      WHERE t.status='SCHEDULED' AND ${customerBookabilityWhere('b')} AND COALESCE(origin.scheduled_departure_at,origin.departure_at,origin.scheduled_at,t.departure_at)::date=$3::date
      GROUP BY t.id,o.display_name,b.name,b.bus_type,b.amenities,origin.id,destination.id
      HAVING COUNT(i.bus_seat_id) FILTER(WHERE NOT EXISTS(SELECT 1 FROM trip_seat_segment_allocations a WHERE a.trip_id=t.id AND a.bus_seat_id=i.bus_seat_id AND a.segment_range && int4range(origin.stop_order,destination.stop_order,'[)')))>0
      ORDER BY departure_at`, [from.trim(),to.trim(),date])
    const priced=await Promise.all(rows.map(async row=>{
      const rules=(await pool.query(`SELECT * FROM trip_fare_rules WHERE trip_id=$1::uuid AND is_active ORDER BY priority,created_at`,[row.id])).rows
      const result=evaluateFare({baseFare:Number(row.starting_fare),rules,departureAt:row.departure_at,totalSeats:Number(row.total_seats),availableSeats:Number(row.available_seats)})
      return {...row,base_starting_fare:String(result.baseFare),starting_fare:String(result.finalFare),dynamic_adjustment:result.adjustmentAmount,pricing_rules_applied:result.appliedRules.map(x=>({name:x.name,delta:x.delta,after:x.after}))}
    }))
    return priced
  }

  async seatMap(tripId, {originStopId=null,destinationStopId=null}={}) {
    await pool.query('SELECT release_expired_seat_holds()')
    const tripResult = await pool.query(`SELECT t.id,t.service_number,t.departure_at,t.arrival_at,t.currency,
      o.display_name operator,b.name bus,b.bus_type,b.amenities,r.source_city,r.destination_city,
      (SELECT id FROM trip_stops WHERE trip_id=t.id ORDER BY stop_order LIMIT 1) origin_stop_id,
      (SELECT location_name FROM trip_stops WHERE trip_id=t.id ORDER BY stop_order LIMIT 1) boarding_point,
      (SELECT id FROM trip_stops WHERE trip_id=t.id ORDER BY stop_order DESC LIMIT 1) destination_stop_id,
      (SELECT location_name FROM trip_stops WHERE trip_id=t.id ORDER BY stop_order DESC LIMIT 1) dropping_point
      FROM trips t JOIN operators o ON o.id=t.operator_id JOIN buses b ON b.id=t.bus_id JOIN routes r ON r.id=t.route_id
      WHERE t.id=$1::uuid AND t.status='SCHEDULED' AND ${customerBookabilityWhere('b')} AND t.departure_at>NOW()`,[tripId])
    if(!tripResult.rows[0]) throw fail('This trip is not available for booking.',404)
    originStopId=originStopId||tripResult.rows[0].origin_stop_id
    destinationStopId=destinationStopId||tripResult.rows[0].destination_stop_id
    const segment=(await pool.query(`SELECT os.stop_order origin_order,ds.stop_order destination_order FROM trip_stops os JOIN trip_stops ds ON ds.trip_id=os.trip_id WHERE os.id=$1::uuid AND ds.id=$2::uuid AND os.trip_id=$3::uuid AND os.stop_order<ds.stop_order`,[originStopId,destinationStopId,tripId])).rows[0]
    if(!segment) throw fail('Invalid boarding and dropping segment.',422)
    tripResult.rows[0].origin_stop_id=originStopId;tripResult.rows[0].destination_stop_id=destinationStopId
    const { rows } = await pool.query(`SELECT bs.id,bs.seat_number,bs.deck,bs.row_number,bs.column_number,bs.seat_type,
      bs.is_window,bs.is_female_reserved,
      CASE WHEN i.status='BLOCKED' OR EXISTS(SELECT 1 FROM trip_seat_segment_allocations a WHERE a.trip_id=i.trip_id AND a.bus_seat_id=i.bus_seat_id AND a.segment_range && int4range($2::int,$3::int,'[)')) THEN 'BOOKED' ELSE 'AVAILABLE' END status,
      (SELECT UPPER(bp.gender) FROM booking_passengers bp
       WHERE bp.booking_id=i.booking_id AND bp.bus_seat_id=bs.id LIMIT 1) booked_gender,
      COALESCE((SELECT tf.fare FROM trip_fares tf WHERE tf.trip_id=i.trip_id AND tf.seat_type=bs.seat_type AND tf.origin_stop_id=$4::uuid AND tf.destination_stop_id=$5::uuid LIMIT 1),
        (SELECT tf.fare FROM trip_fares tf WHERE tf.trip_id=i.trip_id AND tf.seat_type=bs.seat_type ORDER BY tf.fare LIMIT 1),t.base_fare) fare
      FROM trip_seat_inventory i JOIN bus_seats bs ON bs.id=i.bus_seat_id JOIN trips t ON t.id=i.trip_id
      WHERE i.trip_id=$1::uuid ORDER BY bs.deck,bs.row_number,bs.column_number`, [tripId,segment.origin_order,segment.destination_order,originStopId,destinationStopId])
    const stopsResult = await pool.query(`SELECT ts.id,ts.stop_order,ts.city,ts.location_name,ts.address,ts.is_boarding_allowed,ts.is_dropping_allowed,
      rs.landmark,rs.latitude,rs.longitude,rs.contact_number,
      CASE WHEN ts.stop_order=1 THEN t.departure_at WHEN ts.stop_order=(SELECT MAX(x.stop_order) FROM trip_stops x WHERE x.trip_id=ts.trip_id) THEN t.arrival_at ELSE ts.scheduled_at END AS scheduled_at
      FROM trip_stops ts JOIN trips t ON t.id=ts.trip_id LEFT JOIN route_stops rs ON rs.route_id=t.route_id AND rs.stop_order=ts.stop_order
      WHERE ts.trip_id=$1::uuid ORDER BY ts.stop_order`,[tripId])
    const counts=await pool.query(`SELECT COUNT(*)::int total,COUNT(*) FILTER(WHERE status='AVAILABLE')::int available FROM trip_seat_inventory WHERE trip_id=$1::uuid`,[tripId])
    const rules=await pool.query(`SELECT * FROM trip_fare_rules WHERE trip_id=$1::uuid AND is_active ORDER BY priority,created_at`,[tripId])
    const pricedSeats=rows.map(seat=>{
      const priced=evaluateFare({baseFare:Number(seat.fare),rules:rules.rows,departureAt:tripResult.rows[0].departure_at,totalSeats:Number(counts.rows[0].total),availableSeats:Number(counts.rows[0].available)})
      return {...seat,base_fare:priced.baseFare,fare:String(priced.finalFare),dynamic_adjustment:priced.adjustmentAmount,applied_rules:priced.appliedRules}
    })
    return {trip:tripResult.rows[0],seats:pricedSeats,boardingPoints:stopsResult.rows.filter(x=>x.is_boarding_allowed),droppingPoints:stopsResult.rows.filter(x=>x.is_dropping_allowed),pricing:{occupancyPercent:pricedSeats[0]?.applied_rules?.[0]?.pricingContext?.occupancyPercent||undefined}}
  }


  async pricingQuote({ tripId, originStopId, destinationStopId, seatIds = [], couponCode = null, customerId = null }) {
    if (!tripId || !originStopId || !destinationStopId || !Array.isArray(seatIds) || !seatIds.length)
      throw fail('Trip, boarding point, dropping point and at least one seat are required.', 422)
    const uniqueSeatIds=[...new Set(seatIds.map(String))]
    if(uniqueSeatIds.length!==seatIds.length) throw fail('Duplicate seats are not allowed.',422)
    await pool.query('SELECT release_expired_seat_holds()')
    const client=await pool.connect()
    try{
      await client.query('BEGIN')
      const trip=(await client.query(`SELECT t.*,s1.stop_order origin_order,s2.stop_order destination_order
        FROM trips t
        JOIN buses b ON b.id=t.bus_id
        JOIN trip_stops s1 ON s1.id=$2::uuid AND s1.trip_id=t.id
        JOIN trip_stops s2 ON s2.id=$3::uuid AND s2.trip_id=t.id
        WHERE t.id=$1::uuid AND t.status='SCHEDULED' AND ${customerBookabilityWhere('b')} AND t.departure_at>NOW()`,[tripId,originStopId,destinationStopId])).rows[0]
      if(!trip || trip.origin_order>=trip.destination_order) throw fail('Invalid published trip or stop selection.',422)

      const inv=await client.query(`SELECT i.bus_seat_id,bs.seat_number,bs.seat_type,
        CASE WHEN i.status='BLOCKED' OR EXISTS(SELECT 1 FROM trip_seat_segment_allocations a
          WHERE a.trip_id=i.trip_id AND a.bus_seat_id=i.bus_seat_id
            AND a.segment_range && int4range($6::int,$7::int,'[)')) THEN 'UNAVAILABLE' ELSE 'AVAILABLE' END status,
        COALESCE((SELECT tf.fare FROM trip_fares tf
          WHERE tf.trip_id=i.trip_id AND tf.seat_type=bs.seat_type
            AND tf.origin_stop_id=$3::uuid AND tf.destination_stop_id=$4::uuid
          ORDER BY tf.fare LIMIT 1),
          (SELECT tf.fare FROM trip_fares tf WHERE tf.trip_id=i.trip_id AND tf.seat_type=bs.seat_type ORDER BY tf.fare LIMIT 1),
          $5::numeric) base_fare
        FROM trip_seat_inventory i
        JOIN bus_seats bs ON bs.id=i.bus_seat_id
        WHERE i.trip_id=$1::uuid AND i.bus_seat_id=ANY($2::uuid[])`,[tripId,uniqueSeatIds,originStopId,destinationStopId,trip.base_fare,trip.origin_order,trip.destination_order])
      if(inv.rowCount!==uniqueSeatIds.length) throw fail('One or more selected seats do not belong to this trip.',422)
      if(inv.rows.some(x=>x.status!=='AVAILABLE')) throw fail('One or more selected seats are no longer available.',409)

      const counts=(await client.query(`SELECT COUNT(*)::int total,
        COUNT(*) FILTER(WHERE status='AVAILABLE')::int available
        FROM trip_seat_inventory WHERE trip_id=$1::uuid`,[tripId])).rows[0]
      const rules=(await client.query(`SELECT * FROM trip_fare_rules WHERE trip_id=$1::uuid AND is_active ORDER BY priority,created_at`,[tripId])).rows

      const lineItems=inv.rows.map(row=>{
        const result=evaluateFare({baseFare:Number(row.base_fare),rules,departureAt:trip.departure_at,totalSeats:Number(counts.total),availableSeats:Number(counts.available)})
        return {
          seatId:row.bus_seat_id,
          seatNumber:row.seat_number,
          seatType:row.seat_type,
          baseFare:result.baseFare,
          finalFare:result.finalFare,
          adjustmentAmount:result.adjustmentAmount,
          appliedRules:result.appliedRules,
          pricingContext:result.context,
        }
      })
      const baseSubtotal=roundMoney(lineItems.reduce((sum,x)=>sum+x.baseFare,0))
      const subtotalAmount=roundMoney(lineItems.reduce((sum,x)=>sum+x.finalFare,0))
      const dynamicAdjustmentAmount=roundMoney(subtotalAmount-baseSubtotal)

      let discountAmount=0,promotionId=null,normalizedCoupon=null,promotionSnapshot=null
      if(couponCode){
        normalizedCoupon=String(couponCode).trim().toUpperCase()
        const pr=(await client.query(`SELECT * FROM pricing_promotions WHERE UPPER(code)=UPPER($1)
          AND status='ACTIVE' AND NOW() BETWEEN starts_at AND ends_at`,[normalizedCoupon])).rows[0]
        if(!pr) throw fail('Coupon is invalid or expired.',422)
        const eligibility=pr.eligibility||{}
        if(eligibility.minBookingAmount && subtotalAmount<Number(eligibility.minBookingAmount)) throw fail(`Minimum booking amount is ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¹${eligibility.minBookingAmount}.`,422)
        if(pr.operator_id && String(pr.operator_id)!==String(trip.operator_id)) throw fail('This coupon is not valid for the selected operator.',422)
        if(pr.route_id && String(pr.route_id)!==String(trip.route_id)) throw fail('This coupon is not valid for the selected route.',422)
        if(pr.usage_limit){
          const used=await client.query(`SELECT COUNT(*)::int count FROM promotion_redemptions WHERE promotion_id=$1::uuid`,[pr.id])
          if(Number(used.rows[0].count)>=Number(pr.usage_limit)) throw fail('This coupon has reached its usage limit.',409)
        }
        if(pr.per_user_limit && customerId){
          const used=await client.query(`SELECT COUNT(*)::int count FROM promotion_redemptions WHERE promotion_id=$1::uuid AND customer_id=$2::uuid`,[pr.id,customerId])
          if(Number(used.rows[0].count)>=Number(pr.per_user_limit)) throw fail('You have already used this coupon the maximum number of times.',409)
        }
        discountAmount=pr.discount_type==='PERCENTAGE'?subtotalAmount*(Number(pr.discount_value)/100):Number(pr.discount_value)
        if(pr.max_discount_amount) discountAmount=Math.min(discountAmount,Number(pr.max_discount_amount))
        discountAmount=roundMoney(Math.max(0,Math.min(subtotalAmount,discountAmount)))
        promotionId=pr.id
        promotionSnapshot={id:pr.id,code:normalizedCoupon,discountType:pr.discount_type,discountValue:Number(pr.discount_value),maxDiscountAmount:pr.max_discount_amount?Number(pr.max_discount_amount):null}
      }
      const totalAmount=roundMoney(subtotalAmount-discountAmount)
      const snapshot={
        version:1,
        quotedAt:new Date().toISOString(),
        lineItems,
        baseSubtotal,
        dynamicAdjustmentAmount,
        subtotalAmount,
        discountAmount,
        totalAmount,
        promotion:promotionSnapshot,
        currency:trip.currency,
      }
      const quoteReference=`Q${Date.now().toString(36).toUpperCase()}${crypto.randomBytes(3).toString('hex').toUpperCase()}`
      const quote=(await client.query(`INSERT INTO booking_price_quotes(
        quote_reference,customer_id,trip_id,origin_stop_id,destination_stop_id,seat_ids,currency,
        base_subtotal,dynamic_adjustment_amount,subtotal_amount,discount_amount,total_amount,promotion_id,coupon_code,pricing_snapshot,expires_at)
        VALUES($1,$2::uuid,$3::uuid,$4::uuid,$5::uuid,$6::uuid[],$7,$8,$9,$10,$11,$12,$13::uuid,$14,$15::jsonb,NOW()+INTERVAL '5 minutes')
        RETURNING *`,[quoteReference,customerId,tripId,originStopId,destinationStopId,uniqueSeatIds,trip.currency,baseSubtotal,dynamicAdjustmentAmount,subtotalAmount,discountAmount,totalAmount,promotionId,normalizedCoupon,JSON.stringify(snapshot)])).rows[0]
      await client.query('COMMIT')
      return {
        quoteId:quote.id,
        quoteReference:quote.quote_reference,
        tripId,
        originStopId,
        destinationStopId,
        seatIds:uniqueSeatIds,
        currency:trip.currency,
        baseSubtotal,
        dynamicAdjustmentAmount,
        subtotalAmount,
        discountAmount,
        totalAmount,
        lineItems,
        appliedRuleCount:lineItems.reduce((n,x)=>n+x.appliedRules.length,0),
        coupon:promotionSnapshot?{...promotionSnapshot,discountAmount}:null,
        expiresAt:quote.expires_at,
        validForSeconds:300,
      }
    }catch(e){await client.query('ROLLBACK');throw e}finally{client.release()}
  }

  async createBooking({ customerId, customer = {}, tripId, originStopId, destinationStopId, passengers = [], couponCode = null, quoteId = null }) {
    if ((!customerId && (!customer.mobile || !customer.fullName)) || !tripId || !originStopId || !destinationStopId || !passengers.length)
      throw fail('Customer contact, trip, stops and passengers are required.', 422)
    if(!quoteId) throw fail('A valid pricing quote is required before booking.',422)
    if (!customerId) {
      const mobile = String(customer.mobile || '').replace(/\D/g, '')
      const email = String(customer.email || '').trim()
      if (!/^[6-9]\d{9}$/.test(mobile)) throw fail('A valid 10-digit Indian mobile number is required.', 422)
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) throw fail('A valid email address is required.', 422)
    }
    for (const passenger of passengers) {
      const name = String(passenger.fullName || '').trim()
      const age = Number(passenger.age)
      if (!/^[\p{L}\p{M} .'-]{2,80}$/u.test(name) || !Number.isInteger(age) || age < 1 || age > 120 || !['MALE','FEMALE','OTHER'].includes(passenger.gender))
        throw fail('Every passenger requires a valid name, age from 1 to 120, and gender.', 422)
    }
    const seatIds = passengers.map(p => String(p.seatId))
    if (new Set(seatIds).size !== seatIds.length) throw fail('Each passenger must have a different seat.', 422)

    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      await client.query('SELECT release_expired_seat_holds()')

      if (!customerId) {
        const mobile=String(customer.mobile).replace(/\D/g,'')
        const email=String(customer.email||'').trim()||null
        const findCustomer=()=>client.query(`SELECT id FROM platform_users
          WHERE mobile=$1 OR ($2::text IS NOT NULL AND LOWER(email)=LOWER($2))
          ORDER BY CASE WHEN mobile=$1 THEN 0 ELSE 1 END LIMIT 1 FOR UPDATE`,[mobile,email])
        let user=await findCustomer()
        if(user.rows[0]){
          await client.query(`UPDATE platform_users SET full_name=$2,updated_at=NOW() WHERE id=$1::uuid`,
            [user.rows[0].id,String(customer.fullName).trim()])
        }else{
          user=await client.query(`INSERT INTO platform_users(auth_user_id,role,full_name,mobile,email)
            VALUES($1,'CUSTOMER',$2,$3,$4) ON CONFLICT DO NOTHING RETURNING id`,
            [`guest:${mobile}`,String(customer.fullName).trim(),mobile,email])
          if(!user.rows[0]) user=await findCustomer()
        }
        if(!user.rows[0]) throw fail('Unable to resolve the customer account. Please sign in and try again.',409)
        customerId=user.rows[0].id
      }

      const quote=(await client.query(`SELECT * FROM booking_price_quotes
        WHERE id=$1::uuid AND consumed_at IS NULL AND expires_at>NOW() FOR UPDATE`,[quoteId])).rows[0]
      if(!quote) throw fail('Your fare quote has expired. Refresh the price before booking.',409)

      const normalizedQuoteSeats=(quote.seat_ids||[]).map(String).sort()
      const normalizedRequestSeats=[...seatIds].sort()
      if(String(quote.trip_id)!==String(tripId) ||
         String(quote.origin_stop_id)!==String(originStopId) ||
         String(quote.destination_stop_id)!==String(destinationStopId) ||
         JSON.stringify(normalizedQuoteSeats)!==JSON.stringify(normalizedRequestSeats))
        throw fail('Booking details changed after the fare was quoted. Refresh the price and try again.',409)

      const trip=(await client.query(`SELECT t.*,s1.stop_order origin_order,s2.stop_order destination_order
        FROM trips t
        JOIN buses b ON b.id=t.bus_id
        JOIN trip_stops s1 ON s1.id=$2::uuid AND s1.trip_id=t.id
        JOIN trip_stops s2 ON s2.id=$3::uuid AND s2.trip_id=t.id
        WHERE t.id=$1::uuid AND t.status='SCHEDULED' AND ${customerBookabilityWhere('b')} AND t.departure_at>NOW()
        FOR UPDATE OF t`,[tripId,originStopId,destinationStopId])).rows[0]
      if(!trip || trip.origin_order>=trip.destination_order) throw fail('Invalid published trip or stop selection.',422)

      const inventory=await client.query(`SELECT i.bus_seat_id,i.status,
        EXISTS(SELECT 1 FROM trip_seat_segment_allocations a WHERE a.trip_id=i.trip_id AND a.bus_seat_id=i.bus_seat_id
          AND a.segment_range && int4range($3::int,$4::int,'[)')) segment_busy
        FROM trip_seat_inventory i
        WHERE i.trip_id=$1::uuid AND i.bus_seat_id=ANY($2::uuid[])
        FOR UPDATE OF i`,[tripId,seatIds,trip.origin_order,trip.destination_order])
      if(inventory.rowCount!==seatIds.length || inventory.rows.some(x=>x.status==='BLOCKED'||x.segment_busy))
        throw fail('One or more selected seats are no longer available.',409)

      const snapshot=quote.pricing_snapshot||{}
      const lineItems=Array.isArray(snapshot.lineItems)?snapshot.lineItems:[]
      const fareBySeat=new Map(lineItems.map(x=>[String(x.seatId),Number(x.finalFare)]))
      const baseFareBySeat=new Map(lineItems.map(x=>[String(x.seatId),Number(x.baseFare)]))
      const adjustmentBySeat=new Map(lineItems.map(x=>[String(x.seatId),Number(x.adjustmentAmount||0)]))
      if(seatIds.some(id=>!fareBySeat.has(String(id)))) throw fail('Pricing quote is incomplete. Refresh the price.',409)

      const promotionId=quote.promotion_id
      const normalizedCoupon=quote.coupon_code ? String(quote.coupon_code).toUpperCase() : null
      if(promotionId){
        const pr=(await client.query(`SELECT * FROM pricing_promotions WHERE id=$1::uuid
          AND status='ACTIVE' AND NOW() BETWEEN starts_at AND ends_at FOR UPDATE`,[promotionId])).rows[0]
        if(!pr) throw fail('The coupon in this quote is no longer available. Refresh the price.',409)
        if(pr.usage_limit){
          const used=await client.query(`SELECT COUNT(*)::int count FROM promotion_redemptions WHERE promotion_id=$1::uuid`,[pr.id])
          if(Number(used.rows[0].count)>=Number(pr.usage_limit)) throw fail('This coupon has reached its usage limit. Refresh the price.',409)
        }
        if(pr.per_user_limit){
          const used=await client.query(`SELECT COUNT(*)::int count FROM promotion_redemptions WHERE promotion_id=$1::uuid AND customer_id=$2::uuid`,[pr.id,customerId])
          if(Number(used.rows[0].count)>=Number(pr.per_user_limit)) throw fail('You have already used this coupon the maximum number of times.',409)
        }
      }

      const created=await client.query(`INSERT INTO bookings(
        booking_reference,customer_id,operator_id,trip_id,origin_stop_id,destination_stop_id,status,
        subtotal_amount,total_amount,currency,expires_at,promotion_id,coupon_code,discount_amount,
        price_quote_id,dynamic_adjustment_amount,pricing_snapshot)
        VALUES($1,$2::uuid,$3::uuid,$4::uuid,$5::uuid,$6::uuid,'PENDING_PAYMENT',
          $7,$8,$9,NOW()+INTERVAL '10 minutes',$10::uuid,$11,$12,$13::uuid,$14,$15::jsonb)
        RETURNING *`,
        [reference(),customerId,trip.operator_id,tripId,originStopId,destinationStopId,
          Number(quote.subtotal_amount),Number(quote.total_amount),quote.currency,promotionId,normalizedCoupon,
          Number(quote.discount_amount),quote.id,Number(quote.dynamic_adjustment_amount),JSON.stringify(snapshot)])

      for (const passenger of passengers) {
        const sid=String(passenger.seatId)
        await client.query(`INSERT INTO booking_passengers(
          booking_id,bus_seat_id,full_name,age,gender,fare_amount,base_fare_amount,pricing_adjustment_amount)
          VALUES($1::uuid,$2::uuid,$3,$4,$5,$6,$7,$8)`,
          [created.rows[0].id,sid,passenger.fullName,passenger.age||null,passenger.gender||null,
            fareBySeat.get(sid),baseFareBySeat.get(sid),adjustmentBySeat.get(sid)||0])
      }

      for(const seatId of seatIds) await client.query(`INSERT INTO trip_seat_segment_allocations(
        trip_id,bus_seat_id,booking_id,origin_stop_order,destination_stop_order,status,expires_at)
        VALUES($1::uuid,$2::uuid,$3::uuid,$4,$5,'HELD',NOW()+INTERVAL '10 minutes')`,
        [tripId,seatId,created.rows[0].id,trip.origin_order,trip.destination_order])

      if(promotionId){
        await client.query(`INSERT INTO promotion_redemptions(promotion_id,booking_id,customer_id,discount_amount)
          VALUES($1::uuid,$2::uuid,$3::uuid,$4) ON CONFLICT(booking_id) DO NOTHING`,
          [promotionId,created.rows[0].id,customerId,Number(quote.discount_amount)])
        await client.query(`UPDATE pricing_promotions
          SET budget_consumed=budget_consumed+$2,updated_at=NOW() WHERE id=$1::uuid`,
          [promotionId,Number(quote.discount_amount)])
      }

      await client.query(`UPDATE booking_price_quotes
        SET consumed_at=NOW(),booking_id=$2::uuid,customer_id=COALESCE(customer_id,$3::uuid)
        WHERE id=$1::uuid`,[quote.id,created.rows[0].id,customerId])

      await client.query('COMMIT')
      return created.rows[0]
    } catch (error) {
      await client.query('ROLLBACK')
      if(error.code==='23P01') throw fail('One or more selected seats were just taken for this route segment.',409)
      throw error
    } finally {
      client.release()
    }
  }

  async completePayment({ bookingId, idempotencyKey, provider = 'DEMO', providerPaymentId, method = 'UPI' }) {
    if (!idempotencyKey) throw fail('Idempotency-Key is required.', 422)
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      const existing = await client.query('SELECT * FROM payments WHERE idempotency_key=$1::uuid', [idempotencyKey])
      if (existing.rows[0]) {
        await client.query('COMMIT')
        return {...existing.rows[0],ticket:await this.ticket(bookingId)}
      }
      const result = await client.query(`SELECT * FROM bookings WHERE id=$1::uuid FOR UPDATE`, [bookingId]); const booking=result.rows[0]
      if(booking?.status==='CONFIRMED'){
        const captured=await client.query(`SELECT * FROM payments WHERE booking_id=$1::uuid AND status='CAPTURED' ORDER BY created_at DESC LIMIT 1`,[bookingId])
        await client.query('COMMIT')
        return {...(captured.rows[0]||{}),ticket:await this.ticket(bookingId)}
      }
      if (!booking || booking.status!=='PENDING_PAYMENT' || new Date(booking.expires_at)<=new Date()) throw fail('Booking payment window has expired.',409)

      await assertBookingStillBookable(
        client,
        bookingId,
      )
      const payment = await client.query(`INSERT INTO payments(booking_id,provider,provider_payment_id,idempotency_key,amount,currency,status,method)
        VALUES($1::uuid,$2,$3,$4::uuid,$5,$6,'CAPTURED',$7) RETURNING *`, [bookingId,provider,providerPaymentId||crypto.randomUUID(),idempotencyKey,booking.total_amount,booking.currency,method])
      await client.query(`UPDATE bookings SET status='CONFIRMED',updated_at=NOW() WHERE id=$1::uuid`,[bookingId])
      await client.query(`UPDATE trip_seat_segment_allocations SET status='CONFIRMED',expires_at=NULL WHERE booking_id=$1::uuid`,[bookingId])
      await client.query(`INSERT INTO notification_outbox(user_id,booking_id,channel,template_key,payload) VALUES($1::uuid,$2::uuid,'IN_APP','BOOKING_CONFIRMED',$3::jsonb)`,[booking.customer_id,bookingId,JSON.stringify({bookingReference:booking.booking_reference})])
      await client.query('COMMIT'); return {...payment.rows[0],ticket:await this.ticket(bookingId)}
    } catch(error) { await client.query('ROLLBACK'); throw error } finally { client.release() }
  }

  async customerIdForAuth(authUserId) {
    const { rows } = await pool.query(`SELECT id FROM platform_users WHERE auth_user_id=$1 OR auth_user_id=$2 LIMIT 1`, [String(authUserId), `identity:${authUserId}`])
    return rows[0]?.id || null
  }

  async createPaymentOrder({ bookingId, authUserId }) {
    const customerId = await this.customerIdForAuth(authUserId)
    if (!customerId) throw fail('Customer profile is not linked to this account.', 403)
    const { rows } = await pool.query(`SELECT * FROM bookings WHERE id=$1::uuid AND customer_id=$2::uuid`, [bookingId,customerId])
    const booking=rows[0]
    if(!booking || booking.status!=='PENDING_PAYMENT' || new Date(booking.expires_at)<=new Date()) throw fail('Booking is not available for payment.',409)
    const order=await paymentProvider.createOrder({ amount:booking.total_amount,currency:booking.currency,receipt:booking.booking_reference,notes:{bookingId:booking.id} })
    const idempotencyKey=crypto.randomUUID()
    const { rows: paymentRows }=await pool.query(`INSERT INTO payments(booking_id,provider,provider_order_id,idempotency_key,amount,currency,status,provider_payload)
      VALUES($1::uuid,$2,$3,$4::uuid,$5,$6,'PENDING',$7::jsonb) RETURNING *`,[booking.id,paymentProvider.provider,order.id,idempotencyKey,booking.total_amount,booking.currency,JSON.stringify(order)])
    return { payment:paymentRows[0], order, publicKey:paymentProvider.provider==='RAZORPAY'?process.env.RAZORPAY_KEY_ID:null }
  }

  async verifyAndCompletePayment({ bookingId, authUserId, providerPaymentId, providerOrderId, signature, method='UPI' }) {
    const customerId=await this.customerIdForAuth(authUserId)
    if(!customerId) throw fail('Customer profile is not linked to this account.',403)
    const client=await pool.connect()
    try {
      await client.query('BEGIN')
      const { rows }=await client.query(`SELECT p.*,b.customer_id,b.status booking_status,b.expires_at FROM payments p JOIN bookings b ON b.id=p.booking_id WHERE p.booking_id=$1::uuid AND p.provider_order_id=$2 ORDER BY p.created_at DESC LIMIT 1 FOR UPDATE OF p,b`,[bookingId,providerOrderId])
      const payment=rows[0]
      if(!payment || payment.customer_id!==customerId) throw fail('Payment not found.',404)
      if(payment.status==='CAPTURED'){await client.query('COMMIT');return payment}
      if(payment.booking_status!=='PENDING_PAYMENT' || new Date(payment.expires_at)<=new Date()) throw fail('Booking payment window has expired.',409)

      await assertBookingStillBookable(
        client,
        bookingId,
      )
      if(!paymentProvider.verifyPaymentSignature({orderId:providerOrderId,paymentId:providerPaymentId,signature})) throw fail('Payment signature verification failed.',400)
      const updated=await client.query(`UPDATE payments SET provider_payment_id=$2,status='CAPTURED',method=$3,updated_at=NOW(),provider_payload=provider_payload||$4::jsonb WHERE id=$1::uuid RETURNING *`,[payment.id,providerPaymentId,method,JSON.stringify({signatureVerified:true})])
      await client.query(`UPDATE bookings SET status='CONFIRMED',updated_at=NOW() WHERE id=$1::uuid`,[bookingId])
      await client.query(`UPDATE trip_seat_segment_allocations SET status='CONFIRMED',expires_at=NULL WHERE booking_id=$1::uuid`,[bookingId])
      await client.query(`INSERT INTO notification_outbox(user_id,booking_id,channel,template_key,payload) VALUES($1::uuid,$2::uuid,'IN_APP','BOOKING_CONFIRMED',$3::jsonb),($1::uuid,$2::uuid,'SMS','BOOKING_CONFIRMED',$3::jsonb)`,[customerId,bookingId,JSON.stringify({bookingReference:(await client.query('SELECT booking_reference FROM bookings WHERE id=$1',[bookingId])).rows[0].booking_reference})])
      await client.query('COMMIT'); return updated.rows[0]
    } catch(e){await client.query('ROLLBACK');throw e} finally{client.release()}
  }


  validateSavedTraveller(input = {}) {
    const fullName=String(input.fullName||input.full_name||'').trim().replace(/\s{2,}/g,' ')
    const age=Number(input.age)
    const gender=String(input.gender||'').trim().toUpperCase()
    const relation=String(input.relation||'').trim().slice(0,40)||null
    if(!/^[\p{L}\p{M} .'-]{2,80}$/u.test(fullName))
      throw fail('Enter a valid traveller name between 2 and 80 characters.',422)
    if(!Number.isInteger(age)||age<1||age>120)
      throw fail('Traveller age must be between 1 and 120.',422)
    if(!['MALE','FEMALE','OTHER'].includes(gender))
      throw fail('Traveller gender must be MALE, FEMALE or OTHER.',422)
    return {fullName,age,gender,relation}
  }

  async listSavedTravellers(authUserId) {
    const customerId=await this.customerIdForAuth(authUserId)
    if(!customerId) throw fail('Customer profile is not linked to this account.',403)
    const {rows}=await pool.query(`SELECT id,full_name,age,gender,relation,is_default,created_at,updated_at
      FROM customer_saved_travellers WHERE customer_id=$1::uuid
      ORDER BY is_default DESC,created_at DESC`,[customerId])
    return rows
  }

  async createSavedTraveller(authUserId,input={}) {
    const customerId=await this.customerIdForAuth(authUserId)
    if(!customerId) throw fail('Customer profile is not linked to this account.',403)
    const value=this.validateSavedTraveller(input)
    const client=await pool.connect()
    try{
      await client.query('BEGIN')
      if(input.isDefault===true||input.is_default===true){
        await client.query(`UPDATE customer_saved_travellers SET is_default=FALSE,updated_at=NOW() WHERE customer_id=$1::uuid`,[customerId])
      }
      const {rows}=await client.query(`INSERT INTO customer_saved_travellers(customer_id,full_name,age,gender,relation,is_default)
        VALUES($1::uuid,$2,$3,$4,$5,$6)
        ON CONFLICT(customer_id,LOWER(full_name),age,gender) DO UPDATE SET
          relation=EXCLUDED.relation,is_default=EXCLUDED.is_default,updated_at=NOW()
        RETURNING *`,[customerId,value.fullName,value.age,value.gender,value.relation,Boolean(input.isDefault||input.is_default)])
      await client.query('COMMIT')
      return rows[0]
    }catch(e){await client.query('ROLLBACK');throw e}finally{client.release()}
  }

  async updateSavedTraveller(authUserId,travellerId,input={}) {
    const customerId=await this.customerIdForAuth(authUserId)
    if(!customerId) throw fail('Customer profile is not linked to this account.',403)
    const existing=(await pool.query(`SELECT * FROM customer_saved_travellers WHERE id=$1::uuid AND customer_id=$2::uuid`,[travellerId,customerId])).rows[0]
    if(!existing) throw fail('Saved traveller not found.',404)
    const value=this.validateSavedTraveller({
      fullName:input.fullName??input.full_name??existing.full_name,
      age:input.age??existing.age,
      gender:input.gender??existing.gender,
      relation:input.relation??existing.relation,
    })
    const client=await pool.connect()
    try{
      await client.query('BEGIN')
      const makeDefault=input.isDefault===true||input.is_default===true
      if(makeDefault) await client.query(`UPDATE customer_saved_travellers SET is_default=FALSE,updated_at=NOW() WHERE customer_id=$1::uuid`,[customerId])
      const {rows}=await client.query(`UPDATE customer_saved_travellers SET
        full_name=$3,age=$4,gender=$5,relation=$6,
        is_default=CASE WHEN $7::boolean THEN TRUE ELSE is_default END,
        updated_at=NOW()
        WHERE id=$1::uuid AND customer_id=$2::uuid RETURNING *`,
        [travellerId,customerId,value.fullName,value.age,value.gender,value.relation,makeDefault])
      await client.query('COMMIT')
      return rows[0]
    }catch(e){await client.query('ROLLBACK');throw e}finally{client.release()}
  }

  async deleteSavedTraveller(authUserId,travellerId) {
    const customerId=await this.customerIdForAuth(authUserId)
    if(!customerId) throw fail('Customer profile is not linked to this account.',403)
    const {rows}=await pool.query(`DELETE FROM customer_saved_travellers
      WHERE id=$1::uuid AND customer_id=$2::uuid RETURNING id,full_name`,[travellerId,customerId])
    if(!rows[0]) throw fail('Saved traveller not found.',404)
    return {deleted:true,...rows[0]}
  }
  async customerBookingsForAuth(authUserId) {
    const customerId=await this.customerIdForAuth(authUserId)
    if(!customerId) return []
    const { rows }=await pool.query(`SELECT b.id,b.booking_reference,b.status,b.total_amount,b.currency,b.created_at,t.id trip_id,t.service_number,t.departure_at,t.arrival_at,r.source_city,r.destination_city,o.display_name operator,bu.name bus,origin.location_name boarding_point,destination.location_name dropping_point,COALESCE(p.status::text,'NOT_PAID') payment_status,p.method payment_method,cr.rating review_rating,cr.review_text,COALESCE(JSON_AGG(JSON_BUILD_OBJECT('name',bp.full_name,'seat',s.seat_number,'fare',bp.fare_amount,'age',bp.age,'gender',bp.gender,'seat_type',s.seat_type,'deck',s.deck) ORDER BY s.seat_number) FILTER(WHERE bp.id IS NOT NULL),'[]') passengers FROM bookings b JOIN trips t ON t.id=b.trip_id JOIN routes r ON r.id=t.route_id JOIN operators o ON o.id=b.operator_id JOIN buses bu ON bu.id=t.bus_id JOIN trip_stops origin ON origin.id=b.origin_stop_id JOIN trip_stops destination ON destination.id=b.destination_stop_id LEFT JOIN booking_passengers bp ON bp.booking_id=b.id LEFT JOIN bus_seats s ON s.id=bp.bus_seat_id LEFT JOIN LATERAL (SELECT * FROM payments px WHERE px.booking_id=b.id ORDER BY px.created_at DESC LIMIT 1) p ON TRUE LEFT JOIN LATERAL (SELECT rating,review_text FROM customer_reviews crx WHERE crx.booking_id=b.id LIMIT 1) cr ON TRUE WHERE b.customer_id=$1::uuid GROUP BY b.id,t.id,r.id,o.id,bu.id,origin.id,destination.id,p.id,p.status,p.method,cr.rating,cr.review_text ORDER BY b.created_at DESC`,[customerId])
    return rows
  }

  async refundStatus(id, authUserId) {
    const customerId=await this.customerIdForAuth(authUserId)
    const {rows}=await pool.query(`SELECT b.id,b.booking_reference,b.status booking_status,b.cancelled_at,b.cancellation_reason,p.status payment_status,p.amount payment_amount,r.id refund_id,r.amount refund_amount,r.status refund_status,r.provider_refund_id,r.reason refund_reason,r.requested_at,r.completed_at FROM bookings b LEFT JOIN LATERAL (SELECT * FROM payments px WHERE px.booking_id=b.id ORDER BY px.created_at DESC LIMIT 1) p ON TRUE LEFT JOIN LATERAL (SELECT * FROM refunds rx WHERE rx.payment_id=p.id ORDER BY rx.requested_at DESC LIMIT 1) r ON TRUE WHERE b.id=$1::uuid AND b.customer_id=$2::uuid`,[id,customerId])
    if(!rows[0]) throw fail('Booking not found.',404); return rows[0]
  }

  async createSupportTicket(id, authUserId, input={}) {
    const customerId=await this.customerIdForAuth(authUserId); const subject=String(input.subject||'').trim(),description=String(input.description||'').trim(),category=String(input.category||'BOOKING').trim().toUpperCase(); if(subject.length<3||description.length<10) throw fail('Subject and a clear description are required.',422)
    const {rows:b}=await pool.query(`SELECT id,operator_id FROM bookings WHERE id=$1::uuid AND customer_id=$2::uuid`,[id,customerId]); if(!b[0]) throw fail('Booking not found.',404)
    const ticketNumber=`BG${Date.now().toString().slice(-10)}`; const {rows}=await pool.query(`INSERT INTO support_tickets(ticket_number,customer_id,booking_id,operator_id,category,subject,description,priority) VALUES($1,$2::uuid,$3::uuid,$4::uuid,$5,$6,$7,$8) RETURNING *`,[ticketNumber,customerId,id,b[0].operator_id,category,subject,description,['LOW','MEDIUM','HIGH','URGENT'].includes(String(input.priority||'').toUpperCase())?String(input.priority).toUpperCase():'MEDIUM']); return rows[0]
  }

  async listSupportTickets(authUserId) {
    const customerId=await this.customerIdForAuth(authUserId); const {rows}=await pool.query(`SELECT st.*,b.booking_reference FROM support_tickets st LEFT JOIN bookings b ON b.id=st.booking_id WHERE st.customer_id=$1::uuid ORDER BY st.created_at DESC`,[customerId]); return rows
  }

  async ticketForAuth(id, authUserId) {
    const customerId=await this.customerIdForAuth(authUserId)
    const { rows }=await pool.query(`SELECT customer_id FROM bookings WHERE id=$1::uuid`,[id])
    if(!rows[0] || rows[0].customer_id!==customerId) throw fail('Ticket not found.',404)
    return this.ticket(id)
  }

  async cancelBookingForAuth(id, authUserId, reason='Customer requested cancellation') {
    const customerId=await this.customerIdForAuth(authUserId)
    const client=await pool.connect()
    try {
      await client.query('BEGIN')
      const {rows}=await client.query(`SELECT * FROM bookings WHERE id=$1::uuid AND customer_id=$2::uuid FOR UPDATE`,[id,customerId])
      const booking=rows[0]; if(!booking || !['PENDING_PAYMENT','CONFIRMED'].includes(booking.status)) throw fail('Cancellable booking not found.',404)
      const tripInfo=await client.query(`SELECT t.departure_at FROM bookings b JOIN trips t ON t.id=b.trip_id WHERE b.id=$1::uuid`,[id])
      const hours=(new Date(tripInfo.rows[0].departure_at).getTime()-Date.now())/3600000
      const policy=await this.cancellationPolicy(booking.operator_id); const refundPercent=Math.max(0,Math.min(100,Number(this.refundRule(policy,hours).refundPercent)||0))
      const {rows: payRows}=await client.query(`SELECT * FROM payments WHERE booking_id=$1::uuid AND status='CAPTURED' ORDER BY created_at DESC LIMIT 1 FOR UPDATE`,[id])
      let refundRow=null
      if(payRows[0]) {
        const providerRefund=await paymentProvider.refund({paymentId:payRows[0].provider_payment_id,amount:Math.round(Number(payRows[0].amount)*refundPercent)/100,notes:{bookingId:id,reason,refundPercent}})
        const status=providerRefund.status==='processed'?'REFUNDED':'PENDING'
        const rr=await client.query(`INSERT INTO refunds(payment_id,provider_refund_id,amount,reason,status,provider_payload,requested_at,completed_at) VALUES($1::uuid,$2,$3,$4,$5,$6::jsonb,NOW(),CASE WHEN $5='REFUNDED' THEN NOW() END) RETURNING *`,[payRows[0].id,providerRefund.id,Math.round(Number(payRows[0].amount)*refundPercent)/100,reason,status,JSON.stringify(providerRefund)])
        refundRow=rr.rows[0]
        if(status==='REFUNDED') await client.query(`UPDATE payments SET status='REFUNDED',updated_at=NOW() WHERE id=$1`,[payRows[0].id])
      }
      const cancelled=await client.query(`UPDATE bookings SET status='CANCELLED',cancelled_at=NOW(),cancellation_reason=$2,updated_at=NOW() WHERE id=$1::uuid RETURNING *`,[id,reason])
      await client.query(`DELETE FROM trip_seat_segment_allocations WHERE booking_id=$1::uuid`,[id])
      await client.query(`INSERT INTO notification_outbox(user_id,booking_id,channel,template_key,payload) VALUES($1::uuid,$2::uuid,'IN_APP','BOOKING_CANCELLED',$3::jsonb),($1::uuid,$2::uuid,'SMS','BOOKING_CANCELLED',$3::jsonb)`,[customerId,id,JSON.stringify({bookingReference:booking.booking_reference,refundStatus:refundRow?.status||'NOT_REQUIRED'})])
      await client.query('COMMIT'); return {booking:cancelled.rows[0],refund:refundRow}
    } catch(e){await client.query('ROLLBACK');throw e}finally{client.release()}
  }

  async listOffers() {
    const {rows}=await pool.query(`SELECT code,title,description,discount_type,discount_value,max_discount_amount,eligibility,ends_at,operator_id,route_id FROM pricing_promotions WHERE status='ACTIVE' AND NOW() BETWEEN starts_at AND ends_at ORDER BY discount_value DESC`)
    return rows.map(x=>({...x,title:x.title||(x.discount_type==='PERCENTAGE'?`${Number(x.discount_value)}% off`:`ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¹${Number(x.discount_value)} off`),description:x.description||`Save on eligible BusGo bookings${x.max_discount_amount?` up to ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¹${Number(x.max_discount_amount)}`:''}.`}))
  }

  async validateCoupon({ code, amount }) {
    const normalized=String(code||'').trim().toUpperCase(); const subtotal=Number(amount)
    if(!normalized || !Number.isFinite(subtotal) || subtotal<=0) throw fail('Coupon code and booking amount are required.',422)
    const {rows}=await pool.query(`SELECT id,code,discount_type,discount_value,max_discount_amount,eligibility,ends_at FROM pricing_promotions WHERE UPPER(code)=UPPER($1) AND status='ACTIVE' AND NOW() BETWEEN starts_at AND ends_at`,[normalized])
    const promo=rows[0]; if(!promo) throw fail('Coupon is invalid or expired.',404)
    const eligibility=promo.eligibility||{}; if(eligibility.minBookingAmount && subtotal<Number(eligibility.minBookingAmount)) throw fail(`Minimum booking amount is ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¹${eligibility.minBookingAmount}.`,422)
    let discount=promo.discount_type==='PERCENTAGE'?subtotal*(Number(promo.discount_value)/100):Number(promo.discount_value)
    if(promo.max_discount_amount) discount=Math.min(discount,Number(promo.max_discount_amount)); discount=Math.max(0,Math.min(subtotal,Math.round(discount*100)/100))
    return {valid:true,code:promo.code,discountAmount:discount,totalAmount:subtotal-discount,endsAt:promo.ends_at}
  }

  async cancellationPolicy(operatorId) {
    const {rows}=await pool.query(`SELECT rules,reschedule_enabled,reschedule_cutoff_hours,reschedule_fee FROM operator_cancellation_policies WHERE operator_id=$1::uuid`,[operatorId])
    const policy=rows[0]||{rules:[{hoursBefore:24,refundPercent:90},{hoursBefore:12,refundPercent:75},{hoursBefore:6,refundPercent:50},{hoursBefore:2,refundPercent:25},{hoursBefore:0,refundPercent:0}],reschedule_enabled:true,reschedule_cutoff_hours:4,reschedule_fee:0}
    const rules=Array.isArray(policy.rules)?policy.rules:[]
    return {...policy,rules:rules.map(x=>({hoursBefore:Number(x.hoursBefore),refundPercent:Number(x.refundPercent)})).sort((a,b)=>b.hoursBefore-a.hoursBefore)}
  }

  refundRule(policy,hours) {
    return policy.rules.find(rule=>hours>=rule.hoursBefore)||{hoursBefore:0,refundPercent:0}
  }

  async cancellationQuote(id, authUserId) {
    const customerId=await this.customerIdForAuth(authUserId)
    const {rows}=await pool.query(`SELECT b.id,b.status,b.total_amount,b.operator_id,t.departure_at FROM bookings b JOIN trips t ON t.id=b.trip_id WHERE b.id=$1::uuid AND b.customer_id=$2::uuid`,[id,customerId])
    const b=rows[0]; if(!b || !['PENDING_PAYMENT','CONFIRMED'].includes(b.status)) throw fail('Cancellable booking not found.',404)
    const hours=(new Date(b.departure_at).getTime()-Date.now())/3600000
    const policy=await this.cancellationPolicy(b.operator_id); const rule=this.refundRule(policy,hours)
    const refundPercent=Math.max(0,Math.min(100,Number(rule.refundPercent)||0))
    const refundAmount=Math.round(Number(b.total_amount)*refundPercent)/100
    return {bookingId:id,hoursBeforeDeparture:Math.max(0,Math.floor(hours)),refundPercent,refundAmount,cancellationFee:Number(b.total_amount)-refundAmount,currency:'INR',policy:`${100-refundPercent}% cancellation fee`,policyRules:policy.rules}
  }

  async rescheduleOptions(id, authUserId) {
    const customerId=await this.customerIdForAuth(authUserId)
    const {rows}=await pool.query(`SELECT b.id,b.trip_id,b.operator_id,b.status,t.departure_at,r.source_city,r.destination_city,(SELECT COUNT(*)::int FROM booking_passengers bp WHERE bp.booking_id=b.id) passenger_count FROM bookings b JOIN trips t ON t.id=b.trip_id JOIN routes r ON r.id=t.route_id WHERE b.id=$1::uuid AND b.customer_id=$2::uuid`,[id,customerId])
    const b=rows[0]; if(!b||b.status!=='CONFIRMED') throw fail('Only confirmed future bookings can be rescheduled.',409)
    const policy=await this.cancellationPolicy(b.operator_id); if(!policy.reschedule_enabled) throw fail('Rescheduling is disabled by this operator.',409)
    const hours=(new Date(b.departure_at).getTime()-Date.now())/3600000; if(hours<Number(policy.reschedule_cutoff_hours)) throw fail(`Rescheduling closes ${policy.reschedule_cutoff_hours} hours before departure.`,409)
    const result=await pool.query(`SELECT t.id,t.service_number,t.departure_at,t.arrival_at,o.display_name operator,bus.name bus,bus.bus_type,r.source_city,r.destination_city,COALESCE((SELECT MIN(tf.fare) FROM trip_fares tf WHERE tf.trip_id=t.id),t.base_fare) starting_fare,COUNT(i.bus_seat_id) FILTER(WHERE i.status='AVAILABLE')::int available_seats FROM trips t JOIN routes r ON r.id=t.route_id JOIN operators o ON o.id=t.operator_id JOIN buses bus ON bus.id=t.bus_id LEFT JOIN trip_seat_inventory i ON i.trip_id=t.id WHERE t.id<>$1::uuid AND t.operator_id=$2::uuid AND t.status='SCHEDULED' AND t.departure_at>NOW()+INTERVAL '2 hours' AND LOWER(r.source_city)=LOWER($3) AND LOWER(r.destination_city)=LOWER($4) GROUP BY t.id,o.display_name,bus.name,bus.bus_type,r.source_city,r.destination_city HAVING COUNT(i.bus_seat_id) FILTER(WHERE i.status='AVAILABLE') >= $5 ORDER BY t.departure_at LIMIT 30`,[b.trip_id,b.operator_id,b.source_city,b.destination_city,b.passenger_count])
    return {bookingId:id,passengerCount:Number(b.passenger_count),sourceCity:b.source_city,destinationCity:b.destination_city,rescheduleFee:Number(policy.reschedule_fee),cutoffHours:Number(policy.reschedule_cutoff_hours),options:result.rows}
  }

  async rescheduleQuote(id, authUserId, {newTripId,newOriginStopId,newDestinationStopId,newSeatIds=[]}) {
    const customerId=await this.customerIdForAuth(authUserId); if(!newTripId||!newOriginStopId||!newDestinationStopId||!Array.isArray(newSeatIds)||!newSeatIds.length) throw fail('Replacement trip, boarding, dropping and seats are required.',422)
    const {rows}=await pool.query(`SELECT b.*,t.departure_at,r.source_city,r.destination_city,(SELECT COUNT(*)::int FROM booking_passengers bp WHERE bp.booking_id=b.id) passenger_count FROM bookings b JOIN trips t ON t.id=b.trip_id JOIN routes r ON r.id=t.route_id WHERE b.id=$1::uuid AND b.customer_id=$2::uuid`,[id,customerId]); const old=rows[0]
    if(!old||old.status!=='CONFIRMED') throw fail('Only confirmed future bookings can be rescheduled.',409)
    if(newSeatIds.length!==old.passenger_count||new Set(newSeatIds).size!==newSeatIds.length) throw fail('Choose one replacement seat for each passenger.',422)
    const policy=await this.cancellationPolicy(old.operator_id); if(!policy.reschedule_enabled) throw fail('Rescheduling is disabled by this operator.',409)
    const hours=(new Date(old.departure_at).getTime()-Date.now())/3600000; if(hours<Number(policy.reschedule_cutoff_hours)) throw fail(`Rescheduling closes ${policy.reschedule_cutoff_hours} hours before departure.`,409)
    const target=(await pool.query(`SELECT t.*,r.source_city,r.destination_city,s1.stop_order origin_order,s2.stop_order destination_order
      FROM trips t
      JOIN buses b ON b.id=t.bus_id
      JOIN routes r ON r.id=t.route_id
      JOIN trip_stops s1 ON s1.id=$2::uuid AND s1.trip_id=t.id
      JOIN trip_stops s2 ON s2.id=$3::uuid AND s2.trip_id=t.id
      WHERE t.id=$1::uuid
        AND t.operator_id=$4::uuid
        AND t.status='SCHEDULED'
        AND ${customerBookabilityWhere('b')}
        AND t.departure_at>NOW()`,[newTripId,newOriginStopId,newDestinationStopId,old.operator_id])).rows[0]
    if(!target||target.origin_order>=target.destination_order||target.source_city.toLowerCase()!==old.source_city.toLowerCase()||target.destination_city.toLowerCase()!==old.destination_city.toLowerCase()) throw fail('Replacement trip or stops are not compatible.',422)
    const inv=await pool.query(`SELECT i.bus_seat_id,bs.seat_number,bs.seat_type,COALESCE((SELECT tf.fare FROM trip_fares tf WHERE tf.trip_id=i.trip_id AND tf.seat_type=bs.seat_type ORDER BY tf.fare LIMIT 1),$3::numeric) fare FROM trip_seat_inventory i JOIN bus_seats bs ON bs.id=i.bus_seat_id WHERE i.trip_id=$1::uuid AND i.bus_seat_id=ANY($2::uuid[]) AND i.status='AVAILABLE'`,[newTripId,newSeatIds,target.base_fare])
    if(inv.rowCount!==newSeatIds.length) throw fail('One or more replacement seats are no longer available.',409)
    const newFare=inv.rows.reduce((sum,x)=>sum+Number(x.fare),0); const fee=Number(policy.reschedule_fee)||0; const preservedDiscount=Math.min(Number(old.discount_amount)||0,newFare); const newTotal=Math.round(Math.max(0,newFare-preservedDiscount+fee)*100)/100; const oldTotal=Number(old.total_amount); const difference=Math.round((newTotal-oldTotal)*100)/100
    return {bookingId:id,oldTripId:old.trip_id,newTripId,newOriginStopId,newDestinationStopId,newSeatIds,seats:inv.rows,oldTotal,newFare,preservedDiscount,rescheduleFee:fee,newTotal,fareDifference:difference,paymentRequired:Math.max(0,difference),refundDue:Math.max(0,-difference),currency:old.currency,validForSeconds:300}
  }

  async confirmReschedule(id, authUserId, input) {
    const quote=await this.rescheduleQuote(id,authUserId,input)
    if(quote.paymentRequired>0 && paymentProvider.provider!=='DEMO') throw fail('Additional fare payment is required. Complete the provider payment before confirming this reschedule.',409)
    const customerId=await this.customerIdForAuth(authUserId); const client=await pool.connect()
    try{
      await client.query('BEGIN')
      const booking=(await client.query(`SELECT * FROM bookings WHERE id=$1::uuid AND customer_id=$2::uuid AND status='CONFIRMED' FOR UPDATE`,[id,customerId])).rows[0]
      if(!booking) throw fail('Confirmed booking not found.',404)
      const lockedTargetTrip=(await client.query(`SELECT t.id
        FROM trips t
        JOIN buses b ON b.id=t.bus_id
        WHERE t.id=$1::uuid
          AND t.status='SCHEDULED'
          AND ${customerBookabilityWhere('b')}
          AND t.departure_at>NOW()
        FOR SHARE OF t,b`,[quote.newTripId])).rows[0]

      if(!lockedTargetTrip){
        throw fail(
          'The replacement trip or bus is no longer available.',
          409,
        )
      }
      const target=await client.query(`SELECT i.bus_seat_id,bs.seat_type,COALESCE((SELECT tf.fare FROM trip_fares tf WHERE tf.trip_id=i.trip_id AND tf.seat_type=bs.seat_type ORDER BY tf.fare LIMIT 1),t.base_fare) fare FROM trip_seat_inventory i JOIN bus_seats bs ON bs.id=i.bus_seat_id JOIN trips t ON t.id=i.trip_id WHERE i.trip_id=$1::uuid AND i.bus_seat_id=ANY($2::uuid[]) AND i.status='AVAILABLE' FOR UPDATE OF i`,[quote.newTripId,quote.newSeatIds])
      if(target.rowCount!==quote.newSeatIds.length) throw fail('One or more replacement seats were just taken. Please choose again.',409)
      const passengers=(await client.query(`SELECT id FROM booking_passengers WHERE booking_id=$1::uuid ORDER BY id FOR UPDATE`,[id])).rows
      if(passengers.length!==quote.newSeatIds.length) throw fail('Replacement seat count no longer matches this booking.',409)
      if(quote.refundDue>0){
        const pay=(await client.query(`SELECT * FROM payments WHERE booking_id=$1::uuid AND status='CAPTURED' ORDER BY created_at DESC LIMIT 1 FOR UPDATE`,[id])).rows[0]
        if(pay){const rr=await paymentProvider.refund({paymentId:pay.provider_payment_id,amount:quote.refundDue,notes:{bookingId:id,reason:'Reschedule fare difference'}});await client.query(`INSERT INTO refunds(payment_id,provider_refund_id,amount,reason,status,provider_payload,requested_at,completed_at) VALUES($1::uuid,$2,$3,'Reschedule fare difference',$4,$5::jsonb,NOW(),CASE WHEN $4='REFUNDED' THEN NOW() END)`,[pay.id,rr.id,quote.refundDue,rr.status==='processed'?'REFUNDED':'PENDING',JSON.stringify(rr)])}
      }
      if(quote.paymentRequired>0){await client.query(`INSERT INTO payments(booking_id,provider,provider_payment_id,idempotency_key,amount,currency,status,method,provider_payload) VALUES($1::uuid,'DEMO',$2,$3::uuid,$4,$5,'CAPTURED','RESCHEDULE_DEMO',$6::jsonb)`,[id,`RESCHEDULE-${Date.now()}`,crypto.randomUUID(),quote.paymentRequired,booking.currency,JSON.stringify({reschedule:true})])}
      await client.query(`UPDATE trip_seat_inventory SET status='AVAILABLE',booking_id=NULL,hold_token=NULL,hold_expires_at=NULL,updated_at=NOW() WHERE booking_id=$1::uuid`,[id])
      await client.query(`UPDATE trip_seat_inventory SET status='BOOKED',booking_id=$3::uuid,hold_token=NULL,hold_expires_at=NULL,updated_at=NOW() WHERE trip_id=$1::uuid AND bus_seat_id=ANY($2::uuid[])`,[quote.newTripId,quote.newSeatIds,id])
      const fareMap=new Map(target.rows.map(x=>[x.bus_seat_id,Number(x.fare)]))
      for(let i=0;i<passengers.length;i++) await client.query(`UPDATE booking_passengers SET bus_seat_id=$2::uuid,fare_amount=$3 WHERE id=$1::uuid`,[passengers[i].id,quote.newSeatIds[i],fareMap.get(quote.newSeatIds[i])||0])
      await client.query(`UPDATE bookings SET trip_id=$2::uuid,origin_stop_id=$3::uuid,destination_stop_id=$4::uuid,subtotal_amount=$5,total_amount=$6,updated_at=NOW() WHERE id=$1::uuid`,[id,quote.newTripId,quote.newOriginStopId,quote.newDestinationStopId,quote.newFare,quote.newTotal])
      const rs=await client.query(`INSERT INTO booking_reschedules(booking_id,old_trip_id,new_trip_id,old_total,new_total,fare_difference,status,new_origin_stop_id,new_destination_stop_id,new_seat_ids,reschedule_fee,refund_amount,payment_required,expires_at) VALUES($1::uuid,$2::uuid,$3::uuid,$4,$5,$6,'CONFIRMED',$7::uuid,$8::uuid,$9::uuid[],$10,$11,$12,NOW()) RETURNING *`,[id,quote.oldTripId,quote.newTripId,quote.oldTotal,quote.newTotal,quote.fareDifference,quote.newOriginStopId,quote.newDestinationStopId,quote.newSeatIds,quote.rescheduleFee,quote.refundDue,quote.paymentRequired])
      await client.query(`INSERT INTO notification_outbox(user_id,booking_id,channel,template_key,payload) VALUES($1::uuid,$2::uuid,'IN_APP','BOOKING_RESCHEDULED',$3::jsonb),($1::uuid,$2::uuid,'SMS','BOOKING_RESCHEDULED',$3::jsonb)`,[customerId,id,JSON.stringify({bookingReference:booking.booking_reference,newTripId:quote.newTripId,fareDifference:quote.fareDifference})])
      await client.query('COMMIT'); return {reschedule:rs.rows[0],booking:(await pool.query(`SELECT * FROM bookings WHERE id=$1::uuid`,[id])).rows[0]}
    }catch(e){await client.query('ROLLBACK');throw e}finally{client.release()}
  }


  async whatsappCheckoutDetails(token) {
    const tokenHash=crypto.createHash('sha256').update(String(token||'')).digest('hex')
    const {rows}=await pool.query(`SELECT w.id token_id,w.expires_at token_expires_at,b.id booking_id,b.booking_reference,b.status,b.total_amount,b.currency,b.expires_at,
      t.service_number,t.departure_at,t.arrival_at,r.source_city,r.destination_city,o.display_name operator,bu.name bus,
      origin.location_name boarding_point,destination.location_name dropping_point,
      COALESCE(JSON_AGG(JSON_BUILD_OBJECT('name',bp.full_name,'seat',bs.seat_number,'fare',bp.fare_amount) ORDER BY bs.seat_number) FILTER(WHERE bp.id IS NOT NULL),'[]') passengers
      FROM whatsapp_checkout_tokens w JOIN bookings b ON b.id=w.booking_id JOIN trips t ON t.id=b.trip_id JOIN routes r ON r.id=t.route_id
      JOIN operators o ON o.id=b.operator_id JOIN buses bu ON bu.id=t.bus_id JOIN trip_stops origin ON origin.id=b.origin_stop_id
      JOIN trip_stops destination ON destination.id=b.destination_stop_id LEFT JOIN booking_passengers bp ON bp.booking_id=b.id LEFT JOIN bus_seats bs ON bs.id=bp.bus_seat_id
      WHERE w.token_hash=$1 AND w.expires_at>NOW() GROUP BY w.id,b.id,t.id,r.id,o.id,bu.id,origin.id,destination.id`,[tokenHash])
    const item=rows[0]
    if(!item) throw fail('This WhatsApp checkout link is invalid or expired.',404)
    if(item.status==='PENDING_PAYMENT' && new Date(item.expires_at)<=new Date()) throw fail('The seat hold has expired. Start a new WhatsApp booking.',409)
    return {...item,paymentProvider:paymentProvider.provider,publicKey:paymentProvider.provider==='RAZORPAY'?process.env.RAZORPAY_KEY_ID:null}
  }

  async whatsappCheckoutOrder(token) {
    const info=await this.whatsappCheckoutDetails(token)
    if(info.status==='CONFIRMED') return {alreadyPaid:true,booking:info}
    if(info.status!=='PENDING_PAYMENT') throw fail('This booking is not available for payment.',409)
    if(paymentProvider.provider==='DEMO') return {demo:true,booking:info}
    const order=await paymentProvider.createOrder({amount:info.total_amount,currency:info.currency,receipt:info.booking_reference,notes:{bookingId:info.booking_id,channel:'WHATSAPP'}})
    const idempotencyKey=crypto.randomUUID()
    const {rows}=await pool.query(`INSERT INTO payments(booking_id,provider,provider_order_id,idempotency_key,amount,currency,status,provider_payload)
      VALUES($1::uuid,$2,$3,$4::uuid,$5,$6,'PENDING',$7::jsonb) RETURNING *`,[info.booking_id,paymentProvider.provider,order.id,idempotencyKey,info.total_amount,info.currency,JSON.stringify(order)])
    return {payment:rows[0],order,publicKey:process.env.RAZORPAY_KEY_ID}
  }

  async whatsappCheckoutVerify(token,{providerPaymentId,providerOrderId,signature,method='UPI'}={}) {
    const info=await this.whatsappCheckoutDetails(token)
    if(info.status==='CONFIRMED') return {booking:info,alreadyPaid:true}
    const client=await pool.connect()
    try{
      await client.query('BEGIN')
      const {rows}=await client.query(`SELECT p.*,b.status booking_status,b.expires_at,b.customer_id,b.booking_reference FROM payments p JOIN bookings b ON b.id=p.booking_id
        WHERE p.booking_id=$1::uuid AND p.provider_order_id=$2 ORDER BY p.created_at DESC LIMIT 1 FOR UPDATE OF p,b`,[info.booking_id,providerOrderId])
      const payment=rows[0]
      if(!payment) throw fail('Payment order not found.',404)
      if(payment.status==='CAPTURED'){await client.query('COMMIT');return {payment,booking:info,alreadyPaid:true}}
      if(payment.booking_status!=='PENDING_PAYMENT'||new Date(payment.expires_at)<=new Date()) throw fail('Booking payment window has expired.',409)

      await assertBookingStillBookable(
        client,
        info.booking_id,
      )
      if(!paymentProvider.verifyPaymentSignature({orderId:providerOrderId,paymentId:providerPaymentId,signature})) throw fail('Payment signature verification failed.',400)
      const updated=(await client.query(`UPDATE payments SET provider_payment_id=$2,status='CAPTURED',method=$3,updated_at=NOW(),provider_payload=provider_payload||$4::jsonb WHERE id=$1::uuid RETURNING *`,[payment.id,providerPaymentId,method,JSON.stringify({signatureVerified:true,channel:'WHATSAPP'})])).rows[0]
      await client.query(`UPDATE bookings SET status='CONFIRMED',updated_at=NOW() WHERE id=$1::uuid`,[info.booking_id])
      await client.query(`UPDATE trip_seat_segment_allocations SET status='CONFIRMED',expires_at=NULL WHERE booking_id=$1::uuid`,[info.booking_id])
      const payload=JSON.stringify({bookingReference:payment.booking_reference,channel:'WHATSAPP'})
      await client.query(`INSERT INTO notification_outbox(user_id,booking_id,channel,template_key,payload) VALUES($1::uuid,$2::uuid,'IN_APP','BOOKING_CONFIRMED',$3::jsonb),($1::uuid,$2::uuid,'WHATSAPP','BOOKING_CONFIRMED',$3::jsonb)`,[payment.customer_id,info.booking_id,payload])
      await client.query(`UPDATE whatsapp_checkout_tokens SET used_at=NOW() WHERE booking_id=$1::uuid`,[info.booking_id])
      await client.query('COMMIT')
      return {payment:updated,booking:await this.whatsappCheckoutDetails(token)}
    }catch(e){await client.query('ROLLBACK');throw e}finally{client.release()}
  }

  async whatsappCheckoutDemoComplete(token) {
    const info=await this.whatsappCheckoutDetails(token)
    if(paymentProvider.provider!=='DEMO') throw fail('Demo payment is disabled.',409)
    if(info.status==='CONFIRMED') return {booking:info,alreadyPaid:true}
    await this.completePayment({bookingId:info.booking_id,idempotencyKey:crypto.randomUUID(),provider:'DEMO',providerPaymentId:`WA-${Date.now()}`,method:'WHATSAPP_DEMO'})
    const {rows}=await pool.query(`SELECT customer_id,booking_reference FROM bookings WHERE id=$1::uuid`,[info.booking_id])
    if(rows[0]) await pool.query(`INSERT INTO notification_outbox(user_id,booking_id,channel,template_key,payload) VALUES($1::uuid,$2::uuid,'WHATSAPP','BOOKING_CONFIRMED',$3::jsonb)`,[rows[0].customer_id,info.booking_id,JSON.stringify({bookingReference:rows[0].booking_reference,channel:'WHATSAPP'})])
    await pool.query(`UPDATE whatsapp_checkout_tokens SET used_at=NOW() WHERE booking_id=$1::uuid`,[info.booking_id])
    return {booking:await this.whatsappCheckoutDetails(token)}
  }

  async submitReview(id, authUserId, {rating, reviewText=''}) {
    const customerId=await this.customerIdForAuth(authUserId); const score=Number(rating)
    if(!Number.isInteger(score)||score<1||score>5) throw fail('Rating must be between 1 and 5.',422)
    const {rows}=await pool.query(`SELECT b.id,b.operator_id,b.trip_id FROM bookings b JOIN trips t ON t.id=b.trip_id WHERE b.id=$1::uuid AND b.customer_id=$2::uuid AND b.status='CONFIRMED' AND t.arrival_at<=NOW()`,[id,customerId])
    const b=rows[0]; if(!b) throw fail('Only completed confirmed journeys can be reviewed.',409)
    const result=await pool.query(`INSERT INTO customer_reviews(booking_id,customer_id,operator_id,trip_id,rating,review_text) VALUES($1::uuid,$2::uuid,$3::uuid,$4::uuid,$5,$6) ON CONFLICT(booking_id) DO UPDATE SET rating=EXCLUDED.rating,review_text=EXCLUDED.review_text,updated_at=NOW() RETURNING *`,[id,customerId,b.operator_id,b.trip_id,score,String(reviewText||'').trim().slice(0,1000)])
    return result.rows[0]
  }

  async ticket(id) {
    const { rows } = await pool.query(`SELECT b.booking_reference,b.status,b.total_amount,b.currency,t.service_number,t.departure_at,t.arrival_at,
      r.source_city,r.destination_city,o.display_name operator,bu.name bus,origin.location_name boarding_point,destination.location_name dropping_point,
      JSON_AGG(JSON_BUILD_OBJECT('name',p.full_name,'seat',s.seat_number,'fare',p.fare_amount) ORDER BY s.seat_number) passengers
      FROM bookings b JOIN trips t ON t.id=b.trip_id JOIN routes r ON r.id=t.route_id JOIN operators o ON o.id=b.operator_id JOIN buses bu ON bu.id=t.bus_id
      JOIN trip_stops origin ON origin.id=b.origin_stop_id JOIN trip_stops destination ON destination.id=b.destination_stop_id
      JOIN booking_passengers p ON p.booking_id=b.id JOIN bus_seats s ON s.id=p.bus_seat_id WHERE b.id=$1::uuid AND b.status='CONFIRMED'
      GROUP BY b.id,t.id,r.id,o.id,bu.id,origin.id,destination.id`, [id])
    if (!rows[0]) throw fail('Confirmed ticket not found.',404); return rows[0]
  }

  async customerBookings(mobile) {
    const normalized = String(mobile || '').replace(/\D/g, '')
    if (!/^[6-9]\d{9}$/.test(normalized)) throw fail('A valid customer mobile number is required.', 422)
    const { rows } = await pool.query(`SELECT b.id,b.booking_reference,b.status,b.total_amount,b.currency,b.created_at,
      t.id trip_id,t.service_number,t.departure_at,t.arrival_at,r.source_city,r.destination_city,o.display_name operator,bu.name bus,
      origin.location_name boarding_point,destination.location_name dropping_point,
      COALESCE(p.status::text,'NOT_PAID') payment_status,p.method payment_method,
      COALESCE(JSON_AGG(JSON_BUILD_OBJECT('name',bp.full_name,'seat',s.seat_number,'fare',bp.fare_amount,
        'age',bp.age,'gender',bp.gender,'seat_type',s.seat_type,'deck',s.deck)
        ORDER BY s.seat_number) FILTER(WHERE bp.id IS NOT NULL),'[]') passengers
      FROM bookings b JOIN platform_users u ON u.id=b.customer_id JOIN trips t ON t.id=b.trip_id JOIN routes r ON r.id=t.route_id
      JOIN operators o ON o.id=b.operator_id JOIN buses bu ON bu.id=t.bus_id JOIN trip_stops origin ON origin.id=b.origin_stop_id
      JOIN trip_stops destination ON destination.id=b.destination_stop_id LEFT JOIN booking_passengers bp ON bp.booking_id=b.id
      LEFT JOIN bus_seats s ON s.id=bp.bus_seat_id LEFT JOIN LATERAL (SELECT * FROM payments px WHERE px.booking_id=b.id ORDER BY px.created_at DESC LIMIT 1) p ON TRUE
      WHERE u.mobile=$1 GROUP BY b.id,t.id,r.id,o.id,bu.id,origin.id,destination.id,p.id,p.status,p.method ORDER BY b.created_at DESC`,[normalized])
    return rows
  }

  async cancelBooking(id) {
    const client=await pool.connect(); try { await client.query('BEGIN'); const {rows}=await client.query(`UPDATE bookings SET status='CANCELLED',cancelled_at=NOW(),updated_at=NOW() WHERE id=$1::uuid AND status IN('PENDING_PAYMENT','CONFIRMED') RETURNING *`,[id]); if(!rows[0]) throw fail('Cancellable booking not found.',404); await client.query(`DELETE FROM trip_seat_segment_allocations WHERE booking_id=$1::uuid`,[id]); await client.query('COMMIT'); return rows[0] } catch(e){await client.query('ROLLBACK');throw e}finally{client.release()}
  }

  async customerIdForPhone(phone) {
    const normalized=String(phone||'').replace(/\D/g,'').slice(-10)
    if(!/^[6-9]\d{9}$/.test(normalized)) throw fail('Valid WhatsApp mobile number is required.',422)
    const {rows}=await pool.query(`SELECT id FROM platform_users WHERE RIGHT(regexp_replace(mobile,'\\D','','g'),10)=$1 ORDER BY created_at DESC LIMIT 1`,[normalized])
    return rows[0]?.id||null
  }

  async whatsappCustomerBookings(phone) {
    const customerId=await this.customerIdForPhone(phone)
    if(!customerId) return []
    const {rows}=await pool.query(`SELECT b.id,b.booking_reference,b.status,b.total_amount,b.currency,b.created_at,t.id trip_id,t.departure_at,t.arrival_at,
      r.source_city,r.destination_city,o.display_name operator,bu.name bus,origin.location_name boarding_point,destination.location_name dropping_point,
      COALESCE((SELECT STRING_AGG(bs.seat_number,', ' ORDER BY bs.seat_number) FROM booking_passengers bp JOIN bus_seats bs ON bs.id=bp.bus_seat_id WHERE bp.booking_id=b.id),'') seats
      FROM bookings b JOIN trips t ON t.id=b.trip_id JOIN routes r ON r.id=t.route_id JOIN operators o ON o.id=b.operator_id JOIN buses bu ON bu.id=t.bus_id
      JOIN trip_stops origin ON origin.id=b.origin_stop_id JOIN trip_stops destination ON destination.id=b.destination_stop_id
      WHERE b.customer_id=$1::uuid ORDER BY b.created_at DESC LIMIT 10`,[customerId])
    return rows
  }

  async whatsappCancellationQuote(id, phone) {
    const customerId=await this.customerIdForPhone(phone)
    if(!customerId) throw fail('Booking not found.',404)
    const {rows}=await pool.query(`SELECT b.id,b.status,b.total_amount,b.operator_id,t.departure_at FROM bookings b JOIN trips t ON t.id=b.trip_id WHERE b.id=$1::uuid AND b.customer_id=$2::uuid`,[id,customerId])
    const b=rows[0]; if(!b || !['PENDING_PAYMENT','CONFIRMED'].includes(b.status)) throw fail('Cancellable booking not found.',404)
    const hours=(new Date(b.departure_at).getTime()-Date.now())/3600000
    const policy=await this.cancellationPolicy(b.operator_id); const rule=this.refundRule(policy,hours)
    const refundPercent=Math.max(0,Math.min(100,Number(rule.refundPercent)||0)); const refundAmount=Math.round(Number(b.total_amount)*refundPercent)/100
    return {bookingId:id,hoursBeforeDeparture:Math.max(0,Math.floor(hours)),refundPercent,refundAmount,cancellationFee:Number(b.total_amount)-refundAmount,currency:'INR'}
  }

  async whatsappCancelBooking(id, phone, reason='Cancelled from WhatsApp') {
    const customerId=await this.customerIdForPhone(phone)
    if(!customerId) throw fail('Booking not found.',404)
    const client=await pool.connect()
    try{
      await client.query('BEGIN')
      const booking=(await client.query(`SELECT * FROM bookings WHERE id=$1::uuid AND customer_id=$2::uuid FOR UPDATE`,[id,customerId])).rows[0]
      if(!booking || !['PENDING_PAYMENT','CONFIRMED'].includes(booking.status)) throw fail('Cancellable booking not found.',404)
      const departure=(await client.query(`SELECT t.departure_at FROM trips t WHERE t.id=$1::uuid`,[booking.trip_id])).rows[0]?.departure_at
      const hours=(new Date(departure).getTime()-Date.now())/3600000
      const policy=await this.cancellationPolicy(booking.operator_id); const refundPercent=Math.max(0,Math.min(100,Number(this.refundRule(policy,hours).refundPercent)||0))
      const pay=(await client.query(`SELECT * FROM payments WHERE booking_id=$1::uuid AND status='CAPTURED' ORDER BY created_at DESC LIMIT 1 FOR UPDATE`,[id])).rows[0]
      let refund=null
      if(pay){
        const amount=Math.round(Number(pay.amount)*refundPercent)/100
        const pr=await paymentProvider.refund({paymentId:pay.provider_payment_id,amount,notes:{bookingId:id,reason,refundPercent,channel:'WHATSAPP'}})
        const status=pr.status==='processed'?'REFUNDED':'PENDING'
        refund=(await client.query(`INSERT INTO refunds(payment_id,provider_refund_id,amount,reason,status,provider_payload,requested_at,completed_at) VALUES($1::uuid,$2,$3,$4,$5,$6::jsonb,NOW(),CASE WHEN $5='REFUNDED' THEN NOW() END) RETURNING *`,[pay.id,pr.id,amount,reason,status,JSON.stringify(pr)])).rows[0]
        if(status==='REFUNDED') await client.query(`UPDATE payments SET status='REFUNDED',updated_at=NOW() WHERE id=$1::uuid`,[pay.id])
      }
      const cancelled=(await client.query(`UPDATE bookings SET status='CANCELLED',cancelled_at=NOW(),cancellation_reason=$2,updated_at=NOW() WHERE id=$1::uuid RETURNING *`,[id,reason])).rows[0]
      await client.query(`DELETE FROM trip_seat_segment_allocations WHERE booking_id=$1::uuid`,[id])
      const payload=JSON.stringify({bookingReference:booking.booking_reference,refundStatus:refund?.status||'NOT_REQUIRED',refundAmount:refund?.amount||0,channel:'WHATSAPP'})
      await client.query(`INSERT INTO notification_outbox(user_id,booking_id,channel,template_key,payload) VALUES($1::uuid,$2::uuid,'WHATSAPP','BOOKING_CANCELLED',$3::jsonb),($1::uuid,$2::uuid,'IN_APP','BOOKING_CANCELLED',$3::jsonb)`,[customerId,id,payload])
      await client.query('COMMIT'); return {booking:cancelled,refund}
    }catch(e){await client.query('ROLLBACK');throw e}finally{client.release()}
  }

  async whatsappSupport(id, phone, reason='Customer requested WhatsApp support') {
    const customerId=await this.customerIdForPhone(phone)
    const b=customerId?(await pool.query(`SELECT id,operator_id,booking_reference FROM bookings WHERE id=$1::uuid AND customer_id=$2::uuid`,[id,customerId])).rows[0]:null
    if(!b) throw fail('Booking not found.',404)
    const ticketNumber=`BG${Date.now().toString().slice(-10)}`
    return (await pool.query(`INSERT INTO support_tickets(ticket_number,customer_id,booking_id,operator_id,category,subject,description,priority) VALUES($1,$2::uuid,$3::uuid,$4::uuid,'BOOKING','WhatsApp support request',$5,'MEDIUM') RETURNING *`,[ticketNumber,customerId,id,b.operator_id,String(reason).slice(0,1000)])).rows[0]
  }

  async boardingCredential(bookingId, reference) {
    const secret=process.env.BOARDING_CREDENTIAL_SECRET||'development-boarding-secret'
    const expiresAt=new Date(Date.now()+15*60000)
    const nonce=crypto.randomBytes(18).toString('base64url')
    const payload=`${bookingId}.${Math.floor(expiresAt.getTime()/1000)}.${nonce}`
    const signature=crypto.createHmac('sha256',secret).update(payload).digest('base64url')
    const qrPayload=`BUSGO2.${payload}.${signature}`
    const otp=String(parseInt(crypto.createHmac('sha256',secret).update(`otp:${payload}`).digest('hex').slice(0,12),16)%1000000).padStart(6,'0')
    const tokenHash=crypto.createHmac('sha256',secret).update(qrPayload).digest('hex')
    const otpHash=crypto.createHmac('sha256',secret).update(`${bookingId}:${otp}`).digest('hex')
    await pool.query(`UPDATE boarding_credentials SET revoked_at=NOW() WHERE booking_id=$1::uuid AND revoked_at IS NULL`,[bookingId])
    await pool.query(`INSERT INTO boarding_credentials(booking_id,token_hash,otp_hash,expires_at) VALUES($1::uuid,$2,$3,$4)`,[bookingId,tokenHash,otpHash,expiresAt])
    return {qrPayload,otp,boardingCredentialExpiresAt:expiresAt.toISOString()}
  }

  async boardingPassForAuth(id, authUserId) {
    const customerId=await this.customerIdForAuth(authUserId)
    const booking=(await pool.query(`SELECT b.id,b.booking_reference,b.status,t.service_number,t.departure_at,
      origin.location_name boarding_point,bu.name bus_name
      FROM bookings b JOIN trips t ON t.id=b.trip_id JOIN buses bu ON bu.id=t.bus_id
      JOIN trip_stops origin ON origin.id=b.origin_stop_id
      WHERE b.id=$1::uuid AND b.customer_id=$2::uuid`,[id,customerId])).rows[0]
    if(!booking) throw fail('Booking not found.',404)
    if(booking.status!=='CONFIRMED') throw fail('Boarding pass is available only for confirmed bookings.',409)
    await pool.query(`INSERT INTO passenger_boarding_verifications(booking_id,passenger_id)
      SELECT booking_id,id FROM booking_passengers WHERE booking_id=$1::uuid ON CONFLICT DO NOTHING`,[id])
    const passengers=(await pool.query(`SELECT bp.id,bp.full_name name,bs.seat_number seat,
      COALESCE(v.status,'PENDING') boarding_status,v.verification_method,v.verified_at
      FROM booking_passengers bp JOIN bus_seats bs ON bs.id=bp.bus_seat_id
      LEFT JOIN passenger_boarding_verifications v ON v.passenger_id=bp.id
      WHERE bp.booking_id=$1::uuid ORDER BY bs.seat_number`,[id])).rows
    return {...booking,...await this.boardingCredential(booking.id,booking.booking_reference),passengers}
  }

}
module.exports = new BookingService()
