const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const bcrypt = require('bcrypt');
const authDao = require('../src/services/auth.dao');
const { closePool } = require('../src/config/database');

async function ensureDevAdmin() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Development admin bootstrap is disabled in production');
  }

  const phone = process.env.DEV_ADMIN_MOBILE || '+15555550100';
  const password = process.env.DEV_ADMIN_PASSWORD || 'Admin123!';
  const displayName = process.env.DEV_ADMIN_NAME || 'BusGo Administrator';
  const passwordHash = await bcrypt.hash(password, 12);

  await authDao.withTransaction(async (client) => {
    let user = await authDao.findUserByEmailOrPhone(phone, client);
    if (!user) {
      user = await authDao.createUser({
        phone,
        email: null,
        displayName,
        passwordHash,
        status: 'ACTIVE',
      }, client);
    } else {
      await authDao.updateUser(user.id, {
        display_name: displayName,
        password_hash: passwordHash,
        status: 'ACTIVE',
        failed_login_count: 0,
        locked_until: null,
      }, client);
    }
    await authDao.assignRole(user.id, 'SUPER_ADMIN', client);
  });

  console.log(`Development administrator is ready: ${phone}`);
}

ensureDevAdmin()
  .then(() => closePool())
  .catch(async (error) => {
    console.error(error.message);
    await closePool();
    process.exitCode = 1;
  });
