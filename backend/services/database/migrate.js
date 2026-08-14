#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
const { Client } = require('pg');

const MIGRATIONS_DIR = path.join(__dirname, 'postgres');
const META_TABLE = 'schema_migrations';

function checksum(sql) {
  const crypto = require('crypto');
  return crypto.createHash('md5').update(sql).digest('hex');
}

async function getClient() {
  const conn = process.env.DATABASE_URL;
  if (!conn) throw new Error('DATABASE_URL not set');
  const client = new Client({ connectionString: conn });
  await client.connect();
  return client;
}

async function ensureMeta(client) {
  await client.query(`CREATE TABLE IF NOT EXISTS ${META_TABLE} (id serial primary key, filename text not null unique, checksum text not null, applied_at timestamptz not null default now())`);
}

async function recoverLegacyBaseline(client, filename, migrationChecksum, sql) {
  const sequence = Number(filename.slice(0, 3));
  if (!Number.isInteger(sequence) || sequence < 1 || sequence > 14) return false;
  const tables = [...sql.matchAll(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([a-z_][a-z0-9_]*)/gi)]
    .map((match) => match[1].toLowerCase());
  const types = [...sql.matchAll(/CREATE\s+TYPE\s+([a-z_][a-z0-9_]*)/gi)]
    .map((match) => match[1].toLowerCase());
  if (!tables.length && !types.length) return false;
  const tableResult = await client.query(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = ANY($1::text[])`,
    [tables]
  );
  const typeResult = await client.query(
    `SELECT typname FROM pg_type
     WHERE typnamespace = 'public'::regnamespace AND typname = ANY($1::text[])`,
    [types]
  );
  if (tableResult.rowCount !== new Set(tables).size || typeResult.rowCount !== new Set(types).size) return false;
  await client.query(
    `INSERT INTO ${META_TABLE} (filename, checksum) VALUES ($1, $2)
     ON CONFLICT (filename) DO NOTHING`,
    [filename, migrationChecksum]
  );
  console.log('baseline', filename, '(existing schema verified)');
  return true;
}

async function migrate() {
  const client = await getClient();
  await ensureMeta(client);
  const files = fs.readdirSync(MIGRATIONS_DIR).filter(f => f.endsWith('.sql')).sort();
  for (const f of files) {
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, f), 'utf8');
    const cs = checksum(sql);
    const res = await client.query(`SELECT checksum FROM ${META_TABLE} WHERE filename=$1`, [f]);
    if (res.rowCount && res.rows[0].checksum === cs) {
      console.log('skip', f);
      continue;
    }
    if (!res.rowCount && await recoverLegacyBaseline(client, f, cs, sql)) continue;
    console.log('apply', f);
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query(`INSERT INTO ${META_TABLE} (filename, checksum) VALUES ($1,$2) ON CONFLICT (filename) DO UPDATE SET checksum=EXCLUDED.checksum, applied_at=now()`, [f, cs]);
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      console.error('migration failed', f, e.message);
      await client.end();
      process.exit(1);
    }
  }
  await client.end();
}

async function status() {
  const client = await getClient();
  await ensureMeta(client);
  const res = await client.query(`SELECT filename, checksum, applied_at FROM ${META_TABLE} ORDER BY applied_at DESC`);
  console.table(res.rows);
  await client.end();
}

async function rollback() {
  console.log('Rollback is not implemented automatically. Implement manual rollback SQL files.');
}

async function run() {
  const cmd = process.argv[2] || 'migrate';
  if (cmd === 'migrate') await migrate();
  else if (cmd === 'status') await status();
  else if (cmd === 'rollback') await rollback();
  else console.log('unknown', cmd);
}

run().catch(e => { console.error(e); process.exit(1); });
