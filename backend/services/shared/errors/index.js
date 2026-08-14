class ApiError extends Error {
  constructor({ code = 'error', message = 'An error occurred', details = null, status = 500, requestId = null }) {
    super(message);
    this.code = code;
    this.details = details;
    this.status = status;
    this.requestId = requestId;
    Error.captureStackTrace(this, this.constructor);
  }
}

function envelope(err, req) {
  const requestId = (req && req.requestId) || (err && err.requestId) || null;
  return {
    code: err.code || 'error',
    message: err.message || 'An error occurred',
    details: err.details || null,
    requestId,
    timestamp: new Date().toISOString(),
  };
}

module.exports = { ApiError, envelope };
