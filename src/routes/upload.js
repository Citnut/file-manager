"use strict";

const fs = require("fs");
const { resolveRelative } = require("../utils/path");
const { exists } = require("../services/files");
const { sanitizeFilename } = require("../utils/validate");

module.exports = function (app) {
  app.post("/*@upload", (req, res) => {
    const base = req.params[0];
    let fileBuffer = null;
    let saveas = null;

    req.busboy.on("file", (key, stream) => {
      if (key !== "file" || fileBuffer) return;
      const chunks = [];
      stream.on("data", (d) => chunks.push(d));
      stream.on("end", () => {
        fileBuffer = Buffer.concat(chunks);
      });
    });

    req.busboy.on("field", (key, value) => {
      if (key === "saveas") saveas = value;
    });

    req.busboy.on("finish", () => {
      if (!fileBuffer || !saveas) {
        return res.status(400).send("Missing file or saveas.");
      }

      const safeName = sanitizeFilename(saveas);
      if (!safeName) {
        req.flash("error", "Invalid filename.");
        return res.redirect("back");
      }

      const target = resolveRelative(base, safeName);

      exists(target).then((yes) => {
        if (yes) {
          req.flash("error", "File exists, cannot overwrite.");
          return res.redirect("back");
        }

        const write = fs.createWriteStream(target);
        write.on("close", () => {
          if (fileBuffer.length === 0) {
            req.flash("success", "File saved. Warning: empty file.");
          } else {
            fileBuffer = null;
            req.flash("success", "File saved.");
          }
          res.redirect("back");
        });
        write.on("error", (err) => {
          req.flash("error", err.message);
          res.redirect("back");
        });
        write.write(fileBuffer);
        write.end();
      });
    });

    req.pipe(req.busboy);
  });
};