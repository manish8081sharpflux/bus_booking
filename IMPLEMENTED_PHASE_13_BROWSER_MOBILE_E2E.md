# Phase 13 — Browser + Mobile E2E

## Added

- Playwright browser E2E configuration.
- Desktop Chromium project (1440×900).
- Android mobile-browser project (Pixel 7 profile).
- iOS mobile-browser project (iPhone 13 profile).
- Full mocked customer journey: Home → Search → Bus → Seat → Passenger → immutable quote → Booking → DEMO payment → confirmed ticket.
- Responsive overflow checks for customer home, customer login/signup and operator entry pages.
- Mobile touch-target validation.
- Native-mobile detector for React Native/Expo packages and connected Android devices.
- HTML/JUnit reports plus trace/video/screenshot capture on failure.

## Commands

Install the Playwright test runner once when dependencies are available:

```bash
npm install --no-save @playwright/test@1.55.0
npx playwright install chromium webkit
```

Run all browser projects:

```bash
npm run test:e2e:browser
```

Desktop web only:

```bash
npm run test:e2e:web
```

Android/iOS browser viewports:

```bash
npm run test:e2e:mobile-web
```

Native mobile availability/device detection:

```bash
npm run test:mobile:native
```

## Native app note

The current Phase-12 archive does not include a `BusGoMobile/package.json` or `mobile/package.json`. Therefore actual React Native APK/device E2E cannot execute from this archive. Mobile web is fully covered with Playwright Android and iOS device profiles. To enable native Android E2E, include the React Native project in the repository and run the native detector with an online ADB device/emulator; a Maestro/Detox suite can then be wired to the package.
