import express from 'express';

const app = express();
const port = Number(process.env.PORT || 4800);

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'inventory-service', mode: 'compatibility' });
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(port, () => console.log(`inventory-service compatibility endpoint listening on ${port}`));
}

export { app };
