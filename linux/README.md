# Clipmer

A secrets-aware clipboard manager for Linux, built with Electron. Monitors the system clipboard, stores text entries, and provides a popup UI with masking, folders, search, and keyboard navigation.

## Prerequisites

- Node.js 18+
- npm
- **GNOME users**: Install the [AppIndicator extension](https://extensions.gnome.org/extension/615/appindicator-support/) for tray icon support

## Setup

```bash
npm install
npm start
```

## Build

```bash
npm run build
```

Produces `.AppImage` and `.deb` in the `dist/` directory.

## Usage

- **Global shortcut**: `Ctrl+Shift+D` toggles the popup (fallback `Ctrl+Shift+B`)
- **Tray icon**: Right-click for Show/Hide, Clear History, Quit
- **Search**: Type to filter text entries in real time
- **Keyboard**: Arrow keys navigate, Enter selects, Escape closes
- **Expand**: Click the expand button in the header to see full text content
- **Click** any entry to copy it back to your clipboard

Tracks text clipboard content. History is capped at 200 entries.

## Config

Data is stored in `~/.config/clipmer/`.
