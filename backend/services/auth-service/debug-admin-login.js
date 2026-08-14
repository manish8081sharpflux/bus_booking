const { Client } = require('pg');
const bcrypt = require('bcrypt');

(async () => {
  const client = new Client({ connectionString: 'postgres://postgres:postgres@localhost:5432/bus_booking' });
  await client.connect();
  const res = await client.query('SELECT id, phone, status, password_hash, length(password_hash)::int AS len FROM identity_users WHERE phone = $1', ['+15555550100']);
  console.log('rows', res.rows);
  if (res.rows.length === 0) {
    console.error('User not found');
    process.exit(1);
  }
  const { password_hash: hash } = res.rows[0];
  console.log('hash valid prefix', hash.startsWith('$2b$12$'));
  console.log('hash length', hash.length);
  const ok = await bcrypt.compare('Admin123!', hash);
  console.log('bcrypt compare result', ok);
  await client.end();
})();
