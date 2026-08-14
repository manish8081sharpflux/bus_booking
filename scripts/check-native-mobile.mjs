import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const candidates = ['BusGoMobile', 'mobile'];
const mobileDir = candidates.map(name => path.join(root, name)).find(dir => fs.existsSync(path.join(dir, 'package.json')));

if (!mobileDir) {
  console.log('NATIVE_MOBILE_STATUS=SKIPPED');
  console.log('Reason: no React Native/Expo mobile package is included in this repository archive.');
  console.log('Mobile web is covered by Playwright Android/iOS viewport projects.');
  process.exit(0);
}

const pkg = JSON.parse(fs.readFileSync(path.join(mobileDir, 'package.json'), 'utf8'));
console.log(`Native mobile package detected: ${pkg.name || path.basename(mobileDir)}`);

const adb = spawnSync(process.platform === 'win32' ? 'adb.exe' : 'adb', ['devices'], { encoding: 'utf8' });
if (adb.error) {
  console.log('NATIVE_MOBILE_STATUS=READY_NOT_EXECUTED');
  console.log('Reason: adb is not available in this test environment.');
  process.exit(0);
}

const devices = adb.stdout.split(/\r?\n/).filter(line => /\tdevice$/.test(line));
if (!devices.length) {
  console.log('NATIVE_MOBILE_STATUS=READY_NOT_EXECUTED');
  console.log('Reason: no online Android device/emulator detected.');
  process.exit(0);
}

console.log(`NATIVE_MOBILE_STATUS=DEVICE_DETECTED (${devices.length})`);
console.log(devices.join('\n'));
