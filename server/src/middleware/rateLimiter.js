/**
 * Sliding-window in-memory rate limiter middleware for FeedbackMind AI.
 * Zero external dependencies; zero vulnerability footprint.
 */
export function createRateLimiter({
  windowMs = 60 * 1000,
  maxRequests = 60,
  message = 'Too many requests from this IP, please try again later.',
  name = 'general'
} = {}) {
  const hits = new Map();

  // Periodic cleanup of stale entries every 2 minutes
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, timestamps] of hits.entries()) {
      const recent = timestamps.filter(t => now - t < windowMs);
      if (recent.length === 0) {
        hits.delete(key);
      } else {
        hits.set(key, recent);
      }
    }
  }, 2 * 60 * 1000);

  // Unref cleanup timer so it does not block Node.js exit
  if (cleanupInterval.unref) {
    cleanupInterval.unref();
  }

  return function rateLimiterMiddleware(req, res, next) {
    // In test environment, bypass rate limiting unless explicitly testing rate limits
    if (process.env.NODE_ENV === 'test' && !req.headers['x-test-rate-limit']) {
      return next();
    }

    const clientIp = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
    const key = `${name}:${clientIp}`;
    const now = Date.now();

    const clientTimestamps = (hits.get(key) || []).filter(t => now - t < windowMs);
    clientTimestamps.push(now);
    hits.set(key, clientTimestamps);

    const currentCount = clientTimestamps.length;
    const remaining = Math.max(0, maxRequests - currentCount);
    const resetTimeSec = Math.ceil((windowMs - (now - clientTimestamps[0])) / 1000);

    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', remaining);

    if (currentCount > maxRequests) {
      res.setHeader('Retry-After', resetTimeSec);
      return res.status(429).json({
        error: 'Too Many Requests',
        message,
        retryAfterSeconds: resetTimeSec,
        limiter: name
      });
    }

    next();
  };
}

// Preset Limiters for FeedbackMind AI
export const aiRateLimiter = createRateLimiter({
  name: 'ai-inference',
  windowMs: 60 * 1000,
  maxRequests: 30, // 30 AI queries per minute
  message: 'AI inference rate limit exceeded. Please wait a moment before sending more queries.'
});

export const uploadRateLimiter = createRateLimiter({
  name: 'csv-upload',
  windowMs: 60 * 1000,
  maxRequests: 10, // 10 CSV uploads per minute
  message: 'Upload rate limit exceeded. Please wait a minute before uploading another dataset.'
});

export const memoryRateLimiter = createRateLimiter({
  name: 'memory-operations',
  windowMs: 60 * 1000,
  maxRequests: 40, // 40 Hindsight memory queries per minute
  message: 'Memory operation rate limit exceeded. Please wait before retrying memory queries.'
});

export const generalRateLimiter = createRateLimiter({
  name: 'general-api',
  windowMs: 60 * 1000,
  maxRequests: 120, // 120 general requests per minute
  message: 'General API request limit exceeded.'
});

