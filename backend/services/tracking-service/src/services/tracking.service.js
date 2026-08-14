const redis = require('../infrastructure/cache/redis.client');
const db = require('../infrastructure/database');
const { producer } = require('../infrastructure/events/kafka.client');
const { KAFKA_TRACKING_TOPIC } = require('../config/env');

const numberOrNull = (value) => (value == null ? null : Number(value));
const haversineKm = (a, b) => {
  if (!a || !b || a.lat == null || a.lng == null || b.lat == null || b.lng == null) return null;
  const rad = (degrees) => (degrees * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const value = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
};

class TrackingService {
  async updateLocation({ tripId, lat, lng, speed, heading, timestamp }) {
    if (!tripId || !Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng))) throw new Error('tripId, lat and lng are required.');
    if (Math.abs(Number(lat)) > 90 || Math.abs(Number(lng)) > 180) throw new Error('Invalid coordinates.');
    const data = { tripId, lat: Number(lat), lng: Number(lng), speed: numberOrNull(speed), heading: numberOrNull(heading), timestamp: timestamp || new Date().toISOString() };
    await redis.set(`trip:live:${tripId}`, JSON.stringify(data), 'EX', 3600);
    await db.query(`INSERT INTO trip_location_history(trip_id,latitude,longitude,speed_kph,heading,recorded_at) VALUES($1::uuid,$2,$3,$4,$5,$6::timestamptz)`, [tripId, data.lat, data.lng, data.speed, data.heading, data.timestamp]);
    await producer.send({ topic: KAFKA_TRACKING_TOPIC, messages: [{ key: String(tripId), value: JSON.stringify({ eventType: 'tracking.updated', payload: data }) }] });
    return data;
  }

  async getLiveLocation(tripId) {
    try {
      const raw = await redis.get(`trip:live:${tripId}`);
      if (raw) return JSON.parse(raw);
    } catch (error) { console.warn('[tracking-service] Redis location fallback:', error.message); }
    const { rows } = await db.query(`SELECT latitude lat,longitude lng,speed_kph speed,heading,recorded_at timestamp FROM trip_location_history WHERE trip_id=$1::uuid ORDER BY recorded_at DESC LIMIT 1`, [tripId]);
    return rows[0] || null;
  }

  async history(tripId, limit = 100) {
    const { rows } = await db.query(`SELECT latitude lat,longitude lng,speed_kph speed,heading,recorded_at timestamp FROM trip_location_history WHERE trip_id=$1::uuid ORDER BY recorded_at DESC LIMIT $2`, [tripId, Math.min(500, Math.max(1, Number(limit) || 100))]);
    return rows.reverse().map((point) => ({ ...point, lat: numberOrNull(point.lat), lng: numberOrNull(point.lng), speed: numberOrNull(point.speed), heading: numberOrNull(point.heading) }));
  }

  async assertCanView(tripId, auth) {
    const roles = (auth.roleCodes || [auth.role]).filter(Boolean);
    if (roles.some((role) => ['SUPER_ADMIN', 'OPERATOR', 'OPERATOR_ADMIN', 'OPERATOR_STAFF', 'DRIVER'].includes(role))) return;
    const { rowCount } = await db.query(`SELECT 1 FROM bookings b JOIN platform_users u ON u.id=b.customer_id WHERE b.trip_id=$1::uuid AND (u.auth_user_id=$2 OR u.auth_user_id=$3) LIMIT 1`, [tripId, String(auth.sub), `identity:${auth.sub}`]);
    if (!rowCount) throw Object.assign(new Error('You do not have access to this trip.'), { status: 403 });
  }

  async experience(tripId, auth) {
    await this.assertCanView(tripId, auth);
    const { rows } = await db.query(`SELECT t.id,t.service_number,t.departure_at,t.arrival_at,t.status,r.source_city,r.destination_city,b.name bus,o.display_name operator,COALESCE(JSON_AGG(JSON_BUILD_OBJECT('id',ts.id,'order',ts.stop_order,'city',ts.city,'name',ts.location_name,'address',ts.address,'lat',COALESCE(ts.latitude,rs.latitude),'lng',COALESCE(ts.longitude,rs.longitude),'scheduledAt',CASE WHEN ts.stop_order=1 THEN t.departure_at WHEN ts.stop_order=(SELECT MAX(x.stop_order) FROM trip_stops x WHERE x.trip_id=t.id) THEN t.arrival_at ELSE ts.scheduled_at END) ORDER BY ts.stop_order),'[]') stops FROM trips t JOIN routes r ON r.id=t.route_id JOIN buses b ON b.id=t.bus_id JOIN operators o ON o.id=t.operator_id JOIN trip_stops ts ON ts.trip_id=t.id LEFT JOIN route_stops rs ON rs.route_id=t.route_id AND rs.stop_order=ts.stop_order WHERE t.id=$1::uuid GROUP BY t.id,r.id,b.id,o.id`, [tripId]);
    if (!rows[0]) throw Object.assign(new Error('Trip not found.'), { status: 404 });
    const trip = rows[0];
    const stops = trip.stops.map((stop) => ({ ...stop, lat: numberOrNull(stop.lat), lng: numberOrNull(stop.lng) }));
    const raw = await this.getLiveLocation(tripId);
    const location = raw ? { lat: numberOrNull(raw.lat ?? raw.latitude), lng: numberOrNull(raw.lng ?? raw.longitude), speed: numberOrNull(raw.speed ?? raw.speed_kph), heading: numberOrNull(raw.heading), timestamp: raw.timestamp || raw.recorded_at } : null;
    const history = await this.history(tripId, 80);
    const now = Date.now();
    const ageSeconds = location?.timestamp ? Math.max(0, Math.round((now - new Date(location.timestamp).getTime()) / 1000)) : null;
    const freshness = ageSeconds == null ? 'WAITING' : ageSeconds <= 120 ? 'LIVE' : ageSeconds <= 900 ? 'DELAYED' : 'OFFLINE';
    let nextIndex = stops.findIndex((stop) => stop.scheduledAt && new Date(stop.scheduledAt).getTime() > now);
    if (nextIndex < 0) nextIndex = Math.max(0, stops.length - 1);
    const nextStop = stops[nextIndex] || null;
    const distanceKm = location && nextStop ? haversineKm(location, nextStop) : null;
    const speedKph = location?.speed && location.speed >= 5 ? location.speed : 35;
    const etaMinutes = distanceKm == null ? null : Math.max(1, Math.round((distanceKm / speedKph) * 60));
    const estimatedArrival = etaMinutes == null ? nextStop?.scheduledAt || trip.arrival_at : new Date(now + etaMinutes * 60000).toISOString();
    const scheduled = nextStop?.scheduledAt ? new Date(nextStop.scheduledAt).getTime() : null;
    const delayMinutes = scheduled && estimatedArrival ? Math.round((new Date(estimatedArrival).getTime() - scheduled) / 60000) : 0;
    const start = new Date(trip.departure_at).getTime();
    const end = new Date(trip.arrival_at).getTime();
    let progress = end > start ? ((now - start) / (end - start)) * 100 : 0;
    const coordinateStops = stops.filter((stop) => stop.lat != null && stop.lng != null);
    if (location && coordinateStops.length >= 2) {
      const travelled = haversineKm(coordinateStops[0], location);
      const total = haversineKm(coordinateStops[0], coordinateStops[coordinateStops.length - 1]);
      if (total) progress = (travelled / total) * 100;
    }
    return { trip: { id: trip.id, serviceNumber: trip.service_number, status: trip.status, source: trip.source_city, destination: trip.destination_city, departureAt: trip.departure_at, arrivalAt: trip.arrival_at, bus: trip.bus, operator: trip.operator }, location, history, stops, status: { freshness, ageSeconds, progress: Math.round(Math.max(0, Math.min(100, progress))), nextStop, distanceKm: distanceKm == null ? null : Number(distanceKm.toFixed(1)), etaMinutes, estimatedArrival, delayMinutes } };
  }
}
module.exports = new TrackingService();
