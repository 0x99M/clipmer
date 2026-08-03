const {
  app,
  BrowserWindow,
  Tray,
  Menu,
  clipboard,
  globalShortcut,
  nativeImage,
  ipcMain,
  dialog,
  screen,
  shell,
} = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const Store = require('electron-store');
const license = require('./license');

// AppImages mount on a nosuid filesystem, so chrome-sandbox cannot be SUID
// root and the renderer crashes with SIGTRAP. Detect AppImage runtime via the
// APPIMAGE env var and disable the sandbox there. .deb/.rpm installs keep the
// proper SUID sandbox via the postinst hook.
if (process.env.APPIMAGE) {
  app.commandLine.appendSwitch('no-sandbox');
}

// ─── Persistence ────────────────────────────────────────────────────────────────

const store = new Store({
  name: 'clipmer-data',
  defaults: {
    history: [],
    groups: [],
    theme: 'dark',
    accentColor: '#E95420',
    shortcut: 'Ctrl+Shift+D',
    autoPaste: false,
    autoScrollTop: true,
    autoClearSearch: true,
    closeSettingsOnOpen: true,
    autoFocusFirst: false,
    activeFilter: 'all',
    fontSize: 13,
    minimalView: false,
    rememberPosition: true,
    firstLaunch: true,
  },
});

license.init(store);

// ─── State ──────────────────────────────────────────────────────────────────────

let mainWindow = null;
let tray = null;
let clipboardHistory = [];
let groups = [];
let lastClipboardText = '';
let pollingInterval = null;
// Set by the renderer while a pane that owns focus-stealing UI is open.
let blurHideSuppressed = false;

const MAX_HISTORY = 200;
const FREE_HISTORY_LIMIT = 100;
const POLL_MS = 500;
const PID_FILE = path.join(app.getPath('userData'), 'clipmer.pid');
const DEFAULT_SHORTCUT = 'Ctrl+Shift+D';
const FALLBACK_SHORTCUT = 'Ctrl+Shift+B';

// What actually bound, which is not always what is stored — the fallback may
// have been used, or nothing may have bound at all on Wayland. The settings
// pane reads this so it stops reporting a hotkey that isn't live.
let effectiveShortcut = DEFAULT_SHORTCUT;

// ─── Single instance lock ───────────────────────────────────────────────────────

// A losing instance must touch nothing — no PID file, no tray, no store. It
// used to fall through to app.whenReady(), whose first statement stamps this
// process's PID over the live instance's moments before exiting. That is the
// only writer of the file, so the primary never repaired it, and the GNOME
// hotkey (kill -USR1 $(cat PID_FILE)) signalled a dead PID from then on.
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
  return;
}

// Electron delivers second-instance to us; an explicit relaunch should always
// show the window rather than toggle it, or clicking the launcher icon while
// the window is already up reads as the app being dead.
app.on('second-instance', () => {
  if (mainWindow) showWindow();
});

// ─── Window ─────────────────────────────────────────────────────────────────────

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 380,
    height: 500,
    frame: false,
    resizable: true,
    minWidth: 380,
    minHeight: 500,
    show: false,
    alwaysOnTop: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  // A preload script is a property of the webContents, not of the document, so
  // it is re-injected across navigations. Nothing in the app navigates, but
  // Chromium's default drop behaviour does: dropping a URL or an .html file on
  // the window loads it, and the resulting page inherits the full
  // clipboardManager bridge — get-history returns every entry's plaintext,
  // including hidden ones. loadFile is also only ever called once, so any
  // navigation permanently breaks the UI with no way back.
  const blockNavigation = (e) => e.preventDefault();
  mainWindow.webContents.on('will-navigate', blockNavigation);
  mainWindow.webContents.on('will-frame-navigate', blockNavigation);
  mainWindow.webContents.on('will-redirect', blockNavigation);

  // window.open() defaults to allow, which rendered the checkout page in a
  // chromeless Electron window — no address bar, so no way for the user to
  // confirm the origin before typing card details. Send it to the real browser.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://clipmer.app/')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  mainWindow.webContents.setPermissionRequestHandler((_wc, _permission, callback) => {
    callback(false);
  });

  mainWindow.on('close', (e) => {
    if (!app.isQuitting) {
      e.preventDefault();
      hideWindow();
    }
  });

  // Required by the project rules and never implemented. Without it an
  // alwaysOnTop list of SSH commands and connection strings stays pinned over
  // whatever the user switches to — including a screen share.
  //
  // Suppressed while a settings or folders pane is open: the accent picker is a
  // native OS colour dialog that blurs us, and the list is covered anyway, so
  // the privacy reason for hiding does not apply there.
  mainWindow.on('blur', () => {
    if (!mainWindow || mainWindow.isDestroyed() || !mainWindow.isVisible()) return;
    if (blurHideSuppressed) return;
    hideWindow();
  });
}

