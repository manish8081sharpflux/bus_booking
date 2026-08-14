module.exports = (req, _res, next) => {
  const start = Date.now();
  _res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[gateway] ${req.method} ${req.originalUrl} ${_res.statusCode} - ${duration}ms`);
  });
  next();
};
