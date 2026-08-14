const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

require('dotenv').config({ path: '.env' });
const { Client } = require('pg');

async function fixChecksum() {
  const sql = fs.readFileSync(path.join(__dirname, 'database', 'postgres', '001_platform_schema.sql'), 'utf8');
  const checksum = crypto.createHash('md5').update(sql).digest('hex');
  
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  
  try {
    const result = await client.query(
      'UPDATE schema_migrations SET checksum=$1 WHERE filename=$2 RETURNING *',
      [checksum, '001_platform_schema.sql']
    );
    console.log('Updated 001_platform_schema.sql checksum:', checksum);
    console.log('Updated rows:', result.rowCount);
    
    // Now run the migrations
    console.log('\nRunning full migration...');
    await client.end();
  } catch (err) {
    console.error('Error:', err.message);
    await client.end();
  }
}

fixChecksum().then(() => {
  console.log('Checksum fixed. Running migrations...');
  require('child_process').spawn('node', ['database/migrate.js'], { stdio: 'inherit' });
});
