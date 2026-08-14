function attachOpenApi(app, doc) {
  app.get('/openapi.json', (_req, res) => {
    res.json(doc || { info: { title: app.locals.serviceName || 'service', version: '0.0.0' } });
  });
}

module.exports = { attachOpenApi };
