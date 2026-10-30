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
| `export-backup` | `password` | `{ success, path, entries, folders }` | Write an encrypted backup (Pro) |
| `import-backup-pick` | — | `{ success, path, meta }` | Pick and validate a backup, no password yet (Pro) |
| `import-backup-apply` | `{ path, password, mode }` | `{ success, ...stats }` | Decrypt and merge or replace (Pro) |

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

## Encrypted Backup

Export and import live in `backup.js`, which imports nothing from electron: it is
a pure transform over plain objects, so the crypto and the merge rules can be
exercised with plain `node`. `main.js` owns the file dialogs, the store writes
and the window broadcasts.

The file is JSON, so it stays inspectable and versionable:

```js
{
  format: 'clipmer-backup',
  version: 1,
  header: {
    app, exportedAt, entries, folders,  // describes a file before its password is asked for
    cipher: 'aes-256-gcm',
    kdf: { name: 'scrypt', N: 131072, r: 8, p: 1, salt },
    iv,
  },
  tag,         // GCM auth tag
  ciphertext,  // AES-256-GCM over JSON { history, groups }
}
```

- **KDF** — scrypt, N=2^17 r=8 p=1, 16-byte random salt, 32-byte key, through the
  async `crypto.scrypt`. `scryptSync` would hold the main process for the whole
  derivation, freezing the tray and the hotkey along with it.
- **AAD** — the entire header, serialized with recursively sorted keys. Editing
  the KDF parameters, the salt or the advertised counts fails the tag check;
  reformatting the JSON does not.
- **Deliberately excluded** — `licenseKey` and `licenseEmail`. A backup is a
  thing people mail to themselves, and a signed Pro key inside one is a key
  handed out.
- **On import** everything is re-clamped against the live ceilings and every
  `preview` is recomputed from its `content`: a file carrying a mismatched pair
  is a way to show one thing and paste another. Merge dedupes on content (the
  same identity `addEntry` uses), rewrites colliding ids and translates folder
  membership through that map. `hidden` survives a merge in whichever direction
  it was set, and filed entries keep their exemption from the cap.
- Backups are written mode `0600`, including on overwrite.

## Global Shortcut (Wayland Workaround)

Electron's `globalShortcut` API silently fails on Wayland — it reports registration as successful but the callback never fires. The signal path is the workaround, and each desktop needs its own way to trigger it:

1. **`globalShortcut.register()`** — works on X11 sessions
2. **GNOME custom shortcut** — registered via `gsettings` on startup, runs `kill -USR1 <pid>`
3. **KDE Plasma shortcut** — a `NoDisplay` `.desktop` file in `~/.local/share/applications/` plus a `_launch` entry in `kglobalshortcutsrc`, written with `kwriteconfig6`/`kwriteconfig5`
4. **`SIGUSR1` handler** — `process.on('SIGUSR1', toggleWindow)` receives the signal and toggles

`desktopEnv()` reads `XDG_CURRENT_DESKTOP` by substring, because it holds a colon-separated list (`ubuntu:GNOME`, `KDE:plasma`). Both desktop registrations build their command from the single `toggleCommand()`.

Two deliberate asymmetries between the GNOME and KDE paths:

- **GNOME unregisters on quit, KDE does not.** `kglobalaccel` only reloads its config on a daemon restart or a fresh login, so writing on launch and deleting on quit would leave the binding in whichever state the last logout caught. Leaving it is safe — the command no-ops against a stale PID file, which is what the `/proc` check is for. The cost is that a Plasma shortcut takes effect only after the next login, which the settings pane now says.
- **`kglobalshortcutsrc` is never hand-written.** It holds every global shortcut on the system. `kwriteconfig` edits in place and only the group it is given, the same reason the GNOME path reads the existing path list rather than overwriting it.

A PID file is written to `~/.config/clipmer/clipmer.pid` on startup and cleaned up on quit.

## Window Management

- **Frameless** (`frame: false`) for a clean popup look
- **Always on top** to float above other windows
- **No blur-to-hide** — the window hides only via: shortcut toggle, Escape key, clicking an entry, or tray menu. This avoids a Linux WM bug where frameless windows receive immediate blur events before the user can interact.
- **Show/hide, never close** — the `close` event is intercepted; only Quit from the tray menu actually closes
- **Resizable, and the size is remembered** — `lastWindowSize` is written by `persistBounds()` on every route out, alongside `lastWindowPosition`, and restored in `createWindow()` clamped to the 380x500 minimum and to the work area. A size recorded on a larger monitor cannot open a window taller than the screen it lands on.
- **Expand/collapse** — expands to 800x900; collapsing returns to the remembered size rather than a stock 380x500, so a deliberate resize survives the round trip. `persistBounds()` skips the size write while expanded, since the zoom is not a chosen size.
- Both the size and the position are gated on the one `rememberPosition` setting, labelled "Remember window size and position".
- **Centered positioning** — always centers on `screen.getPrimaryDisplay().workAreaSize`. Does NOT use `tray.getBounds()` (returns zeros on GNOME)

## Tray

- **Context menu only** — no `tray.on('click')` handler (unreliable on Linux DEs)
- "Show/Hide" as first menu item for primary action
- Icon must be a **file path** on disk for AppIndicator compatibility

## Persistence

- `electron-store@8.2.0` (last CJS-compatible version)
- Store file: `~/.config/clipmer/clipmer-data.json`
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
