"use strict";

/**
 * Input validation helpers.
 */

/**
 * Reject null bytes, path traversal, and empty/whitespace-only strings.
 */
function sanitizeFilename(name) {
  if (!name || typeof name !== "string") return "";
  if (name.includes("\0") || name.includes("/") || name === "..") return "";
  const trimmed = name.trim();
  if (trimmed === "" || trimmed.startsWith(".")) return "";
  return trimmed;
}

/**
 * Require non-empty string, max 255 chars.
 */
function requireString(value, maxLen = 255) {
  if (typeof value !== "string" || value.trim() === "") return null;
  if (value.length > maxLen) return null;
  return value.trim();
}

/**
 * Parse JSON safely, return null on error.
 */
function safeJsonParse(raw) {
  try {
    return JSON.parse(raw);
  } catch (_) {
    return null;
  }
}

/**
 * Require array of non-empty strings, each sanitized.
 */
function sanitizeFilenameArray(arr) {
  if (!Array.isArray(arr)) return null;
  return arr.map(sanitizeFilename).filter(Boolean);
}

/**
 * Validate shell command (basic blocklist).
 */
function isSafeCommand(cmd) {
  if (!cmd || typeof cmd !== "string") return false;
  // Block obvious injection patterns
  const blocked = ["\0", "\n", "\r", ";", "&&", "||", ">", "<", "|", "`", "$(", "rm -rf /"];
  for (const pat of blocked) {
    if (cmd.includes(pat)) return false;
  }
  return true;
}

module.exports = {
  sanitizeFilename,
  requireString,
  safeJsonParse,
  sanitizeFilenameArray,
  isSafeCommand,
};