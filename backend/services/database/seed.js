#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const SEEDS_DIR = path.join(__dirname, 'seeds');

function loadDatabaseUrl() {
  if (process.env.DATABASE_URL) return;

  const candidates = [
    path.resolve(__dirname, '../../../.env'),
    path.resolve(__dirname, '../operator-service/.env'),
    path.resolve(__dirname, '../booking-service/.env'),
  ];

  for (const file of candidates) {
    if (!fs.existsSync(file)) continue;
    const line = fs
      .readFileSync(file, 'utf8')
      .split(/\r?\n/)
      .find((entry) => /^\s*DATABASE_URL\s*=/.test(entry));
    if (!line) continue;

    let value = line.slice(line.indexOf('=') + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (value) {
      process.env.DATABASE_URL = value;
      console.log(`using DATABASE_URL from ${path.relative(process.cwd(), file)}`);
      return;
    }
  }
}

loadDatabaseUrl();

async function getClient() {
  const conn = process.env.DATABASE_URL;
  if (!conn) throw new Error('DATABASE_URL not set');
  const client = new Client({ connectionString: conn });
  await client.connect();
  return client;
}

async function runSeed(file) {
  let client;
  try {
    client = await getClient();
    const content = fs.readFileSync(file, 'utf8');
    await client.query('BEGIN');
    await client.query(content);
    await client.query('COMMIT');
    console.log('seeded', file);
  } catch (e) {
    if (client) await client.query('ROLLBACK').catch(() => {});
    console.error('seed failed', file, e.message);
    throw e;
  } finally {
    if (client) await client.end();
  }
}

async function runAll() {
  if (!fs.existsSync(SEEDS_DIR)) return console.log('no seeds');
  const files = fs.readdirSync(SEEDS_DIR).filter(f => f.endsWith('.sql')).sort();
  for (const f of files) await runSeed(path.join(SEEDS_DIR, f));
}

async function main() {
  const cmd = process.argv[2] || 'run';
  if (cmd === 'run') await runAll();
  else if (cmd === 'file' && process.argv[3]) await runSeed(process.argv[3]);
  else throw new Error(`unknown seed command: ${cmd}`);
}

main().catch(() => {
  process.exitCode = 1;
});
