# Phase 17 — Final cleanup, dependency hardening and native UI polish

## Build/release fixes
- Removed BusGoMobile from root npm workspaces until a dedicated mobile lockfile is generated on a networked machine. Root mobile commands now use `npm --prefix BusGoMobile`.
- Added dependency/workspace consistency validation (`npm run validate:dependencies`).
- Added a minimal inventory-service compatibility source so TypeScript no longer has an empty input project.
- Added Node type resolution to shared config/http TypeScript projects.
- Fixed backend Dockerfile to stage notification-service and whatsapp-service manifests before dependency installation.
- Staging Docker uses `npm install --omit=dev` because the nested services lock predates the newest workspaces; refresh that lock on the next networked install.
- Browser E2E CI explicitly installs Playwright and Chromium/WebKit.
- Added native-mobile CI that installs the Expo app independently, runs smoke/UI validation, TypeScript and Expo config validation.

## Android/iOS UI polish
- New consistent BusGo red/white design tokens.
- Responsive max-width mobile/tablet content container.
- Safe-area bottom padding and keyboard-friendly scrolling.
- 52px minimum buttons/inputs for touch accessibility.
- Primary, secondary, danger and ghost button hierarchy.
- Improved tab bar spacing on Android and iOS.
- Redesigned home search card and responsive benefit cards.
- Redesigned seat layout with driver/front indicator, proper legend, accessible seat states, selection cap feedback and responsive seat sizing.
- Checkout passenger fields stack correctly on narrow phones.
- Cancellation uses destructive styling; reschedule/review/support actions use secondary hierarchy.
- Improved navigation transitions and screen headers.

## Validation run in this environment
- Production source check: PASS (warnings only for development/example credentials)
- Dependency/workspace consistency: PASS
- Phase 16+ UI/system validation: 13/13 PASS
- Automated QA: 16/16 PASS
- Native smoke test: PASS
- Native responsive/UI validation: PASS
- Backend JavaScript syntax checks: PASS
- Targeted TypeScript parser check: no syntax/parser errors; unresolved Expo/React Native modules are expected because node_modules are not installed in the audit container.

## Still environment-dependent
A full `npm ci`, workspace typecheck/build, Playwright browser execution, Expo typecheck/build, Android emulator/device run, iOS simulator/device run and real PostgreSQL/Redis live E2E require network-installed dependencies and/or platform tooling. CI workflows are included to execute those in a normal connected environment.
