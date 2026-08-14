module.exports = function requestTimeout(timeoutMs = Number(process.env.REQUEST_TIMEOUT_MS || 30000)) {
  return (req, res, next) => {
    res.setTimeout(timeoutMs, () => {
      if (!res.headersSent) res.status(503).json({ success: false, code: 'request_timeout', message: 'Request timed out.', requestId: req.requestId || null });
    });
    next();
  };
};
