# Clipmer

A tray-based clipboard history manager for Linux. Monitors your clipboard, stores text entries, and provides a fast popup UI with search, pinned items, notes, and auto-paste.

**Ubuntu · GNOME · Wayland**

## Features

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
project-y/
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

Source-available. The code in this repository is provided for transparency
and personal use; redistribution, derivative works, and commercial forks are
not permitted. See [LICENSE](LICENSE) for the full terms. This is not an
OSI-approved open source license.
