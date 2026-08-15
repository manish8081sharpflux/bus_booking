const WINDOW_MS = 60 * 1000
const MAX_REQUESTS = 30
const MAX_TRACKED_CLIENTS = 10000

const buckets = new Map()

const clientKey = (req) =>
  String(
    req.ip ||
      req.socket?.remoteAddress ||
      'unknown',
  )

const pruneExpired = (now) => {
  for (const [key, value] of buckets) {
    if (value.resetAt <= now) {
      buckets.delete(key)
    }
  }
}

const publicLookupRateLimit = (
  req,
  res,
  next,
) => {
  const now = Date.now()
  const key = clientKey(req)
  let bucket = buckets.get(key)

  if (!bucket || bucket.resetAt <= now) {
    if (buckets.size >= MAX_TRACKED_CLIENTS) {
      pruneExpired(now)
    }

    if (buckets.size >= MAX_TRACKED_CLIENTS) {
      const oldestKey =
        buckets.keys().next().value

      if (oldestKey !== undefined) {
        buckets.delete(oldestKey)
      }
    }

    bucket = {
      count: 0,
      resetAt: now + WINDOW_MS,
    }

    buckets.set(key, bucket)
  }

  bucket.count += 1

  const remaining = Math.max(
    0,
    MAX_REQUESTS - bucket.count,
  )

  res.setHeader(
    'X-RateLimit-Limit',
    String(MAX_REQUESTS),
  )

  res.setHeader(
    'X-RateLimit-Remaining',
    String(remaining),
  )

  if (bucket.count > MAX_REQUESTS) {
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil(
        (bucket.resetAt - now) / 1000,
      ),
    )

    res.setHeader(
      'Retry-After',
      String(retryAfterSeconds),
    )

    return res.status(429).json({
      success: false,
      message:
        'Too many lookup requests. Please try again shortly.',
    })
  }

  return next()
}

module.exports = {
  publicLookupRateLimit,
  __test: {
    buckets,
    WINDOW_MS,
    MAX_REQUESTS,
    MAX_TRACKED_CLIENTS,
  },
}