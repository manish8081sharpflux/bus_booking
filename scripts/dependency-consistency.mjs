import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const lock = JSON.parse(fs.readFileSync(path.join(root, 'package-lock.json'), 'utf8'));
const issues = [];

for (const workspace of pkg.workspaces || []) {
  if (workspace.includes('*')) continue;
  if (!fs.existsSync(path.join(root, workspace, 'package.json'))) issues.push(`Missing workspace package: ${workspace}`);
}
if ((pkg.workspaces || []).includes('BusGoMobile')) issues.push('BusGoMobile must remain independently installed until its lockfile is generated.');
if (!fs.existsSync(path.join(root, 'BusGoMobile', 'package.json'))) issues.push('BusGoMobile package is missing.');

const dockerfile = fs.readFileSync(path.join(root, 'backend/services/Dockerfile'), 'utf8');
for (const svc of ['notification-service','whatsapp-service']) {
  if (!dockerfile.includes(`COPY ${svc}/package.json`)) issues.push(`Dockerfile does not stage ${svc}/package.json before install.`);
}

if (issues.length) { console.error(issues.join('\n')); process.exit(1); }
console.log('Dependency/workspace consistency checks passed.');
