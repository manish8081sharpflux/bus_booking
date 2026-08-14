const express = require('express');
const request = require('supertest');
const rateLimit = require('../middleware/rateLimit');
const { validateProductionEnv } = require('../production/env');

describe('production hardening', () => {
  test('rate limiter returns 429 after the configured limit', async () => {
    const app = express();
    app.use(rateLimit({ windowMs: 60000, max: 2, keyGenerator: () => 'test' }));
    app.get('/', (_req, res) => res.json({ ok: true }));
    expect((await request(app).get('/')).status).toBe(200);
    expect((await request(app).get('/')).status).toBe(200);
    expect((await request(app).get('/')).status).toBe(429);
  });

  test('production env rejects wildcard CORS', () => {
    const oldNode = process.env.NODE_ENV;
    const oldOrigins = process.env.ALLOWED_ORIGINS;
    process.env.NODE_ENV = 'production';
    process.env.ALLOWED_ORIGINS = '*';
    expect(() => validateProductionEnv({ service: 'test' })).toThrow(/wildcard/);
    process.env.NODE_ENV = oldNode;
    if (oldOrigins === undefined) delete process.env.ALLOWED_ORIGINS; else process.env.ALLOWED_ORIGINS = oldOrigins;
  });
});
