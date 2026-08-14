# BusGo Phase 9 — Validation + Responsive Viewport/UI Hardening

## What changed

### Shared validation
- Added reusable frontend validation helpers for names, email, Indian/international mobile numbers, OTP, password, numbers, dates, files, driving licences and secure URL tokens.
- Expanded `packages/validation` into a reusable typed validation contract for workspace packages.
- Added backend shared validation helpers with consistent HTTP 422 validation errors.
- Added backend validation tests for mobile, email and UUID handling.

### Staff/driver workflow
- Staff form now validates full name, Indian mobile, email, role, driver licence number, licence expiry and emergency contact.
- Driver licence details are mandatory for drivers.
- Emergency contact cannot match the staff mobile.
- Invalid fields render inline errors with `aria-invalid`.
- API-side validation mirrors the frontend rules so client validation cannot be bypassed.

### WhatsApp checkout
- Checkout token is validated before API calls.
- Token is URL encoded before use.
- Checkout API responses are checked for required booking, amount, route and passenger data before rendering/payment.
- Payment can only be started for `PENDING_PAYMENT` bookings with a valid unexpired token.

### Customer/operator viewport
- Added `frontend/src/theme/responsive.css` and imported it globally.
- Uses `100dvh` and safe-area insets for modern mobile browsers.
- Prevents horizontal page overflow.
- Responsive form grids collapse to one column on phones.
- Tables scroll safely rather than breaking the viewport.
- Modals become bottom-sheet style on small screens.
- Buttons get mobile-friendly touch sizes.
- Reduced-motion accessibility is respected.
- Invalid native form controls receive consistent red validation styling.

### Admin viewport
- Added viewport-fit support.
- Added responsive admin grid, table and dialog behavior.
- Admin cards and tables cannot force the page wider than the device.
- Responsive admin pages use 2-column tablet and 1-column phone layouts.

## Validation principle
Validation is enforced at two levels:
1. Frontend validation for immediate UX feedback.
2. Backend validation for security and data integrity.

Frontend validation must never be treated as the security boundary.

## Recommended device checks
- 360×800 Android
- 390×844 iPhone
- 768×1024 tablet
- 1024×768 tablet landscape
- 1366×768 laptop
- 1920×1080 desktop

Test browser zoom at 80%, 100%, 125%, 150% and 200%.
