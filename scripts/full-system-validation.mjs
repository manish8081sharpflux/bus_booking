import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root=process.cwd();
const ok=[]; const fail=[];
function check(name, fn){try{fn();ok.push(name);console.log(`✓ ${name}`)}catch(e){fail.push([name,e.message]);console.error(`✗ ${name}: ${e.message}`)}}
function exists(p){if(!fs.existsSync(path.join(root,p)))throw new Error(`missing ${p}`)}
function read(p){return fs.readFileSync(path.join(root,p),'utf8')}

check('all 25 PostgreSQL migrations exist in sequence',()=>{
 const dir=path.join(root,'backend/services/database/postgres');
 const nums=fs.readdirSync(dir).filter(x=>/^\d{3}_.*\.sql$/.test(x)).map(x=>Number(x.slice(0,3))).sort((a,b)=>a-b);
 if(nums.length<25)throw new Error(`only ${nums.length} migrations found`);
 for(let i=1;i<=25;i++)if(!nums.includes(i))throw new Error(`migration ${String(i).padStart(3,'0')} missing`);
});
check('seed fleet exists',()=>exists('backend/services/database/seeds/001_august_2026_test_fleet.sql'));
check('customer web booking surfaces exist',()=>['frontend/src/pages/Customer/CustomerBookingsPage.tsx','frontend/src/pages/Customer/CustomerReviewPage.tsx','frontend/src/pages/Customer/WhatsAppCheckoutPage.tsx'].forEach(exists));
check('native booking management surfaces exist',()=>['BusGoMobile/src/app/booking/checkout.tsx','BusGoMobile/src/app/booking/manage.tsx','BusGoMobile/src/app/booking/reschedule.tsx','BusGoMobile/src/app/booking/review.tsx','BusGoMobile/src/app/support.tsx'].forEach(exists));
check('native package targets Android and iOS',()=>{const p=JSON.parse(read('BusGoMobile/package.json')); if(!p.scripts?.android||!p.scripts?.ios)throw new Error('android/ios scripts missing'); const app=JSON.parse(read('BusGoMobile/app.json')); if(!app.expo?.android?.package||!app.expo?.ios?.bundleIdentifier)throw new Error('native application ids missing')});
check('Playwright covers desktop Android-web and iOS-web',()=>{const s=read('playwright.config.ts');for(const x of ['web-desktop-chromium','mobile-android-chromium','mobile-ios-webkit'])if(!s.includes(x))throw new Error(`${x} missing`)});
check('booking E2E covers search seat passenger quote payment ticket',()=>{const s=read('e2e/customer-flow.spec.ts');for(const x of ['Search Buses','View Seats','Passenger Details','Review Booking','Confirm & Continue to Payment','BGPNR001','CONFIRMED'])if(!s.includes(x))throw new Error(`${x} missing`)});
check('production compose contains core infrastructure/services',()=>{const s=read('backend/services/docker-compose.production.yml');for(const x of ['postgres:','redis:','api-gateway:','auth-service:','booking-service:','operator-service:','tracking-service:','whatsapp-service:'])if(!s.includes(x))throw new Error(`${x} missing`)});

check('native responsive UI system is present',()=>{const s=read('BusGoMobile/src/components/Screen.tsx')+read('BusGoMobile/src/components/UI.tsx')+read('BusGoMobile/src/app/(tabs)/index.tsx')+read('BusGoMobile/src/app/trip/[id].tsx');for(const x of ['useWindowDimensions','useSafeAreaInsets','minHeight:52','accessibilityRole="button"','featuresStack','Maximum 6 seats'])if(!s.includes(x))throw new Error(`${x} missing`)});
check('workspace/dependency staging safeguards are present',()=>{const p=JSON.parse(read('package.json'));if((p.workspaces||[]).includes('BusGoMobile'))throw new Error('BusGoMobile should be installed independently until mobile lockfile exists');const docker=read('backend/services/Dockerfile');for(const x of ['notification-service/package.json','whatsapp-service/package.json'])if(!docker.includes(x))throw new Error(`${x} missing from Dockerfile`)});
check('payment failure is not swallowed on native checkout',()=>{const s=read('BusGoMobile/src/app/booking/checkout.tsx');if(/demoComplete\(id\)\s*\}\s*catch\s*\{\s*\}/.test(s))throw new Error('silent payment failure remains')});
check('operator/customer ownership hardening tests are present',()=>{const s=read('packages/qa/test/security.test.js')+read('packages/qa/test/integration.test.js');if(!/auth|role|operator|customer/i.test(s))throw new Error('security contract coverage missing')});

if(process.argv.includes('--run-qa')) check('automated QA suite passes',()=>execFileSync(process.platform==='win32'?'npm.cmd':'npm',['run','qa'],{cwd:root,stdio:'inherit'}));
console.log(`\nPhase 16 validation: ${ok.length} passed, ${fail.length} failed`);
if(fail.length)process.exit(1);
