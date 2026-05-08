# file-manager

A node.js web-based file manager with session auth, bulk operations, and terminal access.

Original by [serverwentdown](https://github.com/serverwentdown/file-manager). Forked and maintained by [Citnut](https://github.com/Citnut).

## Features

### File Operations

- [x] Directory browsing with file listing
  - [x] Filesize display
  - [x] Permissions (POSIX mode string, e.g. `drwxr-xr-x`)
  - [x] Owner / group display
- [x] Create folders
- [x] Upload files (single + bulk)
- [x] Rename files / folders
- [x] Delete files / folders (recursive for directories)
- [x] Move files / folders to target directory
- [x] Copy files / folders to target directory
- [x] Change permissions (chmod, octal mode)
- [x] Download selected files as ZIP archive
- [x] Image preview for small images (< 750 KB)

### Bulk Operations

- [x] Multi-select via checkboxes
- [x] Keyboard shortcuts: `Del` (delete), `Ctrl+A` (select all), `Esc` (deselect)
- [x] Bulk delete, move, copy, chmod, download

### Security (Phase 2)

- [x] TOTP authentication (`KEY` env variable)
- [x] Rate limiting (global 120 req/min, auth 10/min, upload 60/min)
- [x] CSRF guard on all mutating requests
- [x] Filename sanitization (blocks null bytes, path traversal, hidden files)
- [x] Command injection blocklist on CMD endpoint

### Performance

- [x] Directory pagination (100 items/page)
- [x] Bulk upload via multi-file picker + fetch API

### Terminal Access

- [x] Single command execution (`CMD` env)
- [x] Full shell access via xterm.js (`SHELL` env)

## Screenshots

These screenshots are not up-to-date.

![](https://ambrose.makerforce.io/file-manager/login1.png)

![](https://ambrose.makerforce.io/file-manager/upl2.png)

![](https://ambrose.makerforce.io/file-manager/ls1.png)

![](https://ambrose.makerforce.io/file-manager/rm1.png)

![](https://ambrose.makerforce.io/file-manager/dl1.png)

## Quick Start

### Docker

```zsh
docker run --rm -it -v $PWD:/data -p 8080:8080 serverwentdown/file-manager
```

### Node.js

```zsh
npm install
npm start
```

Then open `http://localhost` (port `80` by default).

Or globally:

```zsh
npm install -g https://github.com/Citnut/file-manager.git
file-manager
```

## Project Structure

```
file-manager/
├── src/
│   ├── app.js              # Express app bootstrap + middleware
│   ├── routes/
│   │   ├── auth.js         # Login / logout (TOTP)
│   │   ├── files.js        # Browse / mkdir / delete / rename / move / copy / chmod
│   │   ├── upload.js       # File upload (busboy)
│   │   └── shell.js        # CMD single-command + xterm.js WebSocket shell
│   ├── services/
│   │   ├── files.js        # fs operations, stat enrichment (mode, owner)
│   │   └── archive.js      # ZIP archiver
│   ├── middleware/
│   │   ├── auth.js         # TOTP session auth
│   │   ├── csrf.js         # Origin check guard
│   │   ├── error.js        # Error boundary
│   │   └── ratelimit.js    # express-rate-limit wrappers
│   └── utils/
│       ├── path.js         # Path resolution + traversal guard
│       ├── flash.js        # connect-flash wrapper
│       └── validate.js      # Sanitize, safe JSON, command validation
├── views/
│   ├── list.handlebars     # Main file browser
│   ├── login.handlebars    # Login page
│   ├── shell.handlebars    # xterm.js shell
│   ├── cmd.handlebars      # CMD output
│   └── partials/
│       ├── navbar.handlebars
│       ├── toolbar.handlebars
│       └── dialogue-*.handlebars
├── assets/
│   ├── multi.js            # Multi-select + keyboard shortcuts
│   ├── rename.js           # Rename modal + bulk upload
│   └── *.css
└── index.js                # Legacy entry point
```

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `80` | Listen port |
| `SESSION_KEY` | `meowmeow` | Express session secret (change in production) |
| `KEY` | _(none)_ | Base32 TOTP shared secret. Enables auth when set. Generate one [here](http://www.xanxys.net/totp/) |
| `CMD` | _(none)_ | Set to non-`false` to enable single-command execution |
| `SHELL` | _(none)_ | `login` for login shell, or binary path (e.g. `/bin/bash`) |

## Development

```zsh
npm run dev     # nodemon auto-restart on file changes
npm run format  # prettier formatting
```

## License

[MIT](./LICENSE)