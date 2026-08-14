const pool = require('../infrastructure/database/postgres.connection')
const { evaluateFare } = require('./pricing.engine')

async function createRoute({ operatorId, sourceCity, destinationCity, distanceKm, estimatedDurationMinutes, stops = [] }) {
  const cityPattern = /^[\p{L}\p{M} .'-]{2,80}$/u
  const distance = Number(distanceKm)
  const duration = Number(estimatedDurationMinutes)
  if (!operatorId || !sourceCity || !destinationCity || !cityPattern.test(sourceCity.trim()) || !cityPattern.test(destinationCity.trim()) || sourceCity.trim().toLowerCase() === destinationCity.trim().toLowerCase())
    throw Object.assign(new Error('Operator and distinct source/destination cities are required.'), { status: 422 })
  if (!Number.isFinite(distance) || distance <= 0 || distance > 10000 || !Number.isInteger(duration) || duration < 1 || duration > 10080)
    throw Object.assign(new Error('Distance must be 0.1–10,000 km and duration must be 1–10,080 minutes.'), { status: 422 })
  const existing = await pool.query(`SELECT * FROM routes WHERE operator_id=$1::uuid
    AND LOWER(source_city)=LOWER($2) AND LOWER(destination_city)=LOWER($3) AND is_active
    ORDER BY created_at DESC LIMIT 1`, [operatorId, sourceCity.trim(), destinationCity.trim()])
  if (existing.rows[0]) return existing.rows[0]
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const { rows } = await client.query(`INSERT INTO routes(operator_id,source_city,destination_city,distance_km,estimated_duration_minutes)
      VALUES($1::uuid,$2,$3,$4,$5) RETURNING *`, [operatorId, sourceCity.trim(), destinationCity.trim(), distanceKm || null, estimatedDurationMinutes || null])
    const route = rows[0]
    const items = stops.length ? stops : [
      { city: sourceCity, locationName: sourceCity, isDroppingAllowed: false },
      { city: destinationCity, locationName: destinationCity, isBoardingAllowed: false },
    ]
    for (const [i, stop] of items.entries()) await insertRouteStop(client, route.id, i, stop)
    await client.query('COMMIT'); return route
  } catch (error) { await client.query('ROLLBACK'); throw error } finally { client.release() }
}

async function createTrip({ operatorId, busId, routeId, serviceNumber, travelDate, departureTime, arrivalTime, baseFare }) {
  const departure = new Date(`${travelDate}T${departureTime}`); const arrival = new Date(`${travelDate}T${arrivalTime}`)
  if (arrival <= departure) arrival.setDate(arrival.getDate() + 1)
  const normalizedServiceNumber = String(serviceNumber || '').trim()
  const fare = Number(baseFare)
  const durationMinutes = (arrival.getTime() - departure.getTime()) / 60000
  if (!operatorId || !busId || !routeId || [departure, arrival].some(v => Number.isNaN(v.getTime())) || departure <= new Date() || durationMinutes < 5 || durationMinutes > 2880 || !/^[A-Za-z0-9][A-Za-z0-9/_-]{2,29}$/.test(normalizedServiceNumber) || !Number.isFinite(fare) || fare < 1 || fare > 100000)
    throw Object.assign(new Error('Service number, valid date/times and fare are required.'), { status: 422 })
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const bus = await client.query(`SELECT 1 FROM buses WHERE id=$1::uuid AND operator_id=$2::uuid AND status='ACTIVE'`, [busId, operatorId])
    if (!bus.rows[0]) throw Object.assign(new Error('Only an ACTIVE bus owned by this operator can be selected.'), { status: 422 })
    const existing = await client.query(`SELECT * FROM trips WHERE bus_id=$1::uuid AND departure_at=$2 FOR UPDATE`, [busId, departure])
    if (existing.rows[0]) { await client.query('COMMIT'); return existing.rows[0] }
    const { rows } = await client.query(`INSERT INTO trips(operator_id,bus_id,route_id,service_number,departure_at,arrival_at,base_fare,status)
      SELECT $1::uuid,$2::uuid,r.id,$4,$5,$6,$7,'DRAFT' FROM routes r WHERE r.id=$3::uuid AND r.operator_id=$1::uuid RETURNING *`,
      [operatorId, busId, routeId, normalizedServiceNumber, departure, arrival, fare])
    if (!rows[0]) throw Object.assign(new Error('Route not found for this operator.'), { status: 404 })
    const routeStops = await client.query('SELECT * FROM route_stops WHERE route_id=$1::uuid ORDER BY stop_order', [routeId])
    for (const s of routeStops.rows) {
      const scheduledArrival = new Date(departure.getTime() + Number(s.arrival_offset_minutes || 0) * 60000)
      const scheduledDeparture = new Date(departure.getTime() + Number(s.departure_offset_minutes || 0) * 60000)
      await client.query(`INSERT INTO trip_stops(trip_id,stop_order,city,location_name,address,landmark,contact_number,instructions,latitude,longitude,
        arrival_at,departure_at,scheduled_at,scheduled_arrival_at,scheduled_departure_at,is_boarding_allowed,is_dropping_allowed)
        VALUES($1::uuid,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$11,$11,$12,$13,$14)`,
        [rows[0].id,s.stop_order,s.city,s.location_name,s.address,s.landmark,s.contact_number,s.instructions,s.latitude,s.longitude,
          scheduledArrival,scheduledDeparture,s.is_boarding_allowed,s.is_dropping_allowed])
    }
    await client.query('SELECT generate_trip_inventory($1::uuid)', [rows[0].id])
    await client.query('COMMIT'); return rows[0]
  } catch (error) { await client.query('ROLLBACK'); throw error } finally { client.release() }
}

async function publishTrip({ tripId, operatorId }) {
  const { rows } = await pool.query(`UPDATE trips t SET status='SCHEDULED',published_at=NOW(),updated_at=NOW()
    WHERE t.id=$1::uuid AND t.operator_id=$2::uuid AND t.status='DRAFT' AND t.departure_at>NOW()
    AND EXISTS(SELECT 1 FROM trip_seat_inventory i WHERE i.trip_id=t.id) RETURNING t.*`, [tripId, operatorId])
  if (!rows[0]) throw Object.assign(new Error('Publishable future draft trip with inventory not found.'), { status: 409 })
  return rows[0]
}

