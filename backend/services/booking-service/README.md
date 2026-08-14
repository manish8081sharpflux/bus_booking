# booking-service


npm run start:auth     
npm run start:booking
npm run start:search
npm run start:tracking
npm run start:consumers
npm run start:operator
 
This service owns booking write operations and emits Kafka booking events.

## Required DB table

```sql
CREATE TABLE IF NOT EXISTS bookings (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  trip_id TEXT NOT NULL,
  seats INT NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```
