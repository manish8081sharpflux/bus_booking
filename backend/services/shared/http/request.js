const config = require('../config');

async function request(url, opts = {}) {
  const headers = Object.assign({}, opts.headers || {});
  if (opts.requestId) headers['x-request-id'] = opts.requestId;
  // Use global fetch if available
  const fetcher = global.fetch || (typeof require === 'function' ? (() => {
    try { return require('node-fetch'); } catch (e) { return null; }
  })() : null);
  if (!fetcher) throw new Error('fetch not available');
  return fetcher(url, Object.assign({}, opts, { headers }));
}

module.exports = { request };
