# Phase 18 — Web UI Polish

This phase applies the final visual and responsive pass to the BusGo customer website, operator portal and admin panel.

## Customer / operator web
- unified red/white BusGo design tokens
- consistent card radius, borders and shadows
- clearer button hierarchy and focus states
- improved form/input states
- polished customer hero/search/results cards
- improved booking stepper and sticky mobile actions
- better drawer and mobile navigation
- polished operator sidebar/topbar, tables and empty states
- tablet and phone layout refinements
- safe-area support and horizontal-overflow protection

## Admin
- consistent cards, inputs, buttons and tables
- stronger responsive layout behavior
- compact tablet/mobile grids
- responsive dialogs
- sidebar/header polish
- improved overflow behavior on large tables

## Responsive checks
Playwright responsive coverage now includes:
- 360x800 Android
- 390x844 iPhone
- 768x1024 tablet
- 1024x768 tablet landscape
- 1366x768 laptop
- 1920x1080 desktop

The responsive tests verify horizontal overflow and usable control sizing.

## Validation command

```powershell
npm run validate:web-ui
```

This verifies the BusGo branding, viewport-fit, customer/operator/admin polish imports, safe-area/focus accessibility rules, and the six responsive E2E viewport sizes.
