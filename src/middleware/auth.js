"use strict";

const notp = require("notp");
const base32 = require("thirty-two");

let KEY = null;

function init(keyEnv) {
  if (keyEnv) {
    KEY = base32.decode(keyEnv.replace(/ /g, ""));
  }
}

/**
 * Auth middleware: skip if no key configured, otherwise redirect to login.
 */
function requireAuth(req, res, next) {
  if (!KEY) return next();
  if (req.session.login === true) return next();
  req.flash("error", "Please sign in.");
  res.redirect("/@login");
}

/**
 * Verify TOTP token. Returns truthy on success.
 */
function verifyToken(token) {
  if (!KEY) return false;
  return notp.totp.verify(token.replace(/ /g, ""), KEY);
}

module.exports = { init, requireAuth, verifyToken };