async function listRoutes(operatorId) {
  const { rows } = await pool.query(`SELECT DISTINCT ON (LOWER(r.source_city),LOWER(r.destination_city)) r.*,
    COALESCE((SELECT JSON_AGG(rs ORDER BY rs.stop_order) FROM route_stops rs WHERE rs.route_id=r.id),'[]') stops
    FROM routes r WHERE r.operator_id=$1::uuid
    ORDER BY LOWER(r.source_city),LOWER(r.destination_city),r.created_at DESC`,[operatorId]); return rows
}
async function updateRouteStops({ routeId, operatorId, stops }) {
  const cityPattern = /^[\p{L}\p{M} .'-]{2,80}$/u
  if (!Array.isArray(stops) || stops.length < 2) throw Object.assign(new Error('At least a boarding and a dropping point are required.'), { status: 422 })
  for (const [i, s] of stops.entries()) {
    if (!s.city || !cityPattern.test(String(s.city).trim())) throw Object.assign(new Error(`Enter a valid city for stop ${i + 1}.`), { status: 422 })
    if (!s.locationName || !String(s.locationName).trim()) throw Object.assign(new Error(`Enter a location name for stop ${i + 1}.`), { status: 422 })
    const arrival=Number(s.arrivalOffsetMinutes||0),departure=Number(s.departureOffsetMinutes||0)
    if(!Number.isInteger(arrival)||!Number.isInteger(departure)||arrival<0||departure<arrival)
      throw Object.assign(new Error(`Stop ${i + 1} departure offset must be at or after its arrival offset.`),{status:422})
    if(i>0 && arrival<Number(stops[i-1].departureOffsetMinutes||0))
      throw Object.assign(new Error(`Stop ${i + 1} must occur after the previous stop.`),{status:422})
  }
  if (!stops.some((s) => s.isBoardingAllowed !== false)) throw Object.assign(new Error('At least one stop must allow boarding.'), { status: 422 })
  if (!stops.some((s) => s.isDroppingAllowed !== false)) throw Object.assign(new Error('At least one stop must allow dropping.'), { status: 422 })
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const route = await client.query(`SELECT id FROM routes WHERE id=$1::uuid AND operator_id=$2::uuid FOR UPDATE`, [routeId, operatorId])
    if (!route.rows[0]) throw Object.assign(new Error('Route not found for this operator.'), { status: 404 })
    await client.query(`DELETE FROM route_stops WHERE route_id=$1::uuid`, [routeId])
    for (const [i, s] of stops.entries()) await insertRouteStop(client, routeId, i, s)
    const { rows } = await client.query(`SELECT r.*,
      COALESCE((SELECT JSON_AGG(rs ORDER BY rs.stop_order) FROM route_stops rs WHERE rs.route_id=r.id),'[]') stops
      FROM routes r WHERE r.id=$1::uuid`, [routeId])
    await client.query('COMMIT')
    return rows[0]
  } catch (error) { await client.query('ROLLBACK'); throw error } finally { client.release() }
}

