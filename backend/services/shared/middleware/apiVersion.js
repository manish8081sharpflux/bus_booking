const config = require('../config');

module.exports = function apiVersion(version) {
  const v = version || process.env.API_VERSION || '1.0';
  return (req, res, next) => {
    res.setHeader('X-API-Version', v);
    next();
  };
};
