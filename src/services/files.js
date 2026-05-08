"use strict";

const fs = require("fs");
const path = require("path");

const SMALL_IMAGE_MAX_SIZE = 750 * 1024; // 750 KB
const IMAGE_EXTS = new Set([".jpg", ".jpeg", ".png", ".webp", ".svg", ".gif", ".tiff"]);

function isImage(filename) {
  return IMAGE_EXTS.has(path.extname(filename).toLowerCase());
}

function isSmallImage(filename, size) {
  return isImage(filename) && size < SMALL_IMAGE_MAX_SIZE;
}

/**
 * Format POSIX permission string (e.g. drwxr-xr-x).
 */
function formatMode(mode) {
  const types = ["---", "--x", "-w-", "-wx", "r--", "r-x", "rw-", "rwx"];
  const type = types[(mode >> 6) & 7] + types[(mode >> 3) & 7] + types[mode & 7];

  // socket / block / char / fifo detection
  if ((mode & 0xC000) === 0xC000) return "s" + type.slice(1);
  if ((mode & 0xA000) === 0xA000) return "l" + type.slice(1);
  if ((mode & 0x6000) === 0x6000) return "b" + type.slice(1);
  if ((mode & 0x2000) === 0x2000) return "c" + type.slice(1);
  if ((mode & 0x1000) === 0x1000) return "p" + type.slice(1);

  if ((mode & 0x8000) && (mode & 0x4000)) return "d" + type;
  if (mode & 0x8000) return "-" + type;
  if (mode & 0x4000) return "d" + type;
  return "l" + type;
}

/**
 * Get owner/group name from uid/gid (fallback to numbers).
 */
function getOwnerInfo(stats) {
  try {
    const { execSync } = require("child_process");
    const uid = stats.uid;
    const gid = stats.gid;
    let owner = String(uid);
    let group = String(gid);
    try {
      owner = execSync(`id -nu ${uid} 2>/dev/null`, { stdio: "pipe" }).toString().trim();
    } catch (_) {}
    try {
      group = execSync(`getent group ${gid} 2>/dev/null | cut -d: -f1`, { stdio: "pipe" }).toString().trim() || group;
    } catch (_) {}
    return { owner, group };
  } catch (_) {
    return { owner: String(stats.uid), group: String(stats.gid) };
  }
}

/**
 * Read directory and return enriched file list.
 */
function readDir(dirpath) {
  return new Promise((resolve, reject) => {
    fs.readdir(dirpath, (err, filenames) => {
      if (err) return reject(err);

      const entries = filenames.map(
        (name) =>
          new Promise((res) => {
            const full = path.join(dirpath, name);
            fs.stat(full, (ferr, stats) => {
              if (ferr) {
                res({ name, error: ferr.message });
                return;
              }
              res({
                name,
                isdirectory: stats.isDirectory(),
                issmallimage: isSmallImage(name, stats.size),
                size: stats.size,
                mode: formatMode(stats.mode),
                owner: getOwnerInfo(stats).owner,
                group: getOwnerInfo(stats).group,
              });
            });
          })
      );

      Promise.all(entries)
        .then(resolve)
        .catch(reject);
    });
  });
}

/**
 * Check file/directory exists.
 */
function exists(filepath) {
  return new Promise((resolve) => {
    fs.stat(filepath, (err) => resolve(!err));
  });
}

/**
 * Delete a file or directory recursive.
 */
function deleteEntry(filepath) {
  return new Promise((resolve, reject) => {
    fs.stat(filepath, (err, stats) => {
      if (err) return reject(err);
      const op = stats.isDirectory() ? require("rimraf") : fs.unlink;
      op(filepath, (e) => (e ? reject(e) : resolve()));
    });
  });
}

/**
 * Change file mode (permissions).
 */
function chmod(filepath, mode) {
  return new Promise((resolve, reject) => {
    fs.chmod(filepath, mode, (err) => (err ? reject(err) : resolve()));
  });
}

/**
 * Copy file or directory (non-recursive by default).
 */
function copyFile(src, dest) {
  return new Promise((resolve, reject) => {
    const reader = fs.createReadStream(src);
    const writer = fs.createWriteStream(dest);
    reader.on("error", reject);
    writer.on("error", reject);
    writer.on("close", resolve);
    reader.pipe(writer);
  });
}

module.exports = {
  isImage,
  isSmallImage,
  formatMode,
  getOwnerInfo,
  readDir,
  exists,
  deleteEntry,
  chmod,
  copyFile,
  SMALL_IMAGE_MAX_SIZE,
};