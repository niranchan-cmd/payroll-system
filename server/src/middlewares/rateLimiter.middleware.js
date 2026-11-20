const rateLimit = require('express-rate-limit');

/**
 * Global API rate limiter — 200 requests per 15 min per IP
 */
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' },
});

/**
 * Login-specific rate limiter — 20 attempts per 15 min per IP
 * Only counts failed requests
 */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many login attempts, please try again later.' },
});

/**
 * Reset-password rate limiter — 5 attempts per hour per IP
 */
const resetPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many password reset attempts, please try again in an hour.' },
});

module.exports = { globalLimiter, loginLimiter, resetPasswordLimiter };
