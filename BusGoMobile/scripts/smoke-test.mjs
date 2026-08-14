import fs from 'node:fs'; import path from 'node:path';
const root=path.resolve(process.cwd());
const required=['package.json','app.json','src/app/_layout.tsx','src/app/login.tsx','src/app/(tabs)/index.tsx','src/app/(tabs)/bookings.tsx','src/app/search/index.tsx','src/app/trip/[id].tsx','src/app/booking/checkout.tsx','src/app/ticket/[id].tsx','src/lib/api.ts'];
const missing=required.filter(x=>!fs.existsSync(path.join(root,x)));if(missing.length){console.error('Missing mobile files:',missing);process.exit(1)}
const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));if(!pkg.dependencies?.expo||!pkg.dependencies?.['expo-router']){console.error('Expo dependencies missing');process.exit(1)}
console.log(`BusGo mobile smoke test passed (${required.length} required files).`);
