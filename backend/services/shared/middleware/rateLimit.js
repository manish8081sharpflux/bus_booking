function createRateLimiter({ windowMs = 60_000, max = 100, keyGenerator, skip, message = 'Too many requests. Please try again later.' } = {}) {
  const buckets = new Map();
  const timer = setInterval(() => {
    const now = Date.now();
    for (const [key, value] of buckets) if (value.resetAt <= now) buckets.delete(key);
  }, Math.min(windowMs, 60_000));
  if (timer.unref) timer.unref();

  return (req, res, next) => {
    if (skip && skip(req)) return next();
    const key = keyGenerator ? keyGenerator(req) : (req.ip || req.socket?.remoteAddress || 'unknown');
    const now = Date.now();
    let bucket = buckets.get(key);
    if (!bucket || bucket.resetAt <= now) bucket = { count: 0, resetAt: now + windowMs };
    bucket.count += 1;
    buckets.set(key, bucket);
    const remaining = Math.max(0, max - bucket.count);
    res.setHeader('RateLimit-Limit', String(max));
    res.setHeader('RateLimit-Remaining', String(remaining));
    res.setHeader('RateLimit-Reset', String(Math.ceil(bucket.resetAt / 1000)));
    if (bucket.count > max) {
      res.setHeader('Retry-After', String(Math.max(1, Math.ceil((bucket.resetAt - now) / 1000))));
      return res.status(429).json({ success: false, code: 'rate_limited', message, requestId: req.requestId || null });
    }
    next();
  };
}
module.exports = createRateLimiter;
