"use strict";

const rateLimit = require("express-rate-limit");

/**
 * Global rate limiter — 120 req/min per IP.
 * Prevents brute-force on auth/upload endpoints.
 */
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Stricter limiter for auth endpoints — 10 attempts/min per IP.
 */
const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: "Too many login attempts. Try again in a minute.",
});

/**
 * Upload limiter — 60 req/min per IP.
 */
const uploadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { globalLimiter, authLimiter, uploadLimiter };