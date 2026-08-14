# Phase 14 — Native Android + iOS Customer App

BusGoMobile is now a real Expo/React Native customer application rather than an empty folder.

## Platforms

- Android
- iOS

Both platforms use one React Native codebase and the same BusGo backend, inventory, pricing, bookings, payments and tracking APIs as web/WhatsApp.

## Added flows

OTP sign-in, customer home/search, bus results, seat selection, boarding/drop selection, passenger entry, coupons, immutable fare quote, booking, local DEMO payment completion, ticket/PNR, booking history, offers, profile/sign-out and live tracking status.

## Security / consistency

- Authentication token stored with Expo SecureStore.
- All authenticated API calls reuse the same bearer token.
- Mobile does not maintain a separate inventory or booking database.
- Checkout calls the server pricing quote API before booking.
- Booking and ticket data come from the shared booking service.

## Commands

From repository root:

- `npm run mobile:start`
- `npm run mobile:android`
- `npm run mobile:ios`
- `npm run mobile:typecheck`
- `npm run mobile:test`

See `BusGoMobile/README.md` for device/network configuration and EAS builds.
