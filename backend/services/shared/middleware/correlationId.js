const crypto = require('crypto');
const config = require('../config');

function getUuid() {
  if (crypto && crypto.randomUUID) return crypto.randomUUID();
  return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
    (c ^ crypto.randomBytes(1)[0] & 15 >> c / 4).toString(16)
  );
}

module.exports = function correlationId() {
  return (req, res, next) => {
    const header = (req.headers[config.requestIdHeader] || req.headers['x-request-id'] || '').trim();
    const id = header || getUuid();
    req.requestId = id;
    res.setHeader('X-Request-ID', id);
    next();
  };
};
