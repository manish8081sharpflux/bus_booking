# BusGo Admin Operations Implementation

Implemented in this package:

- All Buses admin page with search, status filters, fleet statistics, seat configuration and compliance visibility.
- Trips admin page with global service list, route, bus/operator, departure, occupancy and fare/status visibility.
- Bookings admin page with customer, journey, operator, passenger count, payment state and booking totals.
- Payments & Refunds page with separate tabs, reconciliation statistics and payment/refund tables.
- New admin sidebar entries and routes for Buses, Trips, Bookings, Payments & Refunds.
- Operator service admin read APIs: `/admin/buses`, `/admin/trips`, `/admin/bookings`, `/admin/payments`.
- API gateway proxy for `/admin`.
- Responsive light/dark UI styles in `admin-operations.css`.

Provider-dependent work such as real Razorpay capture/refunds, SMS/WhatsApp delivery, and live GPS device integration is intentionally not faked here; those require provider credentials/configuration.
