const { envelope } = require('../errors');
const config = require('../config');

module.exports = function errorHandler() {
  return (err, req, res, _next) => {
    const status = err.status || 500;
    const body = envelope(err, req);
    // Do not include stack traces in production
    if (config.env === 'production') {
      // nothing extra
    } else {
      body.stack = err.stack;
    }
    res.status(status).json(body);
  };
};
