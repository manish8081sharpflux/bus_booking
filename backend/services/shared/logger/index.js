const config = require('../config');
const redactKeys = [/password/i, /token/i, /otp/i, /authorization/i, /credential/i, /secret/i, /card/i];

function safeClone(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  try {
    return JSON.parse(JSON.stringify(obj));
  } catch (e) {
    return obj;
  }
}

function redact(obj) {
  const clone = safeClone(obj);
  if (!clone || typeof clone !== 'object') return clone;
  const walk = (o) => {
    if (Array.isArray(o)) return o.forEach(walk);
    for (const k of Object.keys(o)) {
      const v = o[k];
      if (v && typeof v === 'object') walk(v);
      if (typeof k === 'string' && redactKeys.some((r) => r.test(k))) o[k] = '[REDACTED]';
    }
  };
  walk(clone);
  return clone;
}

function createLogger(serviceName = config.serviceName) {
  function log(level, msg, meta = {}) {
    const entry = {
      timestamp: new Date().toISOString(),
      service: serviceName,
      level,
      message: msg,
      ...redact(meta),
    };
    // Structured JSON log to stdout
    try {
      console.log(JSON.stringify(entry));
    } catch (e) {
      console.log(entry);
    }
  }

  return {
    info: (m, meta) => log('info', m, meta),
    warn: (m, meta) => log('warn', m, meta),
    error: (m, meta) => log('error', m, meta),
    debug: (m, meta) => {
      if (config.env !== 'production') log('debug', m, meta);
    },
  };
}

module.exports = { createLogger };
