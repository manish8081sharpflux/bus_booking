const fs = require('fs');
require('dotenv').config({ path: '.env' });
const { Client } = require('pg');

async function debugRoute() {
  const routeId = 'e9f7be95-65fe-40a4-9e57-6efe62059b22';
  
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  
  try {
    console.log('\n=== Checking Route ===');
    console.log(`Looking for route: ${routeId}\n`);
    
    const r = await client.query(
      'SELECT id, operator_id, source_city, destination_city FROM routes WHERE id = $1',
      [routeId]
    );
    
    if (r.rowCount > 0) {
      console.log('✓ Route found:');
      console.log(r.rows[0]);
    } else {
      console.log('✗ Route NOT found in database\n');
      
      const allRoutes = await client.query(
        'SELECT id, operator_id, source_city, destination_city FROM routes ORDER BY created_at DESC LIMIT 10'
      );
      
      console.log('Available routes in database:');
      allRoutes.rows.forEach((route, i) => {
        console.log(`${i + 1}. ${route.id} | ${route.source_city} → ${route.destination_city}`);
      });
    }
    
    console.log('\n=== Checking Operators ===');
    const ops = await client.query(
      'SELECT id, legal_name, display_name FROM operators LIMIT 5'
    );
    console.log(`Found ${ops.rowCount} operators:`);
    ops.rows.forEach(op => {
      console.log(`- ${op.id} | ${op.display_name || op.legal_name}`);
    });
    
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

debugRoute();