// ─── Window positioning ─────────────────────────────────────────────────────────

function showWindow() {
  if (store.get('rememberPosition') !== false) {
    const saved = store.get('lastWindowPosition');
    if (saved) {
      const displays = screen.getAllDisplays();
      const onScreen = displays.some((d) => {
        const b = d.bounds;
        return saved.x >= b.x && saved.x < b.x + b.width &&
               saved.y >= b.y && saved.y < b.y + b.height;
      });
      if (onScreen) {
        mainWindow.setPosition(saved.x, saved.y);
        mainWindow.show();
        mainWindow.focus();
        return;
      }
    }
  }

  const { workAreaSize } = screen.getPrimaryDisplay();
  const { width, height } = mainWindow.getBounds();
  const x = Math.round((workAreaSize.width - width) / 2);
  const y = Math.round((workAreaSize.height - height) / 2);
  mainWindow.setPosition(x, y);
  mainWindow.show();
  mainWindow.focus();
}

function persistPosition() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (store.get('rememberPosition') === false) return;
  const bounds = mainWindow.getBounds();
  store.set('lastWindowPosition', { x: bounds.x, y: bounds.y });
}

// The single place the window is hidden, so position is saved on every route
// out — blur, Escape, auto-paste and the tray — not just the one that used to
// remember it.
function hideWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  persistPosition();
  mainWindow.hide();
}

function toggleWindow() {
  if (mainWindow.isVisible()) {
    hideWindow();
  } else {
    showWindow();
  }
}

// ─── Tray ───────────────────────────────────────────────────────────────────────

function createTray() {
  const iconPath = path.join(__dirname, 'assets', 'icon.png');
  let icon;

  if (fs.existsSync(iconPath)) {
    icon = nativeImage.createFromPath(iconPath);
  } else {
    icon = nativeImage.createEmpty();
  }

  tray = new Tray(icon);
  tray.setToolTip('Clipmer');

  const contextMenu = Menu.buildFromTemplate([
    { label: 'Show/Hide', click: () => toggleWindow() },
    { label: 'Clear History', click: () => clearHistory() },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);
}

// ─── Clipboard polling ──────────────────────────────────────────────────────────

function startClipboardPolling() {
  pollingInterval = setInterval(checkClipboard, POLL_MS);
}

function checkClipboard() {
  const currentText = clipboard.readText();
  if (currentText && currentText !== lastClipboardText) {
    lastClipboardText = currentText;
    addEntry(currentText, currentText.substring(0, 200));
  }
}

function addEntry(content, preview) {
  // If the exact content already exists in history, bubble it to the top and
  // refresh its timestamp. Reuse the same id so any group memberships stay valid.
  const existingIdx = clipboardHistory.findIndex((e) => e.content === content);
  if (existingIdx !== -1) {
    const [existing] = clipboardHistory.splice(existingIdx, 1);
    existing.timestamp = Date.now();
    clipboardHistory.unshift(existing);
    store.set('history', clipboardHistory);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('history-updated', getVisibleHistory());
    }
    return;
  }

  const entry = {
    id: crypto.randomUUID(),
    type: 'text',
    content,
    preview,
    timestamp: Date.now(),
    note: '',
  };

  clipboardHistory.unshift(entry);

  // When capping history, don't drop entries that are referenced by any group.
  if (clipboardHistory.length > MAX_HISTORY) {
    const memberIds = new Set(groups.flatMap((g) => g.memberIds));
    const kept = [];
    for (const e of clipboardHistory) {
      if (kept.length < MAX_HISTORY || memberIds.has(e.id)) kept.push(e);
    }
    clipboardHistory = kept;
  }

  store.set('history', clipboardHistory);

  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('history-updated', getVisibleHistory());
  }
}

function clearHistory() {
  // Keep entries that are referenced by any group (they were intentionally
  // saved). Everything else is wiped.
  const memberIds = new Set(groups.flatMap((g) => g.memberIds));
  clipboardHistory = clipboardHistory.filter((e) => memberIds.has(e.id));
  store.set('history', clipboardHistory);
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('history-updated', getVisibleHistory());
  }
}

