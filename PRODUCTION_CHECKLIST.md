# BusGo Production Launch Checklist

## Release gate
- All migrations backed up and tested on staging.
- `NODE_ENV=production` on every backend service.
- Strong JWT, webhook, payment and tracking secrets configured outside Git.
- `ALLOWED_ORIGINS` contains only HTTPS production origins.
- HTTPS terminates at the load balancer/reverse proxy; HSTS enabled.
- PostgreSQL automated backups + restore drill completed.
- Redis persistence/failover policy documented.
- Payment webhook signature and duplicate delivery tested.
- WhatsApp webhook signature and duplicate delivery tested.
- Two-user same-seat concurrency test passes.
- Customer/operator/admin IDOR authorization suite passes.
- Refund failure/retry and trip-cancellation bulk refund flow tested.
- Monitoring alerts configured for 5xx rate, latency, DB, Redis, payment/refund and notification failures.

## Required smoke flow
1. Admin approves operator.
2. Operator creates verified bus, route, trip, stops, fares and publishes inventory.
3. Customer searches, selects seat, creates immutable quote and pays.
4. Ticket and WhatsApp confirmation are delivered.
5. Customer cancellation/refund succeeds.
6. Operator/admin see correct booking, payment, refund and settlement state.
