# BusGo Mobile — Android + iOS

One Expo/React Native codebase for the BusGo customer app. It targets Android and iOS and shares the same BusGo backend used by the website and WhatsApp booking channel.

## Included customer flows

- Mobile OTP sign-in
- Search from/to/date
- Bus results with fare, time, availability, rating
- Seat selection
- Boarding and dropping point selection
- Passenger details and coupon field
- Server-side immutable fare quote
- Booking creation and DEMO payment fallback for local testing
- Ticket / PNR
- My Bookings
- Offers
- Profile and sign-out
- Live GPS status polling
- Secure token storage with Expo SecureStore

## Setup

```powershell
cd "D:\manish folder\bus-booking-system\BusGoMobile"
Copy-Item .env.example .env
npm install
```

Set `EXPO_PUBLIC_API_BASE_URL` in `.env`.

Android emulator:

```env
EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:4000/api
```

Physical Android/iPhone on the same LAN: use the development PC's LAN IP instead of `localhost`.

## Run Android

```powershell
npm run android
```

Or use a development server:

```powershell
npm run start
```

## Run iOS

Native iOS simulator/build commands require macOS/Xcode. On a Mac:

```bash
npm run ios
```

You can also use EAS Build from Windows to produce iOS builds after configuring your Apple account and EAS project.

## Generate native folders

```powershell
npm run prebuild
```

This generates `android/` and `ios/` from `app.json` when you need native customization.

## Production builds

```powershell
npx eas-cli login
npx eas-cli build:configure
npm run build:android
npm run build:ios
```

Replace `REPLACE_WITH_EAS_PROJECT_ID` in `app.json` after EAS configuration.

## Validation

```powershell
npm run typecheck
npm test
```
