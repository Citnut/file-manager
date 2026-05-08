"use strict";

const { resolveRelative } = require("../utils/path");
const { flashify } = require("../utils/flash");
const { isSafeCommand } = require("../utils/validate");
const child_process = require("child_process");

module.exports = function (app) {
  // Single command
  app.post("/*@cmd", (req, res) => {
    const base = req.params[0];
    const cmd = req.body.cmd;

    if (!cmd || cmd.length < 1) {
      return res.status(400).send("No command given.");
    }
    if (!isSafeCommand(cmd)) {
      req.flash("error", "Command contains disallowed characters.");
      return res.redirect("back");
    }

    child_process.exec(
      cmd,
      {
        cwd: resolveRelative(base),
        timeout: 60 * 1000,
      },
      (err, stdout, stderr) => {
        if (err) req.flash("error", "Command failed (non-zero exit)");
        res.render(
          "cmd",
          flashify(req, {
            path: base,
            cmd,
            stdout,
            stderr,
          })
        );
      }
    );
  });

  // Shell WebSocket page
  app.get("/*@shell", (req, res) => {
    const base = req.params[0];
    res.render("shell", flashify(req, { path: base }));
  });

  // WebSocket upgrade handler
  const WebSocket = require("ws");
  const pty = require("node-pty");
  const querystring = require("querystring");

  app.locals.wsServer.on("connection", (socket, request) => {
    const { path: cwd } = querystring.parse(request.url.split("?")[1]);
    const baseDir = resolveRelative(cwd || "/");
    const exec = process.env.SHELL == "login" ? "/usr/bin/env" : (process.env.SHELL || "/bin/sh").split(" ")[0];
    const args = process.env.SHELL == "login" ? ["login"] : (process.env.SHELL || "/bin/sh").split(" ").slice(1);

    const term = pty.spawn(exec, args, {
      name: "xterm-256color",
      cols: 80,
      rows: 30,
      cwd: baseDir,
    });

    console.log(`pid ${term.pid} started in ${baseDir}`);

    term.on("data", (data) => socket.send(data, { binary: true }));
    term.on("exit", () => socket.close());

    socket.on("message", (data) => {
      // Resize message: 6 bytes -> opcode(2) + cols(2) + rows(2)
      if (data.length === 6) {
        const opcode = data.readUInt16BE(0);
        if (opcode === 0) {
          term.resize(data.readUInt16BE(2), data.readUInt16BE(4));
          return;
        }
      }
      term.write(data);
    });

    socket.on("close", () => term.end());
  });
};