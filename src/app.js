#!/usr/bin/env node
"use strict";

const express = require("express");
const { engine: hbs } = require("express-handlebars");
const session = require("express-session");
const busboy = require("connect-busboy");
const flash = require("connect-flash");
const WebSocket = require("ws");

const assets = require("../assets");
const handlebars = require("handlebars");
const filesize = require("filesize");
const octicons = require("@primer/octicons");
const path = require("path");

// Services & middleware
const { init: initAuth } = require("./middleware/auth");
const { csrfGuard } = require("./middleware/csrf");
const { errorHandler } = require("./middleware/error");
const { globalLimiter, authLimiter } = require("./middleware/ratelimit");

// Routes
const authRoutes = require("./routes/auth");
const filesRoutes = require("./routes/files");
const uploadRoutes = require("./routes/upload");
const shellRoutes = require("./routes/shell");

// App bootstrap
const app = express();
const http = app.listen(+process.env.PORT || 80);

// Flag: require TOTP auth
const KEY = process.env.KEY || null;
app.locals.keyEnabled = !!KEY;
initAuth(KEY);

// Flag: shell/cmd features
app.locals.shellEnabled = process.env.SHELL != null && process.env.SHELL !== "false";
app.locals.cmdEnabled = process.env.CMD != null && process.env.CMD !== "false";

// WebSocket server (attached to same HTTP server)
// shell route will register its connection handler on this
const wsServer = new WebSocket.Server({ server: http });
app.locals.wsServer = wsServer;

// View engine
app.set("views", path.join(__dirname, "..", "views"));
app.engine(
  "handlebars",
  hbs({
    partialsDir: path.join(__dirname, "..", "views", "partials"),
    layoutsDir: path.join(__dirname, "..", "views", "layouts"),
    defaultLayout: "main",
    helpers: {
      either: function (a, b, options) {
        if (a || b) return options.fn(this);
      },
      filesize,
      octicon: function (i) {
        if (!octicons[i]) return new handlebars.SafeString(octicons.question.toSVG());
        return new handlebars.SafeString(octicons[i].toSVG());
      },
      eachpath: function (path, options) {
        if (typeof path !== "string") return "";
        let out = "";
        path = path.split("/");
        path.splice(path.length - 1, 1);
        path.unshift("");
        path.forEach((folder, index) => {
          out += options.fn({
            name: folder + "/",
            path: "/" + path.slice(1, index + 1).join("/"),
            current: index === path.length - 1,
          });
        });
        return out;
      },
      // Math helpers for pagination
      add: (a, b) => a + b,
      sub: (a, b) => a - b,
      gt: (a, b) => a > b,
      lt: (a, b) => a < b,
      eq: (a, b) => a === b,
      range: function (start, end) {
        const pages = [];
        for (let i = start; i <= end; i++) pages.push(i);
        return pages;
      },
    },
  })
);
app.set("view engine", "handlebars");

// Static assets
app.use("/@assets", express.static(path.join(__dirname, "..", "assets")));
assets.forEach((asset) => {
  app.use(
    `/@assets/${asset.path}`,
    express.static(path.join(__dirname, "..", `node_modules/${asset.modulePath}`))
  );
});

// Session & flash
app.use(
  session({
    secret: process.env.SESSION_KEY || "meowmeow",
    resave: false,
    saveUninitialized: false,
  })
);
app.use(flash());
app.use(busboy());

// Body parser for non-multipart
app.use(express.urlencoded({ extended: false }));

// Rate limiting
app.use(globalLimiter);

// CSRF guard
app.use(csrfGuard);

// Auth routes (login/logout — no auth required)
authRoutes(app);

// Stricter rate limit on login POST
app.post("/@login", authLimiter);

// Auth gate — protect everything below
if (KEY) {
  app.use((req, res, next) => {
    if (req.session.login === true) return next();
    req.flash("error", "Please sign in.");
    res.redirect("/@login");
  });
}

// Feature routes
uploadRoutes(app);
filesRoutes(app);
if (app.locals.shellEnabled || app.locals.cmdEnabled) {
  shellRoutes(app);
}

// Error boundary
app.use(errorHandler);

console.log(`Listening on port ${http.address().port}`);