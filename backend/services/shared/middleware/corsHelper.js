module.exports = function createCorsOptions(allowedOriginsRaw) {
  const allowed = (allowedOriginsRaw || process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return {
    origin: allowed.length ? allowed : true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
  };
};
