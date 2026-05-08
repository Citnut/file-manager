"use strict";

const path = require("path");

/**
 * Resolve relative path, reject anything that escapes root filesystem.
 */
function resolveRelative(...parts) {
  const resolved = path.resolve("/", ...parts);
  if (path.relative("/", resolved).startsWith("..")) {
    throw new Error("Path escapes root filesystem");
  }
  return resolved;
}

module.exports = { resolveRelative };