"use strict";

const { flashify } = require("../utils/flash");

/**
 * Global error handler — catches exceptions from route handlers.
 * On error, re-renders the current path with flash message.
 */
function errorHandler(err, req, res, next) {
  console.warn(err);
  const path = req.params[0] || "/";
  res.render(
    "list",
    flashify(req, {
      path,
      errors: [err.message],
    })
  );
}

module.exports = { errorHandler };