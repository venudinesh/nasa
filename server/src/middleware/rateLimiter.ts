import { RateLimiterMemory } from 'rate-limiter-flexible';
import { Request, Response, NextFunction } from 'express';

// Create rate limiter
const rateLimiter = new RateLimiterMemory({
  points: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'), // Number of requests
  duration: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000') / 1000, // Convert ms to seconds
});

export const rateLimiterMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const key = String(req.ip ?? req.headers['x-forwarded-for'] ?? req.socket?.remoteAddress ?? req.connection?.remoteAddress ?? 'unknown');
    await rateLimiter.consume(key);
    next();
  } catch (rejRes: any) {
    const msBeforeNext = rejRes.msBeforeNext;
    
    res.status(429).json({
      error: 'Too Many Requests',
      message: `Rate limit exceeded. Try again in ${Math.round(msBeforeNext / 1000)} seconds.`,
      retryAfter: Math.round(msBeforeNext / 1000)
    });
  }
};

export { rateLimiterMiddleware as rateLimiter };