function getVisibleHistory() {
  if (license.isPro()) return clipboardHistory;
  return clipboardHistory.slice(0, FREE_HISTORY_LIMIT);
}

// ─── IPC handlers ───────────────────────────────────────────────────────────────

ipcMain.handle('get-app-version', () => app.getVersion());

ipcMain.handle('get-history', () => getVisibleHistory());

// Takes an id, never a caller-supplied object. Trusting the renderer's copy of
// the entry meant a stale one could be written back: addEntry() only reuses a
// record on exact content match, so a resurrected entry got a fresh UUID, an
// empty note and — critically — no `hidden` flag, silently unmasking a secret
// the user had marked. Clearing history and then clicking Copy in a viewer left
// open over the wiped entry did exactly that.
ipcMain.handle('copy-to-clipboard', (_event, entryId) => {
  const entry = clipboardHistory.find((e) => e.id === entryId);
  if (!entry || typeof entry.content !== 'string') return { success: false };
  clipboard.writeText(entry.content);
  lastClipboardText = entry.content;
  addEntry(entry.content, entry.content.substring(0, 200));
  return { success: true };
});

ipcMain.handle('clear-history', () => {
  clearHistory();
});

ipcMain.handle('hide-window', () => {
  hideWindow();
});

ipcMain.handle('set-blur-hide-suppressed', (_event, suppressed) => {
  blurHideSuppressed = !!suppressed;
});

ipcMain.handle('simulate-paste', () => {
  hideWindow();

  if (!store.get('autoPaste')) return;

  setTimeout(() => {
    const { exec } = require('child_process');
    exec(
      'gdbus call --session --dest com.clipmer.PasteHelper ' +
      '--object-path /com/clipmer/PasteHelper ' +
      '--method com.clipmer.PasteHelper.Paste',
      (err) => {
        if (err) console.log('Auto-paste unavailable. Enable the Clipmer Paste Helper extension.');
      }
    );
  }, 150);
});

ipcMain.handle('update-note', (_event, { id, note }) => {
  if (!license.isPro()) return;
  const entry = clipboardHistory.find((e) => e.id === id);
  if (entry) {
    entry.note = note;
    store.set('history', clipboardHistory);
  }
});

// Free feature: mark an entry as hidden so it renders masked (•••••) in the
// list. Hidden entries are also excluded from search. The stored content is
// still plaintext — this is a screen-share / shoulder-surf privacy affordance,
// not encryption.
ipcMain.handle('set-entry-hidden', (_event, { id, hidden }) => {
  const entry = clipboardHistory.find((e) => e.id === id);
  if (!entry) return { success: false };
  entry.hidden = !!hidden;
  store.set('history', clipboardHistory);
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('history-updated', getVisibleHistory());
  }
  return { success: true };
});

// ─── Groups ─────────────────────────────────────────────────────────────────────

function emitGroupsUpdated() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('groups-updated', groups);
  }
}

ipcMain.handle('get-groups', () => groups);

ipcMain.handle('create-group', (_event, name) => {
  if (!license.isPro()) return { success: false, error: 'Pro required' };
  const trimmed = (name || '').trim();
  if (!trimmed) return { success: false, error: 'Name required' };
  if (groups.some((g) => g.name.toLowerCase() === trimmed.toLowerCase())) {
    return { success: false, error: 'A group with this name already exists' };
  }
  const newGroup = {
    id: crypto.randomUUID(),
    name: trimmed,
    memberIds: [],
    createdAt: Date.now(),
  };
  groups.push(newGroup);
  store.set('groups', groups);
  emitGroupsUpdated();
  return { success: true, id: newGroup.id };
});

ipcMain.handle('rename-group', (_event, { id, name }) => {
  if (!license.isPro()) return { success: false };
  const group = groups.find((g) => g.id === id);
  if (!group) return { success: false };
  const trimmed = (name || '').trim();
  if (!trimmed) return { success: false };
  if (groups.some((g) => g.id !== id && g.name.toLowerCase() === trimmed.toLowerCase())) {
    return { success: false, error: 'A group with this name already exists' };
  }
  group.name = trimmed;
  store.set('groups', groups);
  emitGroupsUpdated();
  return { success: true };
});

// Ungated on purpose. Creating folders is the Pro feature; being able to clean
// up folders you already made is not. Gating deletion meant a lapsed customer
// could not remove a folder, and because grouped entries are exempt from both
// Clear History and the history cap, those folders became an unremovable anchor
// keeping old entries alive forever.
ipcMain.handle('delete-group', (_event, id) => {
  const idx = groups.findIndex((g) => g.id === id);
  if (idx === -1) return { success: false };
  groups.splice(idx, 1);
  store.set('groups', groups);

  if (store.get('activeFilter') === id) {
    store.set('activeFilter', 'all');
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('filter-reset');
    }
  }

  emitGroupsUpdated();
  return { success: true };
});

