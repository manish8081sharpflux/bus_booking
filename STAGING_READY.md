# BusGo staging package

This project is prepared for local/staging deployment without enabling real payments.

## URLs
- API Gateway: http://localhost:4000
- Customer + Operator web: http://localhost:5173
- Admin: http://localhost:5174
- Android emulator API: http://10.0.2.2:4000/api

## Start
1. Install Docker Desktop and Node dependencies.
2. Copy `staging/.env.staging.example` to `staging/.env.staging` and replace placeholder secrets.
3. Run `powershell -ExecutionPolicy Bypass -File staging/start-staging.ps1`.
4. Start frontend and admin using the commands printed by the script.
5. Run `powershell -ExecutionPolicy Bypass -File staging/validate-staging.ps1`.

WhatsApp is behind the optional Compose `whatsapp` profile so staging can start without real Meta credentials.

This package prepares staging; it does not deploy to a remote server because no server/deployment connection was provided to ChatGPT.
