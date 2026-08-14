const request = require('supertest');
const express = require('express');
const correlation = require('../middleware/correlationId');

describe('shared middleware', () => {
  test('correlation middleware attaches requestId', async () => {
    const app = express();
    app.use(correlation());
    app.get('/', (req, res) => res.json({ id: req.requestId }));
    const res = await request(app).get('/');
    expect(res.body.id).toBeDefined();
  });
});