ipcMain.handle('add-to-group', (_event, { groupId, entryId }) => {
  if (!license.isPro()) return { success: false, error: 'Pro required' };
  const group = groups.find((g) => g.id === groupId);
  if (!group) return { success: false };
  if (!clipboardHistory.some((e) => e.id === entryId)) return { success: false };
  if (!group.memberIds.includes(entryId)) {
    group.memberIds.unshift(entryId);
    store.set('groups', groups);
    emitGroupsUpdated();
  }
  return { success: true };
});

// Ungated for the same reason as delete-group — removing an entry you filed
// earlier must not require an active licence.
ipcMain.handle('remove-from-group', (_event, { groupId, entryId }) => {
  const group = groups.find((g) => g.id === groupId);
  if (!group) return { success: false };
  const i = group.memberIds.indexOf(entryId);
  if (i !== -1) {
    group.memberIds.splice(i, 1);
    store.set('groups', groups);
    emitGroupsUpdated();
  }
  return { success: true };
});

// Delete a single entry from history; also prune it from any group references.
// Free for all users — this is a basic utility, not a premium feature.
ipcMain.handle('delete-entry', (_event, entryId) => {
  const idx = clipboardHistory.findIndex((e) => e.id === entryId);
  if (idx === -1) return { success: false };
  clipboardHistory.splice(idx, 1);
  store.set('history', clipboardHistory);

  let groupsChanged = false;
  groups.forEach((g) => {
    const i = g.memberIds.indexOf(entryId);
    if (i !== -1) {
      g.memberIds.splice(i, 1);
      groupsChanged = true;
    }
  });
  if (groupsChanged) {
    store.set('groups', groups);
    emitGroupsUpdated();
  }

  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('history-updated', getVisibleHistory());
  }
  return { success: true };
});

ipcMain.handle('get-stats', () => {
  const historyNotes = clipboardHistory.filter((e) => e.note).length;
  const totalGroups = groups.length;
  const groupedEntries = new Set(groups.flatMap((g) => g.memberIds)).size;

  const historyJson = JSON.stringify(clipboardHistory);
  const groupsJson = JSON.stringify(groups);
  const totalBytes = Buffer.byteLength(historyJson) + Buffer.byteLength(groupsJson);

  return {
    historyTotal: clipboardHistory.length,
    historyNotes,
    totalGroups,
    groupedEntries,
    totalBytes,
  };
});

ipcMain.handle('get-theme', () => store.get('theme') || 'dark');

ipcMain.handle('set-theme', (_event, theme) => {
  store.set('theme', theme);
});

ipcMain.handle('get-accent', () => store.get('accentColor') || '#E95420');

ipcMain.handle('set-accent', (_event, color) => {
  store.set('accentColor', color);
});

ipcMain.handle('get-shortcut', () => store.get('shortcut') || DEFAULT_SHORTCUT);

// Reports what is actually bound right now, so the settings pane can tell the
// user their chosen hotkey did not take.
ipcMain.handle('get-effective-shortcut', () => ({
  requested: store.get('shortcut') || DEFAULT_SHORTCUT,
  effective: effectiveShortcut,
  bound: globalShortcut.isRegistered(effectiveShortcut),
}));

// Validate first, then try to bind, and only persist once something bound.
// Persisting before registration is what used to brick the app: an accelerator
// Electron cannot parse was written to disk, then threw on every subsequent
// launch and took the rest of startup down with it.
ipcMain.handle('set-shortcut', (_event, shortcut) => {
  if (!isValidAccelerator(shortcut)) {
    return { success: false, error: 'Unsupported shortcut' };
  }

  const previous = store.get('shortcut') || DEFAULT_SHORTCUT;
  globalShortcut.unregisterAll();

  let bound = false;
  try {
    bound = globalShortcut.register(shortcut, toggleWindow);
  } catch (err) {
    console.log(`Rejected accelerator ${shortcut}: ${err.message}`);
  }

  if (!bound) {
    // Nothing bound. On Wayland that is expected and the GNOME path still
    // works, so persist the choice; on X11 it means the combination is taken,
    // so roll back rather than leaving the user with no hotkey at all.
    if (process.env.XDG_SESSION_TYPE === 'wayland' || process.env.WAYLAND_DISPLAY) {
      store.set('shortcut', shortcut);
      effectiveShortcut = shortcut;
      registerGnomeShortcut();
      return { success: true, bound: false };
    }
    store.set('shortcut', previous);
    registerGlobalShortcut();
    registerGnomeShortcut();
    return { success: false, error: 'That shortcut is already in use' };
  }

  effectiveShortcut = shortcut;
  store.set('shortcut', shortcut);
  registerGnomeShortcut();
  return { success: true, bound: true };
});

