const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

require('dotenv').config({ path: '.env' });
const { Client } = require('pg');

async function fixAllChecksums() {
  const migrationsDir = path.join(__dirname, 'database', 'postgres');
  const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();
  
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  
  try {
    for (const file of files) {
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      const checksum = crypto.createHash('md5').update(sql).digest('hex');
      
      const result = await client.query(
        'UPDATE schema_migrations SET checksum=$1 WHERE filename=$2 RETURNING id',
        [checksum, file]
      );
      
      if (result.rowCount > 0) {
        console.log(`Fixed checksum for ${file}`);
      }
    }
    
    console.log('\nAll checksums updated. Running migrations...');
  } catch (err) {
    console.error('Error updating checksums:', err.message);
  } finally {
    await client.end();
  }
}

fixAllChecksums().then(() => {
  require('child_process').spawnSync('node', ['database/migrate.js'], { stdio: 'inherit', cwd: __dirname });
  process.exit(0);
});
