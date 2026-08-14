const Redis = require('ioredis');
const { REDIS_URL } = require('../../config/env');

const redis = new Redis(REDIS_URL, {
  maxRetriesPerRequest: 3,
  enableReadyCheck: true
});

redis.on('connect', () => console.log('[operator-service] Redis connected'));
redis.on('error', (error) => console.error('[operator-service] Redis error', error.message));

module.exports = redis;