let isExpanded = false;
ipcMain.handle('toggle-expand', () => {
  if (!mainWindow) return isExpanded;
  const { workAreaSize } = screen.getPrimaryDisplay();
  if (isExpanded) {
    mainWindow.setSize(380, 500);
  } else {
    mainWindow.setSize(800, 900);
  }
  // Re-center after resize
  const { width, height } = mainWindow.getBounds();
  const x = Math.round((workAreaSize.width - width) / 2);
  const y = Math.round((workAreaSize.height - height) / 2);
  mainWindow.setPosition(x, y);
  isExpanded = !isExpanded;
  return isExpanded;
});

// ─── Global shortcuts ───────────────────────────────────────────────────────────

const ACCEL_MODIFIERS = new Set([
  'Ctrl', 'Control', 'CmdOrCtrl', 'CommandOrControl',
  'Alt', 'Option', 'AltGr', 'Shift', 'Super', 'Meta',
]);

// Deliberately narrower than Electron's full accelerator grammar: alphanumerics,
// function keys, and named keys only. Punctuation is excluded because it buys
// almost nothing as a hotkey and keeps the value trivially safe to hand to other
// layers (gsettings, the .desktop file) without quoting games.
const ACCEL_KEY =
  /^(?:[A-Z0-9]|F(?:[1-9]|1[0-9]|2[0-4])|Space|Tab|Backspace|Delete|Insert|Return|Enter|Up|Down|Left|Right|Home|End|PageUp|PageDown|Escape|Esc)$/;

function isValidAccelerator(value) {
  if (typeof value !== 'string' || value.length > 40) return false;
  const parts = value.split('+');
  if (parts.length < 2 || parts.length > 5) return false;
  const key = parts[parts.length - 1];
  const modifiers = parts.slice(0, -1);
  if (!modifiers.every((m) => ACCEL_MODIFIERS.has(m))) return false;
  if (new Set(modifiers).size !== modifiers.length) return false;
  return ACCEL_KEY.test(key);
}

// Returns true only if the accelerator actually bound. In Electron 35 register()
// THROWS on a string it cannot parse rather than returning false, so the call has
// to be guarded — an escaping throw here used to abort the rest of startup.
function registerGlobalShortcut() {
  // Electron globalShortcut works on X11 but silently fails on Wayland.
  // On Wayland, the SIGUSR1/GNOME-shortcut approach handles it instead.
  const shortcut = store.get('shortcut') || 'Ctrl+Shift+D';
  const candidates = shortcut === FALLBACK_SHORTCUT
    ? [shortcut]
    : [shortcut, FALLBACK_SHORTCUT];

  for (const accelerator of candidates) {
    if (!isValidAccelerator(accelerator)) continue;
    try {
      if (globalShortcut.register(accelerator, toggleWindow)) {
        effectiveShortcut = accelerator;
        console.log(`Global shortcut registered: ${accelerator}`);
        return true;
      }
    } catch (err) {
      console.log(`Rejected accelerator ${accelerator}: ${err.message}`);
    }
  }

  // Both failed. Expected on Wayland, where the GNOME/SIGUSR1 path takes over.
  effectiveShortcut = shortcut;
  console.log(`Failed to register shortcut: ${shortcut}`);
  return false;
}

function toGnomeBinding(shortcut) {
  return shortcut
    .split('+')
    .map((part, i, arr) => {
      if (i === arr.length - 1) return part.toLowerCase();
      return `<${part}>`;
    })
    .join('');
}

const MEDIA_KEYS_SCHEMA = 'org.gnome.settings-daemon.plugins.media-keys';
const CUSTOM_KEYBINDING_SCHEMA = `${MEDIA_KEYS_SCHEMA}.custom-keybinding`;
const KEYBINDING_NAME = 'clipmer-toggle';
const KEYBINDING_PATH = `/org/gnome/settings-daemon/plugins/media-keys/custom-keybindings/${KEYBINDING_NAME}/`;
const LEGACY_KEYBINDING_PATH =
  '/org/gnome/settings-daemon/plugins/media-keys/custom-keybindings/clipboard-manager-toggle/';

