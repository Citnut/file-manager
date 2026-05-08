"use strict";

const archiver = require("archiver");
const fs = require("fs");
const { resolveRelative } = require("../utils/path");

/**
 * Build a zip archive from a list of {name, isfile, isdirectory} entries.
 * @param {object} res          - Express response object
 * @param {string} baseDir     - base directory for relative paths
 * @param {Array}  entries     - array of file entries
 */
function createArchive(res, baseDir, entries) {
  const zip = archiver("zip", {});

  zip.on("error", (err) => {
    res.status(500).send({ error: err.message });
  });

  for (const entry of entries) {
    const fullPath = resolveRelative(baseDir, entry.name);
    if (entry.isfile) {
      zip.file(fullPath, { name: entry.name });
    } else if (entry.isdirectory) {
      zip.directory(fullPath, entry.name);
    }
  }

  res.attachment("Archive.zip");
  zip.pipe(res);
  zip.finalize();
}

/**
 * Resolve a list of file entries with stat info.
 */
function resolveEntries(baseDir, names) {
  return Promise.all(
    names.map((name) => {
      const full = resolveRelative(baseDir, name);
      return new Promise((resolve, reject) => {
        fs.stat(full, (err, stats) => {
          if (err) return reject(err);
          resolve({ name, isfile: stats.isFile(), isdirectory: stats.isDirectory() });
        });
      });
    })
  );
}

module.exports = { createArchive, resolveEntries };