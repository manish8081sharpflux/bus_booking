# Phase 19 — Local Real-WhatsApp Test Adapter

Added an isolated localhost-only `whatsapp-web.js` transport so the existing BusGo WhatsApp conversation engine can be exercised from the real WhatsApp app without Meta Cloud API/webhook configuration.

## Important
- Unofficial development transport only; never production.
- `WHATSAPP_PROVIDER=webjs` enables it. Existing Meta transport remains unchanged for production.
- The QR must be scanned by a separate WhatsApp account that acts as the BusGo test sender.
- Test customer is restricted to `+91 91206 58081` by default in `.env.local-web.example`.
- Other inbound numbers are ignored; outbound messages to other numbers are blocked.
- Linked-device auth/cache directories are gitignored.

## Run
```powershell
Copy-Item backend\services\whatsapp-service\.env.local-web.example backend\services\whatsapp-service\.env
npm run whatsapp:local:install
npm run whatsapp:local
```

Then scan the QR from the BusGo sender/test account and send `HI` from +91 91206 58081.