// Every gsettings call goes through execFile with an argv array — no shell, so
// nothing in a value can be interpreted as syntax. The previous code built
// shell strings and interpolated both the user's accelerator and raw dconf
// output into them.
function gsettings(args) {
  const { execFileSync } = require('child_process');
  return execFileSync('gsettings', args, { encoding: 'utf8', timeout: 5000 }).trim();
}

// GVariant 'as' is `@as []` when empty, otherwise `['a', 'b']`. Parsing it
// properly beats regex-editing the serialized form: the old cleanup stripped a
// *leading* comma, so removing the first of several paths produced `[, '…']`,
// which GLib rejects — and the failure was swallowed, so the stale binding
// survived every upgrade forever.
function parseGVariantStringArray(raw) {
  if (!raw || raw === '@as []' || raw === '[]') return [];
  const out = [];
  const re = /'((?:[^'\\]|\\.)*)'/g;
  let m;
  while ((m = re.exec(raw)) !== null) {
    out.push(m[1].replace(/\\(.)/g, '$1'));
  }
  return out;
}

function serializeGVariantStringArray(values) {
  if (values.length === 0) return '@as []';
  const escaped = values.map((v) => `'${v.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`);
  return `[${escaped.join(', ')}]`;
}

function readCustomKeybindingPaths() {
  return parseGVariantStringArray(gsettings(['get', MEDIA_KEYS_SCHEMA, 'custom-keybindings']));
}

function writeCustomKeybindingPaths(paths) {
  gsettings(['set', MEDIA_KEYS_SCHEMA, 'custom-keybindings', serializeGVariantStringArray(paths)]);
}

// Remove the GNOME shortcut left behind by the pre-rename version.
function cleanupLegacyShortcut() {
  try {
    const paths = readCustomKeybindingPaths();
    if (!paths.includes(LEGACY_KEYBINDING_PATH)) return;
    writeCustomKeybindingPaths(paths.filter((p) => p !== LEGACY_KEYBINDING_PATH));
  } catch (err) {
    console.log('Could not clean up legacy GNOME shortcut:', err.message);
  }
}

