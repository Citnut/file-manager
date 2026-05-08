"use strict";

/**
 * Block POST/PUT/PATCH requests that don't originate from the same origin.
 * Safe methods (GET/HEAD/OPTIONS) pass through.
 */
function csrfGuard(req, res, next) {
  if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") {
    return next();
  }

  let sourceHost = null;
  try {
    if (req.headers.origin) {
      sourceHost = new URL(req.headers.origin).host;
    } else if (req.headers.referer) {
      sourceHost = new URL(req.headers.referer).host;
    }
  } catch (_) {}

  if (sourceHost && sourceHost !== req.headers.host) {
    return res.status(403).send("Origin check failed");
  }

  next();
}

module.exports = { csrfGuard };