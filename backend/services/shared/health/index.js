const express = require('express');

function makeHealthRouter(checks = {}) {
  const router = express.Router();

  router.get('/health', (_req, res) => res.json({ status: 'ok' }));

  router.get('/health/live', (_req, res) => res.json({ status: 'live' }));

  router.get('/health/ready', async (_req, res) => {
    const names = Object.keys(checks);
    const results = {};
    let ok = true;
    await Promise.all(names.map(async (n) => {
      try {
        const r = await checks[n]();
        results[n] = r ? 'ok' : 'fail';
        if (!r) ok = false;
      } catch (e) {
        results[n] = 'error';
        ok = false;
      }
    }));
    res.status(ok ? 200 : 503).json({ status: ok ? 'ready' : 'not_ready', checks: results });
  });

  return router;
}

module.exports = { makeHealthRouter };