function shellQuote(value) {
  return `'${String(value).replace(/'/g, `'\\''`)}'`;
}

// Register a GNOME custom keyboard shortcut. It signals the running instance;
// the SIGUSR1 handler toggles the window.
function registerGnomeShortcut() {
  // The PID is read when the key is PRESSED, not when the binding is written.
  // Previously `$(cat …)` sat inside a double-quoted string handed to a shell at
  // registration time, so the running process's PID was baked into dconf — the
  // hotkey worked until the next restart and then silently signalled a dead
  // process. The /proc check makes a stale PID harmless rather than sending
  // SIGUSR1 (default disposition: terminate) to whatever recycled it.
  const script =
    `p=$(cat ${shellQuote(PID_FILE)} 2>/dev/null); ` +
    `[ -n "$p" ] && grep -qs clipmer /proc/$p/cmdline && kill -USR1 "$p"`;
  const command = `bash -c ${shellQuote(script)}`;

  try {
    const paths = readCustomKeybindingPaths();
    if (!paths.includes(KEYBINDING_PATH)) {
      writeCustomKeybindingPaths([...paths, KEYBINDING_PATH]);
    }

    const target = `${CUSTOM_KEYBINDING_SCHEMA}:${KEYBINDING_PATH}`;
    const shortcut = store.get('shortcut') || DEFAULT_SHORTCUT;
    gsettings(['set', target, 'name', 'Clipmer Toggle']);
    gsettings(['set', target, 'command', command]);
    gsettings(['set', target, 'binding', toGnomeBinding(shortcut)]);

    console.log(`GNOME shortcut registered: ${shortcut}`);
  } catch (err) {
    console.log('Could not register GNOME shortcut:', err.message);
  }
}

// Drop our binding so it does not squat the key combination after the app is
// gone. Re-registered on next launch.
function unregisterGnomeShortcut() {
  try {
    const paths = readCustomKeybindingPaths();
    if (!paths.includes(KEYBINDING_PATH)) return;
    writeCustomKeybindingPaths(paths.filter((p) => p !== KEYBINDING_PATH));
  } catch {}
}

// ─── SIGUSR1 handler (Wayland shortcut toggle) ─────────────────────────────────

process.on('SIGUSR1', () => {
  if (mainWindow) toggleWindow();
});

// ─── Autostart ──────────────────────────────────────────────────────────────────

function isAutostartEnabled() {
  const os = require('os');
  const desktopFile = path.join(os.homedir(), '.config', 'autostart', 'clipmer.desktop');
  return fs.existsSync(desktopFile);
}

function setAutostart(enabled) {
  const os = require('os');
  const autostartDir = path.join(os.homedir(), '.config', 'autostart');
  const desktopFile = path.join(autostartDir, 'clipmer.desktop');
  const launcherScript = path.join(autostartDir, 'clipmer-launch.sh');

  if (enabled) {
    if (!fs.existsSync(autostartDir)) {
      fs.mkdirSync(autostartDir, { recursive: true });
    }

    const execTarget = app.isPackaged
      ? `"${process.execPath}"`
      : `"${process.execPath}" "${app.getAppPath()}"`;

    const launcherContent = [
      '#!/bin/bash',
      'export DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/$(id -u)/bus"',
      'export XDG_RUNTIME_DIR="/run/user/$(id -u)"',
      `exec ${execTarget}`,
      '',
    ].join('\n');

    fs.writeFileSync(launcherScript, launcherContent, { mode: 0o755 });

    const desktopEntry = [
      '[Desktop Entry]',
      'Type=Application',
      'Name=Clipmer',
      `Exec=${launcherScript}`,
      `Icon=${path.join(__dirname, 'assets', 'icon.png')}`,
      'Comment=Secrets-aware clipboard manager',
      'Categories=Utility;',
      'Terminal=false',
      'StartupNotify=false',
      'X-GNOME-Autostart-enabled=true',
    ].join('\n') + '\n';

    fs.writeFileSync(desktopFile, desktopEntry);
  } else {
    try { fs.unlinkSync(desktopFile); } catch {}
    try { fs.unlinkSync(launcherScript); } catch {}
  }
}

ipcMain.handle('get-autostart', () => isAutostartEnabled());
ipcMain.handle('set-autostart', (_event, enabled) => setAutostart(enabled));

// ─── Paste extension ────────────────────────────────────────────────────────────

function installPasteExtension() {
  const os = require('os');
  const extId = 'clipmer-paste@clipmer.local';
  const extDir = path.join(
    os.homedir(),
    '.local/share/gnome-shell/extensions',
    extId
  );

  const srcDir = path.join(__dirname, 'gnome-extension');
  if (!fs.existsSync(srcDir)) return;

  const isNew = !fs.existsSync(extDir);
  if (isNew) fs.mkdirSync(extDir, { recursive: true });

  for (const file of ['metadata.json', 'extension.js']) {
    fs.copyFileSync(path.join(srcDir, file), path.join(extDir, file));
  }

  const { execSync } = require('child_process');
  try {
    execSync(`gnome-extensions enable ${extId}`);
  } catch {
    // Extension not yet known to GNOME Shell — needs logout/login
  }

  return isNew;
}

ipcMain.handle('get-auto-paste', () => store.get('autoPaste') || false);
ipcMain.handle('get-auto-scroll-top', () => store.get('autoScrollTop') !== false);
ipcMain.handle('set-auto-scroll-top', (_event, v) => store.set('autoScrollTop', v));
ipcMain.handle('get-auto-clear-search', () => store.get('autoClearSearch') !== false);
ipcMain.handle('set-auto-clear-search', (_event, v) => store.set('autoClearSearch', v));
ipcMain.handle('get-close-settings-on-open', () => store.get('closeSettingsOnOpen') !== false);
ipcMain.handle('set-close-settings-on-open', (_event, v) => store.set('closeSettingsOnOpen', v));
ipcMain.handle('get-auto-focus-first', () => store.get('autoFocusFirst') === true);
ipcMain.handle('set-auto-focus-first', (_event, v) => store.set('autoFocusFirst', v));
ipcMain.handle('get-active-filter', () => store.get('activeFilter') || 'all');
ipcMain.handle('set-active-filter', (_event, v) => store.set('activeFilter', v || 'all'));
ipcMain.handle('get-font-size', () => store.get('fontSize') || 13);
ipcMain.handle('set-font-size', (_event, size) => store.set('fontSize', size));
ipcMain.handle('get-minimal-view', () => store.get('minimalView') || false);
// Turning it ON is Pro; turning it OFF must always work, or a lapsed customer
// is stuck in a view they cannot leave.
ipcMain.handle('set-minimal-view', (_event, v) => {
  if (license.isPro() || !v) store.set('minimalView', !!v);
});
ipcMain.handle('get-remember-position', () => store.get('rememberPosition') !== false);
ipcMain.handle('set-remember-position', (_event, v) => store.set('rememberPosition', v));

ipcMain.handle('set-auto-paste', (_event, enabled) => {
  store.set('autoPaste', enabled);

  if (enabled) {
    const isNew = installPasteExtension();
    if (isNew) {
      return 'needs-restart';
    }
  }

  return 'ok';
});

// ─── License ────────────────────────────────────────────────────────────────────

ipcMain.handle('license:info', () => license.getLicenseInfo());
ipcMain.handle('license:activate', (_event, key) => license.activateLicense(key));
ipcMain.handle('license:deactivate', () => license.deactivateLicense());
ipcMain.handle('license:isPro', () => license.isPro());

// ─── App lifecycle ──────────────────────────────────────────────────────────────

app.whenReady().then(() => {
  // Write PID file for SIGUSR1-based toggle
  fs.writeFileSync(PID_FILE, String(process.pid));

  // Load persisted history and groups. Clean up the legacy 'pinned' key if it's
  // still around — its contents were already merged into history by an earlier
  // migration (or we merge them now if this is the first run).
  try {
    clipboardHistory = store.get('history') || [];
    const rawGroups = store.get('groups');
    groups = Array.isArray(rawGroups) ? rawGroups : [];

    // Image entries were removed — drop any left over from older versions.
    const beforeLen = clipboardHistory.length;
    clipboardHistory = clipboardHistory.filter((e) => e.type !== 'image');
    if (clipboardHistory.length !== beforeLen) {
      const survivingIds = new Set(clipboardHistory.map((e) => e.id));
      groups.forEach((g) => { g.memberIds = g.memberIds.filter((id) => survivingIds.has(id)); });
      store.set('history', clipboardHistory);
      store.set('groups', groups);
    }

    if (store.has('pinned')) {
      const legacyPinned = store.get('pinned');
      if (Array.isArray(legacyPinned) && legacyPinned.length > 0) {
        const historyIds = new Set(clipboardHistory.map((e) => e.id));
        const toMerge = legacyPinned.filter((e) => !historyIds.has(e.id));
        if (toMerge.length > 0) {
          clipboardHistory = [...toMerge, ...clipboardHistory].slice(0, MAX_HISTORY);
          store.set('history', clipboardHistory);
        }
      }
      store.delete('pinned');
    }

    // Drop any stale isProtected flag from earlier migrations — folders are now
    // all user-editable.
    let dirty = false;
    groups.forEach((g) => {
      if ('isProtected' in g) { delete g.isProtected; dirty = true; }
    });
    if (dirty) store.set('groups', groups);
  } catch (err) {
    console.error('Failed to load store data:', err);
    clipboardHistory = [];
    groups = [];
  }

  if (clipboardHistory.length > 0) {
    lastClipboardText = clipboardHistory[0].content;
  }

  createWindow();
  createTray();

  // Clipboard capture is the whole point of the app, so it starts before any of
  // the OS-integration work that might fail. Each of those is independently
  // guarded: a broken shortcut, a missing gsettings, or a GNOME Shell that
  // rejects the extension must degrade to "that feature is off", never to
  // "the app silently stopped recording anything".
  startClipboardPolling();

  for (const [label, step] of [
    ['legacy shortcut cleanup', cleanupLegacyShortcut],
    ['global shortcut', registerGlobalShortcut],
    ['GNOME shortcut', registerGnomeShortcut],
    ['paste extension', () => { if (store.get('autoPaste')) installPasteExtension(); }],
  ]) {
    try {
      step();
    } catch (err) {
      console.error(`Startup step failed (${label}):`, err);
    }
  }
});

// Belt and braces for any webContents the app grows later — the guards in
// createWindow only cover the one window that exists today. This fires
// synchronously from `new BrowserWindow`, so createWindow's own
// setWindowOpenHandler runs afterwards and takes precedence for the main window.
app.on('web-contents-created', (_event, contents) => {
  contents.on('will-navigate', (e) => e.preventDefault());
  contents.setWindowOpenHandler(() => ({ action: 'deny' }));
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  if (pollingInterval) clearInterval(pollingInterval);
  // Release the GNOME key combination rather than leaving a binding pointing at
  // a process that no longer exists. Re-registered on the next launch.
  unregisterGnomeShortcut();
  // Clean up PID file
  try { fs.unlinkSync(PID_FILE); } catch {}
});

app.on('window-all-closed', () => {
  // Do nothing — app stays alive in tray
});
