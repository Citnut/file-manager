"use strict";

const fs = require("fs");
const { resolveRelative } = require("../utils/path");
const { exists, deleteEntry, readDir, chmod, copyFile } = require("../services/files");
const { createArchive, resolveEntries } = require("../services/archive");
const { flashify } = require("../utils/flash");
const { sanitizeFilename, safeJsonParse } = require("../utils/validate");

module.exports = function (app) {
  // Serve directory listing or file
  app.get("/*", (req, res) => {
    const filename = req.params[0];
    let fileStat;

    try {
      fileStat = fs.statSync(resolveRelative(filename));
    } catch (err) {
      fileStat = { error: err };
    }

    if (fileStat.error) {
      res.render(
        "list",
        flashify(req, {
          shellable: app.locals.shellEnabled,
          cmdable: app.locals.cmdEnabled,
          path: filename,
          errors: [fileStat.error.message],
        })
      );
      return;
    }

    if (fileStat.isDirectory()) {
      // Normalize trailing slash
      if (!req.url.endsWith("/")) {
        return res.redirect(req.url + "/");
      }

      try {
        const PAGE_SIZE = 100;
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const files = readDirSync(resolveRelative(filename));
        const total = files.length;
        const totalPages = Math.ceil(total / PAGE_SIZE);
        const start = (page - 1) * PAGE_SIZE;
        const pageFiles = files.slice(start, start + PAGE_SIZE);
        res.render(
          "list",
          flashify(req, {
            shellable: app.locals.shellEnabled,
            cmdable: app.locals.cmdEnabled,
            path: filename,
            files: pageFiles,
            page,
            totalPages,
            total,
          })
        );
      } catch (err) {
        res.render(
          "list",
          flashify(req, {
            shellable: app.locals.shellEnabled,
            cmdable: app.locals.cmdEnabled,
            path: filename,
            errors: [err.message],
          })
        );
      }
      return;
    }

    if (fileStat.isFile()) {
      res.sendFile(resolveRelative(filename), {
        headers: {
          "Content-Security-Policy": "default-src 'self'; script-src 'none'; sandbox",
        },
        dotfiles: "allow",
      });
    }
  });

  // Create folder
  app.post("/*@mkdir", (req, res) => {
    const base = req.params[0];
    const folder = sanitizeFilename(req.body.folder);

    if (!folder) {
      req.flash("error", "Invalid folder name.");
      return res.redirect("back");
    }

    const target = resolveRelative(base, folder);

    exists(target).then((yes) => {
      if (yes) {
        req.flash("error", "Folder exists, cannot overwrite.");
        return res.redirect("back");
      }
      fs.mkdir(target, (err) => {
        if (err) {
          req.flash("error", err.message);
        } else {
          req.flash("success", "Folder created.");
        }
        res.redirect("back");
      });
    });
  });

  // Delete files
  app.post("/*@delete", (req, res) => {
    const base = req.params[0];
    let files = safeJsonParse(req.body.files);
    if (!files || !files.length) {
      req.flash("error", "No files selected.");
      return res.redirect("back");
    }
    const jobs = files.map((f) =>
      deleteEntry(resolveRelative(base, f)).catch((err) => {
        throw new Error(`${f}: ${err.message}`);
      })
    );
    Promise.all(jobs)
      .then(() => {
        req.flash("success", "Files deleted.");
        res.redirect("back");
      })
      .catch((err) => {
        req.flash("error", "Unable to delete: " + err.message);
        res.redirect("back");
      });
  });

  // Download archive
  app.get("/*@download", (req, res) => {
    const base = req.params[0];
    let files = safeJsonParse(req.query.files);
    if (!files || !files.length) {
      req.flash("error", "No files selected.");
      return res.redirect("back");
    }
    resolveEntries(base, files)
      .then((entries) => createArchive(res, base, entries))
      .catch((err) => {
        req.flash("error", err.message);
        res.redirect("back");
      });
  });

  // Rename
  app.post("/*@rename", (req, res) => {
    const base = req.params[0];
    let files = safeJsonParse(req.body.files);
    if (!files || !files.length) {
      req.flash("error", "No files selected.");
      return res.redirect("back");
    }
    if (files.some((f) => !sanitizeFilename(f.original) || !sanitizeFilename(f.new))) {
      req.flash("error", "Invalid filename in request.");
      return res.redirect("back");
    }
    const jobs = files.map((f) =>
      new Promise((resolve, reject) => {
        fs.rename(resolveRelative(base, f.original), resolveRelative(base, f.new), (err) =>
          err ? reject(err) : resolve()
        );
      })
    );
    Promise.all(jobs)
      .then(() => {
        req.flash("success", "Files renamed.");
        res.redirect("back");
      })
      .catch((err) => {
        req.flash("error", "Rename failed: " + err.message);
        res.redirect("back");
      });
  });

  // Move
  app.post("/*@move", (req, res) => {
    const base = req.params[0];
    let files = safeJsonParse(req.body.files);
    const target = sanitizeFilename(req.body.target || "");
    if (!files || !files.length) {
      req.flash("error", "No files selected.");
      return res.redirect("back");
    }
    if (!target) {
      req.flash("error", "Invalid destination.");
      return res.redirect("back");
    }
    const destDir = resolveRelative(base, target);
    const jobs = files.map((f) => {
      const src = resolveRelative(base, f);
      const dest = path.join(destDir, f);
      return new Promise((resolve, reject) => {
        fs.rename(src, dest, (err) => (err ? reject(err) : resolve()));
      });
    });
    Promise.all(jobs)
      .then(() => {
        req.flash("success", "Files moved.");
        res.redirect("back");
      })
      .catch((err) => {
        req.flash("error", "Move failed: " + err.message);
        res.redirect("back");
      });
  });

  // Copy
  app.post("/*@copy", (req, res) => {
    const base = req.params[0];
    let files = safeJsonParse(req.body.files);
    const target = sanitizeFilename(req.body.target || "");
    if (!files || !files.length) {
      req.flash("error", "No files selected.");
      return res.redirect("back");
    }
    if (!target) {
      req.flash("error", "Invalid destination.");
      return res.redirect("back");
    }
    const destDir = resolveRelative(base, target);
    const jobs = files.map((f) => {
      const src = resolveRelative(base, f);
      const dest = path.join(destDir, f);
      return copyFile(src, dest).catch((err) => {
        throw new Error(`${f}: ${err.message}`);
      });
    });
    Promise.all(jobs)
      .then(() => {
        req.flash("success", "Files copied.");
        res.redirect("back");
      })
      .catch((err) => {
        req.flash("error", "Copy failed: " + err.message);
        res.redirect("back");
      });
  });

  // Chmod
  app.post("/*@chmod", (req, res) => {
    const base = req.params[0];
    let files = safeJsonParse(req.body.files);
    const modeStr = req.body.mode || "";
    const mode = parseInt(modeStr, 8);
    if (!files || !files.length) {
      req.flash("error", "No files selected.");
      return res.redirect("back");
    }
    if (isNaN(mode) || mode < 0 || mode > 0o777) {
      req.flash("error", "Invalid mode (must be octal 000-777).");
      return res.redirect("back");
    }
    const jobs = files.map((f) =>
      chmod(resolveRelative(base, f), mode).catch((err) => {
        throw new Error(`${f}: ${err.message}`);
      })
    );
    Promise.all(jobs)
      .then(() => {
        req.flash("success", "Permissions changed.");
        res.redirect("back");
      })
      .catch((err) => {
        req.flash("error", "Chmod failed: " + err.message);
        res.redirect("back");
      });
  });
};

// ---- helpers ----

function readDirSync(dirpath) {
  const filenames = fs.readdirSync(dirpath);
  return filenames.map((name) => {
    const full = dirpath + "/" + name;
    try {
      const stats = fs.statSync(full);
      const { isSmallImage, formatMode, getOwnerInfo } = require("../services/files");
      const { owner, group } = getOwnerInfo(stats);
      return {
        name,
        isdirectory: stats.isDirectory(),
        issmallimage: isSmallImage(name, stats.size),
        size: stats.size,
        mode: formatMode(stats.mode),
        owner,
        group,
      };
    } catch (err) {
      return { name, error: err.message };
    }
  });
}