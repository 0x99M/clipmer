# Architecture

## Project Structure

```
linux/
├── main.js              # Electron main process (all backend logic)
├── preload.js           # contextBridge IPC bridge
├── package.json         # CJS, electron-store@8.2.0
├── assets/
│   └── icon.png         # Tray icon (32x32 purple placeholder)
├── renderer/
│   ├── index.html       # UI structure
│   ├── style.css        # Yaru Dark design system
│   └── app.js           # UI logic (rendering, search, keyboard nav)
├── .claude/
│   ├── CLAUDE.md        # Project rules for AI assistants
│   ├── skills/          # On-demand context for AI
│   └── agents/          # Specialized review agents
├── PLAN.md              # Implementation plan
└── ARCHITECTURE.md      # This file
```

## Process Model

```
┌──────────────────────────────────┐
│         Main Process             │
│         (main.js)                │
│                                  │
│  Clipboard polling (500ms)       │
│  Tray icon + context menu        │
│  Global shortcuts                │
│  GNOME shortcut (gsettings)      │
│  SIGUSR1 signal handler          │
│  Persistence (electron-store)    │
│  Window management               │
│  Autostart (.desktop file)       │
└──────────┬───────────────────────┘
           │ IPC (contextBridge)
┌──────────┴───────────────────────┐
│       Preload (preload.js)       │
│  Exposes window.clipboardManager │
└──────────┬───────────────────────┘
           │
┌──────────┴───────────────────────┐
│     Renderer Process             │
│     (renderer/app.js)            │
│                                  │
│  DOM rendering (createElement)   │
│  Search filtering                │
│  Keyboard navigation             │
│  Entry selection → IPC           │
└──────────────────────────────────┘
```

## IPC Contract

All IPC goes through `contextBridge` in `preload.js`. The renderer never accesses `ipcRenderer` directly.

### Renderer → Main (invoke/handle)

| Channel | Payload | Response | Purpose |
|---|---|---|---|
| `get-history` | — | `Entry[]` | Load history on startup |
| `copy-to-clipboard` | `Entry` | — | Copy entry back to system clipboard |
| `clear-history` | — | — | Delete all entries |
| `hide-window` | — | — | Hide the popup window |
| `toggle-expand` | — | `boolean` | Toggle compact/expanded mode, returns new state |

### Main → Renderer (send/on)

| Channel | Payload | Purpose |
|---|---|---|
| `history-updated` | `Entry[]` | Push full history after clipboard change |

### Entry Data Model

```js
{
  id: String,           // crypto.randomUUID()
  type: 'text',         // text-only; kept for backward compat with old stores
  content: String,      // plain text
  preview: String,      // first 200 chars
  timestamp: Number     // Date.now()
}
```

## Clipboard Monitoring

- Polls every 500ms via `setInterval`
- If `clipboard.readText()` changed from last known, adds a text entry
- Deduplicates against the whole history (existing match bubbles to top)
- History capped at 200 entries (oldest dropped, except group members)
- Persisted to `electron-store` on every change
- Text-only — image clipboard content is ignored; legacy image entries are
  pruned from the store on startup

## Global Shortcut (Wayland Workaround)

Electron's `globalShortcut` API silently fails on Wayland — it reports registration as successful but the callback never fires. This app uses a three-layer approach:

1. **`globalShortcut.register()`** — works on X11 sessions
2. **GNOME custom shortcut** — registered via `gsettings` on startup, runs `kill -USR1 <pid>` to signal the app
3. **`SIGUSR1` handler** — `process.on('SIGUSR1', toggleWindow)` receives the signal and toggles

A PID file is written to `~/.config/electron-clipboard-manager/clipboard-manager.pid` on startup and cleaned up on quit.

## Window Management

- **Frameless** (`frame: false`) for a clean popup look
- **Always on top** to float above other windows
- **No blur-to-hide** — the window hides only via: shortcut toggle, Escape key, clicking an entry, or tray menu. This avoids a Linux WM bug where frameless windows receive immediate blur events before the user can interact.
- **Show/hide, never close** — the `close` event is intercepted; only Quit from the tray menu actually closes
- **Expand/collapse** — toggles between 380x500 and 800x900, re-centers on screen
- **Centered positioning** — always centers on `screen.getPrimaryDisplay().workAreaSize`. Does NOT use `tray.getBounds()` (returns zeros on GNOME)

## Tray

- **Context menu only** — no `tray.on('click')` handler (unreliable on Linux DEs)
- "Show/Hide" as first menu item for primary action
- Icon must be a **file path** on disk for AppIndicator compatibility

## Persistence

- `electron-store@8.2.0` (last CJS-compatible version)
- Store file: `~/.config/electron-clipboard-manager/clipboard-history.json`
- Automatic `.bak` corruption recovery via `conf` underneath
- Loads on startup with try/catch fallback to `[]`

## Autostart

On first launch, prompts user via `dialog.showMessageBox()`. If accepted, writes a `.desktop` file to `~/.config/autostart/clipboard-manager.desktop`.

## Design System

The UI follows the **Ubuntu Yaru Dark** design system:

| Token | Value | Usage |
|---|---|---|
| Accent | `#E95420` | Focus rings, selected states, Clear button |
| Surface base | `#2d2d2d` | Window body |
| Surface headerbar | `#1f1f1f` | Title bar |
| Surface input | `#404040` | Search field |
| Text primary | `#EEEEEC` | Main content |
| Text secondary | `#A9A9A9` | Labels, entry count |
| Text muted | `#6C6C6C` | Timestamps, hints |
| Border | `rgba(255,255,255,0.10)` | Window edge, dividers |

Font: Ubuntu / Cantarell. Weights: 400 (body) and 500 (labels).

## Security

- `contextIsolation: true` — renderer cannot access Node.js
- `nodeIntegration: false` — no `require()` in renderer
- All IPC goes through `contextBridge` — no raw `ipcRenderer` exposed
- DOM built with `createElement` + `textContent` — no `innerHTML` or XSS surface

## Known Limitations

- `globalShortcut` doesn't fire on Wayland (worked around via SIGUSR1)
- `tray.getBounds()` returns zeros on GNOME (worked around by centering)
- `skipTaskbar` is unsupported on Linux (not used)
- `--no-sandbox` required in dev due to chrome-sandbox permissions (fix with `sudo chown root:root && chmod 4755` for production)
- IBus grabs `Ctrl+Space` variants — avoid those as shortcuts
