const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const failures = [];
const warnings = [];

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules','.git','dist','build'].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full)); else out.push(full);
  }
  return out;
}

for (const file of walk(root)) {
  const rel = path.relative(root, file).replace(/\\/g, '/');
  if (/\.env$/.test(rel) && !/\.env\.example$/.test(rel)) failures.push(`Tracked environment file: ${rel}`);
  if (!/\.(js|ts|tsx|json|yml|yaml|env|example|md)$/.test(rel)) continue;
  let text = '';
  try { text = fs.readFileSync(file, 'utf8'); } catch { continue; }
  if (/JWT_SECRET\s*[:=]\s*['"]?change-me/i.test(text) && !rel.endsWith('docker-compose.yml') && !rel.endsWith('.env.example') && !rel.startsWith('docs/') && !rel.endsWith('.md')) failures.push(`Unsafe JWT default in ${rel}`);
  if (/postgres:\/\/postgres:postgres@/i.test(text) && !rel.endsWith('docker-compose.yml')) warnings.push(`Development database credential in ${rel}`);
}

if (!fs.existsSync(path.join(root, 'PRODUCTION_CHECKLIST.md'))) failures.push('PRODUCTION_CHECKLIST.md is missing');
console.log(JSON.stringify({ ok: failures.length === 0, failures, warnings }, null, 2));
if (failures.length) process.exit(1);