async function insertRouteStop(client, routeId, index, stop) {
  const latitude=stop.latitude===''||stop.latitude==null?null:Number(stop.latitude)
  const longitude=stop.longitude===''||stop.longitude==null?null:Number(stop.longitude)
  if((latitude===null)!==(longitude===null) || (latitude!==null && (!Number.isFinite(latitude)||!Number.isFinite(longitude)||Math.abs(latitude)>90||Math.abs(longitude)>180)))
    throw Object.assign(new Error(`Enter both valid latitude and longitude for stop ${index+1}.`),{status:422})
  return client.query(`INSERT INTO route_stops(route_id,stop_order,city,location_name,address,landmark,latitude,longitude,contact_number,instructions,
    arrival_offset_minutes,departure_offset_minutes,is_boarding_allowed,is_dropping_allowed)
    VALUES($1::uuid,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,[
    routeId,index+1,String(stop.city||'').trim(),String(stop.locationName||'').trim(),stop.address?String(stop.address).trim():null,
    stop.landmark?String(stop.landmark).trim():null,latitude,longitude,stop.contactNumber?String(stop.contactNumber).trim():null,
    stop.instructions?String(stop.instructions).trim():null,Number(stop.arrivalOffsetMinutes||0),Number(stop.departureOffsetMinutes||0),
    stop.isBoardingAllowed!==false,stop.isDroppingAllowed!==false])
}

async function listTrips(operatorId) {
  const { rows } = await pool.query(`SELECT t.*,b.name bus_name,r.source_city,r.destination_city,
    COUNT(i.bus_seat_id)::int total_seats,COUNT(i.bus_seat_id) FILTER(WHERE i.status='AVAILABLE')::int available_seats
    FROM trips t JOIN buses b ON b.id=t.bus_id JOIN routes r ON r.id=t.route_id LEFT JOIN trip_seat_inventory i ON i.trip_id=t.id
    WHERE t.operator_id=$1::uuid GROUP BY t.id,b.name,r.source_city,r.destination_city ORDER BY t.departure_at DESC`,[operatorId]); return rows
}

async function operatorBookings(operatorId) {
  if (!operatorId) throw Object.assign(new Error('Operator ID is required.'), { status: 422 })
  const { rows } = await pool.query(`SELECT b.id,b.booking_reference,b.status,b.total_amount,b.currency,b.created_at,
    t.service_number,t.departure_at,r.source_city,r.destination_city,bu.name bus_name,
    u.full_name customer_name,u.mobile customer_mobile,u.email customer_email,
    COALESCE(p.status::text,'NOT_PAID') payment_status,p.method payment_method,p.provider,p.provider_payment_id,p.created_at paid_at,
    COALESCE(JSON_AGG(JSON_BUILD_OBJECT('id',bp.id,'name',bp.full_name,'age',bp.age,'gender',bp.gender,'seat',bs.seat_number,'fare',bp.fare_amount,'boardingStatus',COALESCE(pbv.status,'PENDING'))
      ORDER BY bs.seat_number) FILTER (WHERE bp.id IS NOT NULL),'[]') passengers
    FROM bookings b JOIN trips t ON t.id=b.trip_id JOIN routes r ON r.id=t.route_id JOIN buses bu ON bu.id=t.bus_id
    JOIN platform_users u ON u.id=b.customer_id LEFT JOIN booking_passengers bp ON bp.booking_id=b.id
    LEFT JOIN passenger_boarding_verifications pbv ON pbv.passenger_id=bp.id
    LEFT JOIN bus_seats bs ON bs.id=bp.bus_seat_id LEFT JOIN LATERAL (SELECT * FROM payments px WHERE px.booking_id=b.id ORDER BY px.created_at DESC LIMIT 1) p ON TRUE
    WHERE b.operator_id=$1::uuid GROUP BY b.id,t.id,r.id,bu.id,u.id,p.id,p.status,p.method,p.provider,p.provider_payment_id,p.created_at ORDER BY b.created_at DESC`, [operatorId])
  const confirmed = rows.filter(row => row.status === 'CONFIRMED')
  return {
    summary: {
      totalBookings: rows.length,
      confirmedBookings: confirmed.length,
      cancelledBookings: rows.filter(row => row.status === 'CANCELLED').length,
      seatsSold: confirmed.reduce((sum, row) => sum + row.passengers.length, 0),
      grossRevenue: confirmed.reduce((sum, row) => sum + Number(row.total_amount), 0),
      capturedRevenue: rows.filter(row => row.payment_status === 'CAPTURED').reduce((sum, row) => sum + Number(row.total_amount), 0),
    },
    bookings: rows,
  }
}

async function getTripFares({ tripId, operatorId }) {
  const tripResult = await pool.query(`SELECT t.id,t.service_number,t.departure_at,t.arrival_at,t.status,t.currency,
    b.id bus_id,b.name bus_name,b.status bus_status,b.seat_capacity,r.source_city,r.destination_city
    FROM trips t JOIN buses b ON b.id=t.bus_id JOIN routes r ON r.id=t.route_id
    WHERE t.id=$1::uuid AND t.operator_id=$2::uuid`,[tripId,operatorId])
  if (!tripResult.rows[0]) throw Object.assign(new Error('Trip not found for this operator.'),{status:404})
  const [types,fares,stops]=await Promise.all([
    pool.query(`SELECT seat_type,COUNT(*)::int seat_count FROM bus_seats
      WHERE bus_id=$1::uuid AND is_active GROUP BY seat_type ORDER BY seat_type`,[tripResult.rows[0].bus_id]),
    pool.query(`SELECT tf.id,tf.origin_stop_id,tf.destination_stop_id,tf.seat_type,tf.fare,tf.currency FROM trip_fares tf
      JOIN trip_stops os ON os.id=tf.origin_stop_id JOIN trip_stops ds ON ds.id=tf.destination_stop_id
      WHERE tf.trip_id=$1::uuid ORDER BY os.stop_order,ds.stop_order,tf.seat_type`,[tripId]),
    pool.query(`SELECT id,stop_order,city,location_name FROM trip_stops WHERE trip_id=$1::uuid ORDER BY stop_order`,[tripId]),
  ])
  return {trip:tripResult.rows[0],seatTypes:types.rows,stops:stops.rows,fares:fares.rows}
}

async function upsertTripFares({ tripId, operatorId, fares }) {
  if (!Array.isArray(fares)||!fares.length) throw Object.assign(new Error('At least one fare is required.'),{status:422,errors:{fares:'At least one fare is required.'}})
  const normalized=fares.map(item=>({seatType:String(item.seatType||'').trim().toUpperCase(),fare:Number(item.fare),originStopId:item.originStopId||null,destinationStopId:item.destinationStopId||null}))
  const errors={}
  for(const item of normalized){
    if(!item.seatType) errors.seatType='Seat type is required.'
    if(!Number.isFinite(item.fare)||item.fare<=0||item.fare>100000) errors[item.seatType||'fare']='Fare must be greater than 0 and at most ₹100,000.'
  }
  if(new Set(normalized.map(item=>`${item.originStopId||'FIRST'}:${item.destinationStopId||'LAST'}:${item.seatType}`)).size!==normalized.length) errors.fares='Duplicate fares for the same segment and seat type are not allowed.'
  if(Object.keys(errors).length) throw Object.assign(new Error('Please correct the fare configuration.'),{status:422,errors})
  const client=await pool.connect()
  try{
    await client.query('BEGIN')
    const tripResult=await client.query(`SELECT t.id,t.bus_id,t.currency FROM trips t
      WHERE t.id=$1::uuid AND t.operator_id=$2::uuid AND t.status IN ('DRAFT','SCHEDULED') FOR UPDATE`,[tripId,operatorId])
    if(!tripResult.rows[0]) throw Object.assign(new Error('Fares can only be changed before a trip is published.'),{status:409})
    const typeResult=await client.query(`SELECT DISTINCT seat_type FROM bus_seats WHERE bus_id=$1::uuid AND is_active`,[tripResult.rows[0].bus_id])
    const allowed=new Set(typeResult.rows.map(row=>row.seat_type))
    const invalid=normalized.filter(item=>!allowed.has(item.seatType)).map(item=>item.seatType)
    if(invalid.length) throw Object.assign(new Error('Fare contains seat types not present on this bus.'),{status:422,errors:{seatTypes:invalid}})
    const stops=await client.query(`SELECT id FROM trip_stops WHERE trip_id=$1::uuid ORDER BY stop_order`,[tripId])
    if(stops.rowCount<2) throw Object.assign(new Error('Trip requires an origin and destination stop before fares can be saved.'),{status:422})
    const stopOrder=new Map(stops.rows.map((stop,index)=>[String(stop.id),index+1]))
    const defaultOrigin=stops.rows[0].id,defaultDestination=stops.rows[stops.rowCount-1].id
    const saved=[]
    for(const item of normalized){
      const origin=item.originStopId||defaultOrigin,destination=item.destinationStopId||defaultDestination
      if(!stopOrder.has(String(origin))||!stopOrder.has(String(destination))||stopOrder.get(String(origin))>=stopOrder.get(String(destination)))
        throw Object.assign(new Error('Each fare requires a valid forward route segment.'),{status:422})
      const result=await client.query(`INSERT INTO trip_fares(trip_id,origin_stop_id,destination_stop_id,seat_type,fare,currency)
        VALUES($1::uuid,$2::uuid,$3::uuid,$4,$5,$6)
        ON CONFLICT(trip_id,origin_stop_id,destination_stop_id,seat_type)
        DO UPDATE SET fare=EXCLUDED.fare,currency=EXCLUDED.currency RETURNING id,seat_type,fare,currency`,
        [tripId,origin,destination,item.seatType,item.fare,tripResult.rows[0].currency])
      saved.push(result.rows[0])
    }
    await client.query('COMMIT');return saved
  }catch(error){await client.query('ROLLBACK');throw error}finally{client.release()}
}

async function getTripInventory({tripId,operatorId}){
  const {rows}=await pool.query(`SELECT bs.id,bs.seat_number,bs.seat_type,bs.deck,bs.row_number,bs.column_number,
    bs.is_window,bs.is_female_reserved,i.status,i.hold_expires_at,
    (SELECT UPPER(bp.gender) FROM booking_passengers bp
     WHERE bp.booking_id=i.booking_id AND bp.bus_seat_id=bs.id LIMIT 1) booked_gender
    FROM trips t JOIN trip_seat_inventory i ON i.trip_id=t.id JOIN bus_seats bs ON bs.id=i.bus_seat_id
    WHERE t.id=$1::uuid AND t.operator_id=$2::uuid ORDER BY bs.deck,bs.row_number,bs.column_number`,[tripId,operatorId])
  return rows
}

async function searchBookableTrips({from,to,date}){
  if(!from||!to||!/^\d{4}-\d{2}-\d{2}$/.test(String(date||''))) throw Object.assign(new Error('From, to and a valid date are required.'),{status:422,errors:{search:'Complete all search fields.'}})
  const {rows}=await pool.query(`SELECT t.id,t.service_number,t.departure_at,t.arrival_at,t.currency,
    o.display_name operator,b.name bus,b.bus_type,b.amenities,r.source_city,r.destination_city,
    COALESCE((SELECT MIN(tf.fare) FROM trip_fares tf WHERE tf.trip_id=t.id),t.base_fare) starting_fare,
    COUNT(i.bus_seat_id)::int total_seats,
    COUNT(i.bus_seat_id) FILTER(WHERE i.status='AVAILABLE')::int available_seats,
    COALESCE((SELECT ROUND(AVG(cr.rating)::numeric,1) FROM customer_reviews cr WHERE cr.operator_id=t.operator_id AND cr.status='PUBLISHED'),0) rating,
    COALESCE((SELECT COUNT(*)::int FROM customer_reviews cr WHERE cr.operator_id=t.operator_id AND cr.status='PUBLISHED'),0) review_count,
    COALESCE((SELECT JSON_AGG(JSON_BUILD_OBJECT('id',ts.id,'name',ts.location_name,'city',ts.city,'address',ts.address,'landmark',rs.landmark,'scheduledAt',CASE WHEN ts.stop_order=1 THEN t.departure_at ELSE ts.scheduled_at END) ORDER BY ts.stop_order) FROM trip_stops ts LEFT JOIN route_stops rs ON rs.route_id=t.route_id AND rs.stop_order=ts.stop_order WHERE ts.trip_id=t.id AND ts.is_boarding_allowed),'[]') boarding_points,
    COALESCE((SELECT JSON_AGG(JSON_BUILD_OBJECT('id',ts.id,'name',ts.location_name,'city',ts.city,'address',ts.address,'landmark',rs.landmark,'scheduledAt',CASE WHEN ts.stop_order=(SELECT MAX(x.stop_order) FROM trip_stops x WHERE x.trip_id=t.id) THEN t.arrival_at ELSE ts.scheduled_at END) ORDER BY ts.stop_order) FROM trip_stops ts LEFT JOIN route_stops rs ON rs.route_id=t.route_id AND rs.stop_order=ts.stop_order WHERE ts.trip_id=t.id AND ts.is_dropping_allowed),'[]') dropping_points
    FROM trips t JOIN operators o ON o.id=t.operator_id JOIN buses b ON b.id=t.bus_id JOIN routes r ON r.id=t.route_id
    LEFT JOIN trip_seat_inventory i ON i.trip_id=t.id
    WHERE t.status='SCHEDULED' AND b.status='ACTIVE' AND t.departure_at>NOW() AND t.departure_at::date=$3::date
      AND LOWER(r.source_city)=LOWER($1) AND LOWER(r.destination_city)=LOWER($2)
    GROUP BY t.id,o.display_name,b.name,b.bus_type,b.amenities,r.source_city,r.destination_city
    HAVING COUNT(i.bus_seat_id) FILTER(WHERE i.status='AVAILABLE')>0 ORDER BY t.departure_at`,[String(from).trim(),String(to).trim(),date])
  const priced=await Promise.all(rows.map(async row=>{
    const rules=(await pool.query(`SELECT * FROM trip_fare_rules WHERE trip_id=$1::uuid AND is_active ORDER BY priority,created_at`,[row.id])).rows
    const pricedFare=evaluateFare({baseFare:Number(row.starting_fare),rules,departureAt:row.departure_at,totalSeats:Number(row.total_seats),availableSeats:Number(row.available_seats)})
    return {...row,base_starting_fare:String(pricedFare.baseFare),starting_fare:String(pricedFare.finalFare),dynamic_adjustment:pricedFare.adjustmentAmount,pricing_rules_applied:pricedFare.appliedRules.map(x=>({name:x.name,delta:x.delta,after:x.after}))}
  }))
  return priced
}

module.exports = { createRoute, createTrip, publishTrip, listRoutes, listTrips, operatorBookings, getTripFares, upsertTripFares, getTripInventory, searchBookableTrips }

async function getTripOperations({tripId,operatorId}) {
  const {rows}=await pool.query(`SELECT t.id,t.service_number,t.status,t.departure_at,t.arrival_at,t.base_fare,t.currency,r.source_city,r.destination_city,b.name bus_name,
    COALESCE((SELECT JSON_AGG(ts ORDER BY ts.stop_order) FROM trip_stops ts WHERE ts.trip_id=t.id),'[]') stops,
    COALESCE((SELECT JSON_AGG(fr ORDER BY fr.priority,fr.created_at) FROM trip_fare_rules fr WHERE fr.trip_id=t.id),'[]') fare_rules,
    COALESCE((SELECT JSON_AGG(JSON_BUILD_OBJECT('id',i.bus_seat_id,'seat_number',bs.seat_number,'status',i.status) ORDER BY bs.deck,bs.row_number,bs.column_number) FROM trip_seat_inventory i JOIN bus_seats bs ON bs.id=i.bus_seat_id WHERE i.trip_id=t.id),'[]') inventory
    FROM trips t JOIN routes r ON r.id=t.route_id JOIN buses b ON b.id=t.bus_id WHERE t.id=$1::uuid AND t.operator_id=$2::uuid`,[tripId,operatorId]);
  if(!rows[0]) throw Object.assign(new Error('Trip not found for this operator.'),{status:404}); return rows[0]
}
async function updateTripStops({tripId,operatorId,stops}) {
  if(!Array.isArray(stops)||stops.length<2) throw Object.assign(new Error('At least two trip stops are required.'),{status:422});
  const client=await pool.connect(); try{await client.query('BEGIN'); const trip=await client.query(`SELECT id,status,departure_at,arrival_at FROM trips WHERE id=$1::uuid AND operator_id=$2::uuid FOR UPDATE`,[tripId,operatorId]); if(!trip.rows[0]) throw Object.assign(new Error('Trip not found.'),{status:404}); if(!['DRAFT','SCHEDULED'].includes(trip.rows[0].status)) throw Object.assign(new Error('Stops cannot be edited after the trip starts or is cancelled.'),{status:409});
    for(let i=0;i<stops.length;i++){const s=stops[i]; const scheduled=s.scheduledAt?new Date(s.scheduledAt):null; if(scheduled&&Number.isNaN(scheduled.getTime())) throw Object.assign(new Error(`Invalid time for stop ${i+1}.`),{status:422}); await client.query(`UPDATE trip_stops SET city=$3,location_name=$4,address=$5,landmark=$6,contact_number=$7,latitude=$8,longitude=$9,scheduled_at=$10,is_boarding_allowed=$11,is_dropping_allowed=$12 WHERE id=$1::uuid AND trip_id=$2::uuid`,[s.id,tripId,String(s.city||'').trim(),String(s.locationName||'').trim(),s.address||null,s.landmark||null,s.contactNumber||null,s.latitude||null,s.longitude||null,scheduled?scheduleISO(scheduled):null,s.isBoardingAllowed!==false,s.isDroppingAllowed!==false]);}
    await client.query('COMMIT'); return getTripOperations({tripId,operatorId});
  }catch(e){await client.query('ROLLBACK');throw e}finally{client.release()}
}
function scheduleISO(d){return d.toISOString()}
async function setSeatBlocks({tripId,operatorId,seatIds,blocked,reason}) {
  if(!Array.isArray(seatIds)||!seatIds.length) throw Object.assign(new Error('Choose at least one seat.'),{status:422});
  const desired=blocked?'BLOCKED':'AVAILABLE'; const {rows}=await pool.query(`UPDATE trip_seat_inventory i SET status=$4::seat_status,updated_at=NOW() FROM trips t WHERE i.trip_id=t.id AND t.id=$1::uuid AND t.operator_id=$2::uuid AND i.bus_seat_id=ANY($3::uuid[]) AND i.status IN ('AVAILABLE','BLOCKED') RETURNING i.bus_seat_id,i.status`,[tripId,operatorId,seatIds,desired]);
  if(!rows.length) throw Object.assign(new Error('No eligible seats were changed. Booked or held seats cannot be blocked.'),{status:409}); return {changed:rows.length,status:desired,reason:reason||null,seats:rows}
}
async function upsertFareRules({tripId,operatorId,rules}) {
  if(!Array.isArray(rules)) throw Object.assign(new Error('Fare rules must be an array.'),{status:422})
  const client=await pool.connect()
  try{
    await client.query('BEGIN')
    const t=await client.query(`SELECT id FROM trips WHERE id=$1::uuid AND operator_id=$2::uuid AND status IN('DRAFT','SCHEDULED') FOR UPDATE`,[tripId,operatorId])
    if(!t.rows[0]) throw Object.assign(new Error('Editable trip not found.'),{status:409})
    await client.query(`DELETE FROM trip_fare_rules WHERE trip_id=$1::uuid`,[tripId])

    for(const [i,r] of rules.entries()){
      const type=String(r.ruleType||'').toUpperCase()
      const adj=String(r.adjustmentType||'').toUpperCase()
      const val=Number(r.adjustmentValue)
      const condition=r.condition||{}
      const priority=Number(r.priority)||100

      if(!['DATE','WEEKEND','OCCUPANCY','LAST_MINUTE'].includes(type) || !['PERCENTAGE','FIXED'].includes(adj) || !Number.isFinite(val))
        throw Object.assign(new Error(`Invalid fare rule ${i+1}.`),{status:422})
      if(adj==='PERCENTAGE' && (val < -100 || val > 300))
        throw Object.assign(new Error(`Percentage adjustment for rule ${i+1} must be between -100% and 300%.`),{status:422})
      if(adj==='FIXED' && Math.abs(val)>100000)
        throw Object.assign(new Error(`Fixed adjustment for rule ${i+1} is too large.`),{status:422})
      if(priority<1 || priority>10000)
        throw Object.assign(new Error(`Priority for rule ${i+1} must be between 1 and 10000.`),{status:422})

      if(type==='OCCUPANCY'){
        const min=Number(condition.minPercent ?? 0),max=Number(condition.maxPercent ?? 100)
        if(!Number.isFinite(min)||!Number.isFinite(max)||min<0||max>100||min>max)
          throw Object.assign(new Error(`Occupancy rule ${i+1} needs a valid 0–100% range.`),{status:422})
      }
      if(type==='LAST_MINUTE'){
        const hours=Number(condition.hoursBefore ?? 24)
        if(!Number.isFinite(hours)||hours<0||hours>8760)
          throw Object.assign(new Error(`Last-minute rule ${i+1} has an invalid hours-before value.`),{status:422})
      }
      if(type==='DATE'){
        const dates=Array.isArray(condition.dates)?condition.dates:(condition.date?[condition.date]:[])
        if(!dates.length || dates.some(d=>!/^\d{4}-\d{2}-\d{2}$/.test(String(d))))
          throw Object.assign(new Error(`Date rule ${i+1} requires a valid travel date.`),{status:422})
      }
      if(type==='WEEKEND' && condition.days){
        const days=Array.isArray(condition.days)?condition.days.map(Number):[]
        if(!days.length || days.some(d=>!Number.isInteger(d)||d<0||d>6))
          throw Object.assign(new Error(`Weekend rule ${i+1} has invalid days.`),{status:422})
      }

      await client.query(`INSERT INTO trip_fare_rules(
        trip_id,name,rule_type,adjustment_type,adjustment_value,condition_json,priority,is_active)
        VALUES($1::uuid,$2,$3,$4,$5,$6::jsonb,$7,$8)`,
        [tripId,String(r.name||`Rule ${i+1}`).trim(),type,adj,val,JSON.stringify(condition),priority,r.isActive!==false])
    }
    await client.query('COMMIT')
    return (await getTripOperations({tripId,operatorId})).fare_rules
  }catch(e){
    await client.query('ROLLBACK')
    throw e
  }finally{
    client.release()
  }
}

async function cancelTrip({tripId,operatorId,reason,actorUserId=null}) {
  if(!String(reason||'').trim()) throw Object.assign(new Error('Cancellation reason is required.'),{status:422}); const client=await pool.connect(); try{await client.query('BEGIN'); const {rows}=await client.query(`UPDATE trips SET status='CANCELLED',updated_at=NOW() WHERE id=$1::uuid AND ($2::uuid IS NULL OR operator_id=$2::uuid) AND status IN('DRAFT','SCHEDULED') RETURNING *`,[tripId,operatorId||null]); if(!rows[0]) throw Object.assign(new Error('Cancellable trip not found.'),{status:409}); await client.query(`INSERT INTO trip_disruptions(trip_id,disruption_type,reason,created_by) VALUES($1::uuid,'CANCELLED',$2,$3::uuid)`,[tripId,String(reason).trim(),actorUserId||null]); const affected=await client.query(`UPDATE bookings SET status='CANCELLED',cancelled_at=NOW(),cancellation_reason=$2,updated_at=NOW() WHERE trip_id=$1::uuid AND status IN('CONFIRMED','PENDING_PAYMENT') RETURNING id,booking_reference,customer_id`,[tripId,`Trip cancelled: ${String(reason).trim()}`]); await client.query(`UPDATE trip_seat_inventory SET status='AVAILABLE',booking_id=NULL,hold_token=NULL,hold_expires_at=NULL,updated_at=NOW() WHERE trip_id=$1::uuid`,[tripId]); for(const b of affected.rows) await client.query(`INSERT INTO notification_outbox(user_id,booking_id,channel,template_key,payload) VALUES($1::uuid,$2::uuid,'IN_APP','TRIP_CANCELLED',$3::jsonb),($1::uuid,$2::uuid,'SMS','TRIP_CANCELLED',$3::jsonb)`,[b.customer_id,b.id,JSON.stringify({bookingId:b.id,bookingReference:b.booking_reference,reason:String(reason).trim()})]); await client.query('COMMIT'); return {trip:rows[0],affectedBookings:affected.rowCount}
  }catch(e){await client.query('ROLLBACK');throw e}finally{client.release()}
}

async function verifyBoarding({operatorId,bookingId,passengerIds=[],credential,status='BOARDED',method}) {
  if(!operatorId||!bookingId) throw Object.assign(new Error('Operator and booking are required.'),{status:422})
  const booking=(await pool.query(`SELECT id,booking_reference,status FROM bookings WHERE id=$1::uuid AND operator_id=$2::uuid`,[bookingId,operatorId])).rows[0]
  if(!booking) throw Object.assign(new Error('Booking not found for this operator.'),{status:404})
  if(booking.status!=='CONFIRMED') throw Object.assign(new Error('Only confirmed bookings can be boarded.'),{status:409})
  const nextStatus=String(status).toUpperCase()
  if(!['BOARDED','NO_SHOW','PENDING'].includes(nextStatus)) throw Object.assign(new Error('Invalid boarding status.'),{status:422})
  let verificationMethod=String(method||'MANUAL').toUpperCase()
  if(nextStatus==='BOARDED'&&verificationMethod!=='MANUAL'){
    const secret=process.env.JWT_SECRET||'development-only-secret'
    const signature=require('crypto').createHmac('sha256',secret).update(`boarding:${booking.id}:${booking.booking_reference}`).digest('hex').slice(0,24)
    const validQr=`BUSGO:${booking.id}:${signature}`
    const validOtp=String(parseInt(signature.slice(0,12),16)%1000000).padStart(6,'0')
    verificationMethod=String(credential).startsWith('BUSGO:')?'QR':'OTP'
    const provided=String(credential||'').trim()
    const expected=verificationMethod==='QR'?validQr:validOtp
    const a=Buffer.from(provided),b=Buffer.from(expected)
    if(a.length!==b.length||!require('crypto').timingSafeEqual(a,b)) throw Object.assign(new Error('Invalid QR ticket or boarding OTP.'),{status:401})
  }
  const selected=Array.isArray(passengerIds)?passengerIds.filter(Boolean):[]
  await pool.query(`INSERT INTO passenger_boarding_verifications(booking_id,passenger_id)
    SELECT $1::uuid,bp.id FROM booking_passengers bp WHERE bp.booking_id=$1::uuid ON CONFLICT DO NOTHING`,[bookingId])
  const {rows}=await pool.query(`UPDATE passenger_boarding_verifications v SET status=$3,verification_method=$4,
    verified_at=CASE WHEN $3='PENDING' THEN NULL ELSE NOW() END,updated_at=NOW()
    WHERE v.booking_id=$1::uuid AND (COALESCE(array_length($2::uuid[],1),0)=0 OR v.passenger_id=ANY($2::uuid[]))
    RETURNING v.*`,[bookingId,selected,nextStatus,verificationMethod])
  return {bookingId,status:nextStatus,updated:rows.length,passengers:rows}
}

async function operationalTrips(operatorId,auth={}){
  const crewOnly=(auth.roles||[]).some(role=>['DRIVER','CONDUCTOR'].includes(role));
  const {rows}=await pool.query(`SELECT t.id,t.service_number,t.departure_at,t.arrival_at,t.status,b.name bus_name,
    r.source_city,r.destination_city,COUNT(DISTINCT bp.id)::int passenger_count,
    COUNT(DISTINCT pbv.passenger_id) FILTER(WHERE pbv.status='BOARDED')::int boarded_count,
    COUNT(DISTINCT pbv.passenger_id) FILTER(WHERE pbv.status='NO_SHOW')::int no_show_count
    FROM trips t JOIN buses b ON b.id=t.bus_id JOIN routes r ON r.id=t.route_id
    LEFT JOIN bookings bk ON bk.trip_id=t.id AND bk.status='CONFIRMED'
    LEFT JOIN booking_passengers bp ON bp.booking_id=bk.id
    LEFT JOIN passenger_boarding_verifications pbv ON pbv.passenger_id=bp.id
    WHERE t.operator_id=$1::uuid AND t.status IN('SCHEDULED','BOARDING','DEPARTED')
    AND (NOT $2::boolean OR EXISTS(SELECT 1 FROM trip_staff_assignments tsa JOIN operator_staff os ON os.id=tsa.staff_id
      WHERE tsa.trip_id=t.id AND os.identity_user_id=$3::uuid AND os.status='ACTIVE'))
    GROUP BY t.id,b.id,r.id ORDER BY t.departure_at`,[operatorId,crewOnly,auth.userId||null]);return rows
}

async function transitionTrip({operatorId,tripId,status,auth={}}){
  const next=String(status||'').toUpperCase();const previous={BOARDING:['SCHEDULED'],DEPARTED:['BOARDING'],COMPLETED:['DEPARTED']}
  if(!previous[next]) throw Object.assign(new Error('Allowed actions are start boarding, depart, and complete.'),{status:422})
  const crewOnly=(auth.roles||[]).some(role=>['DRIVER','CONDUCTOR'].includes(role));
  const {rows}=await pool.query(`UPDATE trips t SET status=$3::trip_status,updated_at=NOW() WHERE id=$1::uuid AND operator_id=$2::uuid AND status=ANY($4::trip_status[])
    AND (NOT $5::boolean OR EXISTS(SELECT 1 FROM trip_staff_assignments tsa JOIN operator_staff os ON os.id=tsa.staff_id WHERE tsa.trip_id=t.id AND os.identity_user_id=$6::uuid AND os.status='ACTIVE')) RETURNING t.*`,[tripId,operatorId,next,previous[next],crewOnly,auth.userId||null])
  if(!rows[0]) throw Object.assign(new Error('Trip cannot move to this status from its current state.'),{status:409});return rows[0]
}

async function createRecurringSchedule({operatorId,routeId,busId,serviceNumber,departureTime,baseFare,recurrenceType,selectedDays=[],startDate,endDate,exceptions=[]}){
  const recurrence=String(recurrenceType||'').toUpperCase()
  if(!['DAILY','WEEKDAYS','SELECTED_DAYS'].includes(recurrence)||!/^[0-9]{2}:[0-9]{2}$/.test(String(departureTime||''))||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(String(startDate||''))||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(String(endDate||'')))
    throw Object.assign(new Error('Valid recurrence, departure time, start date and end date are required.'),{status:422})
  const days=[...new Set(selectedDays.map(Number))]
  if(recurrence==='SELECTED_DAYS' && (!days.length||days.some(day=>day<0||day>6))) throw Object.assign(new Error('Choose at least one valid service day.'),{status:422})
  const route=(await pool.query(`SELECT * FROM routes WHERE id=$1::uuid AND operator_id=$2::uuid`,[routeId,operatorId])).rows[0]
  if(!route) throw Object.assign(new Error('Route not found.'),{status:404})
  const start=new Date(`${startDate}T00:00:00Z`),end=new Date(`${endDate}T00:00:00Z`)
  if(Number.isNaN(start.getTime())||Number.isNaN(end.getTime())||end<start||((end-start)/86400000)>366) throw Object.assign(new Error('Schedule range must be between 1 and 367 days.'),{status:422})
  const client=await pool.connect()
  let schedule
  try{
    await client.query('BEGIN')
    schedule=(await client.query(`INSERT INTO route_schedule_templates(operator_id,route_id,bus_id,service_number,departure_time,base_fare,recurrence_type,selected_days,starts_on,ends_on)
      VALUES($1::uuid,$2::uuid,$3::uuid,$4,$5::time,$6,$7,$8::smallint[],$9::date,$10::date) RETURNING *`,[operatorId,routeId,busId,String(serviceNumber||'').trim(),departureTime,baseFare,recurrence,days,startDate,endDate])).rows[0]
    for(const exception of exceptions) await client.query(`INSERT INTO route_schedule_exceptions(schedule_id,exception_date,action,departure_time,bus_id,base_fare,reason)
      VALUES($1::uuid,$2::date,$3,$4::time,$5::uuid,$6,$7) ON CONFLICT(schedule_id,exception_date) DO UPDATE SET action=EXCLUDED.action,departure_time=EXCLUDED.departure_time,bus_id=EXCLUDED.bus_id,base_fare=EXCLUDED.base_fare,reason=EXCLUDED.reason`,
      [schedule.id,exception.date,String(exception.action||'CANCEL').toUpperCase(),exception.departureTime||null,exception.busId||null,exception.baseFare||null,exception.reason||null])
    await client.query('COMMIT')
  }catch(e){await client.query('ROLLBACK');throw e}finally{client.release()}
  return materializeSchedule({operatorId,scheduleId:schedule.id})
}

async function materializeSchedule({operatorId,scheduleId}){
  const schedule=(await pool.query(`SELECT s.*,r.estimated_duration_minutes FROM route_schedule_templates s JOIN routes r ON r.id=s.route_id WHERE s.id=$1::uuid AND s.operator_id=$2::uuid`,[scheduleId,operatorId])).rows[0]
  if(!schedule) throw Object.assign(new Error('Schedule not found.'),{status:404})
  const exceptions=(await pool.query(`SELECT * FROM route_schedule_exceptions WHERE schedule_id=$1::uuid`,[scheduleId])).rows
  const exceptionByDate=new Map(exceptions.map(item=>[String(item.exception_date).slice(0,10),item]))
  let created=0,skipped=0
  for(let day=new Date(`${String(schedule.starts_on).slice(0,10)}T00:00:00Z`),last=new Date(`${String(schedule.ends_on).slice(0,10)}T00:00:00Z`);day<=last;day=new Date(day.getTime()+86400000)){
    const date=day.toISOString().slice(0,10),weekday=day.getUTCDay()
    const runs=schedule.recurrence_type==='DAILY'||(schedule.recurrence_type==='WEEKDAYS'&&weekday>=1&&weekday<=5)||(schedule.recurrence_type==='SELECTED_DAYS'&&(schedule.selected_days||[]).includes(weekday))
    const exception=exceptionByDate.get(date)
    if(!runs||exception?.action==='CANCEL'){skipped++;continue}
    const departureTime=exception?.departure_time?String(exception.departure_time).slice(0,5):String(schedule.departure_time).slice(0,5)
    const departure=new Date(`${date}T${departureTime}:00`)
    if(departure<=new Date()){skipped++;continue}
    const arrival=new Date(departure.getTime()+Number(schedule.estimated_duration_minutes||60)*60000)
    try{
      const trip=await createTrip({operatorId,busId:exception?.bus_id||schedule.bus_id,routeId:schedule.route_id,serviceNumber:schedule.service_number,travelDate:date,departureTime,arrivalTime:`${String(arrival.getHours()).padStart(2,'0')}:${String(arrival.getMinutes()).padStart(2,'0')}`,baseFare:exception?.base_fare||schedule.base_fare})
      await pool.query(`UPDATE trips SET schedule_template_id=$2::uuid,service_date=$3::date WHERE id=$1::uuid AND schedule_template_id IS NULL`,[trip.id,scheduleId,date])
      created++
    }catch(error){if(error.code==='23505') skipped++;else throw error}
  }
  return {schedule,createdTrips:created,skippedDates:skipped}
}

async function listRecurringSchedules(operatorId){
  const {rows}=await pool.query(`SELECT s.*,r.source_city,r.destination_city,b.name bus_name,
    COALESCE((SELECT JSON_AGG(e ORDER BY e.exception_date) FROM route_schedule_exceptions e WHERE e.schedule_id=s.id),'[]') exceptions,
    (SELECT COUNT(*)::int FROM trips t WHERE t.schedule_template_id=s.id) generated_trips
    FROM route_schedule_templates s JOIN routes r ON r.id=s.route_id JOIN buses b ON b.id=s.bus_id
    WHERE s.operator_id=$1::uuid ORDER BY s.created_at DESC`,[operatorId]);return rows
}

async function upsertScheduleException({operatorId,scheduleId,date,action,departureTime,busId,baseFare,reason}){
  const normalized=String(action||'').toUpperCase()
  if(!['CANCEL','CHANGE'].includes(normalized)) throw Object.assign(new Error('Exception action must be CANCEL or CHANGE.'),{status:422})
  const {rows}=await pool.query(`INSERT INTO route_schedule_exceptions(schedule_id,exception_date,action,departure_time,bus_id,base_fare,reason)
    SELECT s.id,$3::date,$4,$5::time,$6::uuid,$7,$8 FROM route_schedule_templates s WHERE s.id=$1::uuid AND s.operator_id=$2::uuid
    ON CONFLICT(schedule_id,exception_date) DO UPDATE SET action=EXCLUDED.action,departure_time=EXCLUDED.departure_time,bus_id=EXCLUDED.bus_id,base_fare=EXCLUDED.base_fare,reason=EXCLUDED.reason RETURNING *`,
    [scheduleId,operatorId,date,normalized,departureTime||null,busId||null,baseFare||null,reason||null])
  if(!rows[0]) throw Object.assign(new Error('Schedule not found.'),{status:404})
  if(normalized==='CANCEL') await pool.query(`UPDATE trips SET status='CANCELLED',updated_at=NOW() WHERE schedule_template_id=$1::uuid AND service_date=$2::date AND status IN('DRAFT','SCHEDULED')`,[scheduleId,date])
  return rows[0]
}
module.exports.getTripOperations=getTripOperations
module.exports.updateTripStops=updateTripStops
module.exports.setSeatBlocks=setSeatBlocks
module.exports.upsertFareRules=upsertFareRules
module.exports.cancelTrip=cancelTrip
module.exports.updateRouteStops=updateRouteStops
module.exports.verifyBoarding=verifyBoarding
module.exports.operationalTrips=operationalTrips
module.exports.transitionTrip=transitionTrip
module.exports.createRecurringSchedule=createRecurringSchedule
module.exports.materializeSchedule=materializeSchedule
module.exports.listRecurringSchedules=listRecurringSchedules
module.exports.upsertScheduleException=upsertScheduleException
