import { Request, Response, NextFunction } from 'express';

// Simple rate limiter using memory (for development)
const requestCounts = new Map<string, { count: number; resetTime: number }>();

export const rateLimiter = (req: Request, res: Response, next: NextFunction): void => {
  const ip = req.ip || 'unknown';
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxRequests = 100; // Max requests per window

  // Clean up old entries
  for (const [key, data] of requestCounts.entries()) {
    if (now > data.resetTime) {
      requestCounts.delete(key);
    }
  }

  // Get or create entry for this IP
  let entry = requestCounts.get(ip);
  if (!entry || now > entry.resetTime) {
    entry = { count: 0, resetTime: now + windowMs };
    requestCounts.set(ip, entry);
  }

  // Check if limit exceeded
  if (entry.count >= maxRequests) {
    res.status(429).json({
      success: false,
      error: 'Too many requests. Please try again later.',
      retryAfter: Math.ceil((entry.resetTime - now) / 1000)
    });
    return;
  }

  // Increment count and continue
  entry.count++;
  next();
};