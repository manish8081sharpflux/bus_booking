# BusGo Admin Panel - Improved Build

This package contains a cleaned and improved admin-panel implementation focused on the actual BusGo administration workflow.

## Main improvements

- Removed duplicate QueryClientProvider usage from App.tsx.
- Removed duplicate TooltipProvider usage from the app composition.
- Removed Store Client wrapper from the admin app composition.
- Simplified authentication verification so it runs on initialization instead of every route change.
- Added safer React Query defaults and centralized query error handling.
- Replaced the template-heavy navigation with an admin-specific BusGo menu.
- Corrected Bus Verification navigation to `/bus-verification`.
- Simplified routing to real admin routes instead of demo/store/NFT/public-profile routes.
- Added a new operator-driven admin dashboard with live operator statistics.
- Redesigned Demo1 sidebar, brand, header and responsive mobile navigation.
- Added a consistent red BusGo admin theme.
- Improved Bus Verification UX, including summary cards, structured review sections, authenticated requests, better empty/loading states, and approval/rejection confirmation dialogs.
- Added dark-mode-aware styling for the new dashboard and verification page.
- Changed admin route authorization so authenticated admins can access all protected admin routes.
- Added safe fallback to the local admin menu when the backend role-menu endpoint returns no usable menu.

## Validation

`npx tsc --noEmit` passes successfully in the provided project.

The Vite production bundling step could not be completed in the Linux review environment because the uploaded `node_modules` directory is Windows-oriented and does not contain Rollup's Linux optional native package. On your Windows machine, run:

```powershell
npm install
npm run build
```

## Important environment values

Bus verification currently preserves your existing API convention:

```env
VITE_OPERATOR_API_URL=http://localhost:4000/api
```

Operator management continues using the project's existing `OPERATOR_API_BASE_URL` logic from `src/config/api.config.ts`.

If your bus API runs on a different service/port, update `VITE_OPERATOR_API_URL` in your local `.env`.
