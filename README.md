# Clipmer

A secrets-aware clipboard manager for Linux. Your clipboard fills up with SSH
commands, API keys, and connection strings — Clipmer lets you mask them before a
screen share, annotate them with notes, and file them into folders, all from a
tray-based popup that never leaves your machine.

**Ubuntu · GNOME · Wayland**

## Features

- Masked entries — stay copyable, but unreadable on screen
- Folders for grouping SSH commands, credentials, and snippets
- Clipboard history up to 200 entries, deduplicated
- Pinned items that survive restarts
- Instant search across content and notes
- Inline notes attached to any entry
- Auto-paste on Wayland via GNOME Shell extension
- Keyboard-first navigation (arrows, Enter, Esc, Tab)
- Dark & light themes with custom accent color
- Adjustable font size (10–18px)
- Minimal view — distraction-free floating UI
- Global shortcut `Ctrl+Shift+D` (configurable)

## Install

Download the latest release for Linux:

- [.deb package](https://github.com/0x99M/clipmer/releases/latest) — Ubuntu/Debian
- [AppImage](https://github.com/0x99M/clipmer/releases/latest) — any distro

See [clipmer.app](https://clipmer.app) for more.

## Repo Structure

```
clipmer/
├── linux/      Electron desktop app
├── web/        Next.js landing page (clipmer.app)
└── scripts/    Release tooling
```

### linux/
The Electron app. Vanilla JS/HTML/CSS (no frontend frameworks), `electron-store` for persistence, CJS throughout. See [linux/README.md](linux/README.md) for build instructions.

### web/
The marketing site built with Next.js, Tailwind CSS, shadcn/ui, and Framer Motion. Deployed on Railway.

```bash
cd web
npm install
npm run dev
```

### scripts/
- `release.sh` — reads version from `linux/package.json`, uploads `.deb` and `.AppImage` to GitHub Releases, and syncs version strings across the web app.

## Release

After building the desktop app with `npm run build` in `linux/`, run:

```bash
./scripts/release.sh
```

This uploads the binaries to GitHub Releases and updates all version references in `web/`.

## License

Source-available, not open source. The code in this repository is licensed
under the [PolyForm Strict License 1.0.0](https://polyformproject.org/licenses/strict/1.0.0)
— you may read, audit, and run it for noncommercial and personal purposes, but
redistribution and derivative works are not permitted. See [LICENSE](LICENSE)
for the full terms, including how pre-built binaries are licensed separately.

This is not an OSI-approved open source license. For commercial use or
redistribution rights, contact support@clipmer.app.
