"use strict";

const { verifyToken } = require("../middleware/auth");
const { flashify } = require("../utils/flash");

module.exports = function (app) {
  const isKeyEnabled = () => app.locals.keyEnabled;

  app.get("/@logout", (req, res) => {
    if (isKeyEnabled()) {
      req.session.login = false;
      req.flash("success", "Signed out.");
      res.redirect("/@login");
      return;
    }
    req.flash("error", "You were never logged in...");
    res.redirect("back");
  });

  app.get("/@login", (req, res) => {
    res.render("login", flashify(req, {}));
  });

  app.post("/@login", (req, res) => {
    const pass = verifyToken(req.body.token);
    if (pass) {
      req.session.login = true;
      res.redirect("/");
      return;
    }
    req.flash("error", "Bad token.");
    res.redirect("/@login");
  });
};