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
const backup = require('./backup');

// AppImages mount on a nosuid filesystem, so chrome-sandbox cannot be SUID
// root and the renderer crashes with SIGTRAP. Disable the sandbox only there;
// .deb/.rpm installs keep the proper SUID sandbox via the postinst hook.
//
// $APPIMAGE alone is not enough to decide: AppRun exports it to child
// processes, so a .deb-installed Clipmer launched from a terminal that was
// itself started inside an AppImage would run fully unsandboxed. Corroborate
// with the two things that are actually true of an AppImage runtime — the
// binary lives under the mount point, and the bundled chrome-sandbox is not
// usable.
function shouldDisableSandbox() {
  if (!process.env.APPIMAGE) return false;
  if (process.execPath.startsWith('/tmp/.mount_')) return true;

  // Not running from the mount, so only disable if the helper really is
  // unusable (missing, or not setuid-root).
  try {
    const sandbox = path.join(path.dirname(process.execPath), 'chrome-sandbox');
    const st = fs.statSync(sandbox);
    const setuidRoot = st.uid === 0 && (st.mode & 0o4000) !== 0;
    return !setuidRoot;
  } catch {
    return true;
  }
}

if (shouldDisableSandbox()) {
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
// Roughly 256 KB of text. Well past any real snippet, and small enough that a
// full history stays cheap to serialize.
const MAX_ENTRY_CHARS = 262144;
const MAX_PREVIEW_CHARS = 200;
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
  // The window has always been resizable and has always remembered where it
  // was, but never how big it was, so every launch reset it to 380x500.
  const startSize = savedWindowSize();

  mainWindow = new BrowserWindow({
    width: startSize.width,
    height: startSize.height,
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

  // Lives on the session, not on webContents. The app needs no permissions at
  // all, so deny everything rather than relying on the default prompt.
  mainWindow.webContents.session.setPermissionRequestHandler(
    (_wc, _permission, callback) => callback(false)
  );

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

// The work area of whichever display the pointer is on, which is where the user
// is looking. getPrimaryDisplay().workAreaSize was wrong twice over: it ignores
// the display's origin, and setPosition takes global coordinates — so with a
// second monitor to the left the window opened on the wrong screen.
function activeWorkArea() {
  try {
    return screen.getDisplayNearestPoint(screen.getCursorScreenPoint()).workArea;
  } catch {
    return screen.getPrimaryDisplay().workArea;
  }
}

// Keep the window fully inside the work area it is being placed on.
function clampToWorkArea(x, y, width, height, area) {
  const maxX = area.x + Math.max(0, area.width - width);
  const maxY = area.y + Math.max(0, area.height - height);
  return {
    x: Math.round(Math.min(Math.max(x, area.x), maxX)),
    y: Math.round(Math.min(Math.max(y, area.y), maxY)),
  };
}

function centerOnActiveDisplay() {
  const area = activeWorkArea();
  const { width, height } = mainWindow.getBounds();
  const { x, y } = clampToWorkArea(
    area.x + (area.width - width) / 2,
    area.y + (area.height - height) / 2,
    width, height, area
  );
  mainWindow.setPosition(x, y);
}

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

  centerOnActiveDisplay();
  mainWindow.show();
  mainWindow.focus();
}

function persistBounds() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (store.get('rememberPosition') === false) return;
  const bounds = mainWindow.getBounds();
  store.set('lastWindowPosition', { x: bounds.x, y: bounds.y });
  // Expanded is a temporary zoom, not a size anyone chose. Recording it would
  // make the next launch open at 800x900 and strand the user's own size for
  // good, since nothing else ever writes this key.
  if (!isExpanded) {
    store.set('lastWindowSize', { width: bounds.width, height: bounds.height });
  }
}

// Clamped on the way out rather than on the way in, so a size written while a
// large monitor was attached cannot open a window taller than the screen it is
// actually being shown on. COLLAPSED_SIZE doubles as the floor because it is
// what minWidth/minHeight are set to.
function savedWindowSize() {
  // With remembering switched off, persistBounds stops updating the stored
  // size, so whatever is on disk is stale by definition — fall back to stock
  // rather than restoring a size from whenever the setting was last on.
  if (store.get('rememberPosition') === false) return { ...COLLAPSED_SIZE };

  const saved = store.get('lastWindowSize');
  if (!saved || typeof saved.width !== 'number' || typeof saved.height !== 'number') {
    return { ...COLLAPSED_SIZE };
  }
  const area = activeWorkArea();
  return {
    width: Math.round(Math.min(Math.max(saved.width, COLLAPSED_SIZE.width), area.width)),
    height: Math.round(Math.min(Math.max(saved.height, COLLAPSED_SIZE.height), area.height)),
  };
}

// The single place the window is hidden, so position is saved on every route
// out — blur, Escape, auto-paste and the tray — not just the one that used to
// remember it.
function hideWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  persistBounds();
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
    // Says "unsaved" because clearHistory() keeps folder members. Wiping from
    // the tray has no confirmation step, so the label has to carry the caveat.
    { label: 'Clear Unsaved History', click: () => clearHistory() },
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

// electron-store 8 re-reads, re-parses and rewrites the entire file on every
// set(). With 200 entries of unbounded content that is a synchronous stall on
// the main process for every single copy, which also freezes the tray and the
// hotkey. Coalesce the writes; state in memory is always current, and a flush
// on quit means at most one poll interval can be lost to a hard kill.
let historyWriteTimer = null;
const HISTORY_WRITE_DEBOUNCE_MS = 400;

function persistHistory({ immediate = false } = {}) {
  if (historyWriteTimer) {
    clearTimeout(historyWriteTimer);
    historyWriteTimer = null;
  }
  if (immediate) {
    store.set('history', clipboardHistory);
    return;
  }
  historyWriteTimer = setTimeout(() => {
    historyWriteTimer = null;
    store.set('history', clipboardHistory);
  }, HISTORY_WRITE_DEBOUNCE_MS);
}

function flushHistory() {
  if (!historyWriteTimer) return;
  clearTimeout(historyWriteTimer);
  historyWriteTimer = null;
  store.set('history', clipboardHistory);
}

function checkClipboard() {
  const currentText = clipboard.readText();
  if (currentText && currentText !== lastClipboardText) {
    lastClipboardText = currentText;
    addEntry(currentText, currentText.substring(0, MAX_PREVIEW_CHARS));
  }
}

function addEntry(content, preview) {
  // A stray multi-megabyte copy would otherwise be stored whole and, if filed
  // into a folder, be exempt from eviction — making every subsequent copy pay
  // to re-serialize it forever.
  let stored = content;
  let truncated = false;
  if (stored.length > MAX_ENTRY_CHARS) {
    stored = stored.slice(0, MAX_ENTRY_CHARS);
    truncated = true;
  }

  // If the exact content already exists in history, bubble it to the top and
  // refresh its timestamp. Reuse the same id so any group memberships stay valid.
  const existingIdx = clipboardHistory.findIndex((e) => e.content === stored);
  if (existingIdx !== -1) {
    const [existing] = clipboardHistory.splice(existingIdx, 1);
    existing.timestamp = Date.now();
    clipboardHistory.unshift(existing);
    persistHistory();
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('history-updated', getVisibleHistory());
    }
    return;
  }

  const entry = {
    id: crypto.randomUUID(),
    type: 'text',
    content: stored,
    preview: preview.slice(0, MAX_PREVIEW_CHARS),
    truncated,
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

  persistHistory();

  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('history-updated', getVisibleHistory());
  }
}

function clearHistory() {
  // Keep entries that are referenced by any group (they were intentionally
  // saved). Everything else is wiped.
  const memberIds = new Set(groups.flatMap((g) => g.memberIds));
  clipboardHistory = clipboardHistory.filter((e) => memberIds.has(e.id));
  // lastClipboardText is deliberately NOT reset here. Clearing history does not
  // clear the system clipboard, so blanking it makes the very next poll tick
  // re-add whatever is still on the clipboard — as a brand new record with no
  // `hidden` flag. Wiping a masked secret before a screen share would put it
  // back on screen in plaintext within 500ms.
  //
  // The cost is that re-copying the identical text does not re-add it until one
  // other copy has intervened. Polling cannot distinguish a deliberate re-copy
  // from text merely still resident on the clipboard, so that is accepted.
  persistHistory();
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
  const idx = clipboardHistory.findIndex((e) => e.id === entryId);
  if (idx === -1) return { success: false };
  const entry = clipboardHistory[idx];
  if (typeof entry.content !== 'string') return { success: false };

  clipboard.writeText(entry.content);
  lastClipboardText = entry.content;

  // Bubble the existing record rather than routing back through addEntry().
  // addEntry matches on content AFTER truncating it, so an entry written by an
  // older build at more than MAX_ENTRY_CHARS would fail to match itself and fork
  // into a duplicate — new id, no note, and no `hidden` flag.
  clipboardHistory.splice(idx, 1);
  entry.timestamp = Date.now();
  clipboardHistory.unshift(entry);
  persistHistory();
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('history-updated', getVisibleHistory());
  }
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
    const { execFile } = require('child_process');
    execFile(
      'gdbus',
      [
        'call', '--session',
        '--dest', 'com.clipmer.PasteHelper',
        '--object-path', '/com/clipmer/PasteHelper',
        '--method', 'com.clipmer.PasteHelper.Paste',
      ],
      (err, _stdout, stderr) => {
        if (!err) return;
        // Distinguish the two failures. They need completely different actions,
        // and telling someone to enable an extension that is already enabled and
        // working sends them in the wrong direction entirely.
        const message = `${stderr || ''}${err.message || ''}`;
        if (message.includes('AccessDenied')) {
          console.log(
            'Auto-paste refused: the paste helper only accepts requests from the ' +
            'installed Clipmer binary. Running from source (npm start) is rejected ' +
            'by design — test auto-paste with the packaged build.'
          );
        } else if (message.includes('ServiceUnknown') || message.includes('was not provided')) {
          // "Enable it and log out" was the only advice here, and it is wrong
          // for the commonest cause: an enabled helper that GNOME refuses to
          // load because its version is not listed. Report what Shell says.
          getPasteExtensionState().then((state) => {
            console.log(
              `Auto-paste unavailable: the paste helper is not running (GNOME Shell ` +
              `reports ${state ? `state ${state}` : 'no such extension yet'}). ` +
              'Settings shows what to do.'
            );
          });
        } else {
          console.log('Auto-paste failed:', message.trim());
        }
      }
    );
  }, 150);
});

ipcMain.handle('update-note', (_event, { id, note }) => {
  if (!license.isPro()) return;
  const entry = clipboardHistory.find((e) => e.id === id);
  if (entry) {
    entry.note = note;
    persistHistory();
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
  // Written straight through rather than debounced: if the app dies in the next
  // 400ms an entry the user just masked must not come back unmasked.
  persistHistory({ immediate: true });
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
  // See clearHistory: resetting lastClipboardText here would let the poller
  // resurrect a just-deleted entry — unmasked — on the next tick.
  persistHistory();

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

// ─── Backup ─────────────────────────────────────────────────────────────────────

// A native file dialog takes focus, which the blur handler reads as "the user
// left" — so the window would hide itself behind its own dialog. The renderer
// already brackets its own confirm()s this way (withModal in app.js); this is
// the equivalent for the dialogs the main process owns. The previous value is
// restored rather than cleared, because the settings pane that launched this is
// still open and still wants suppression.
async function withDialogSuppressed(fn) {
  const previous = blurHideSuppressed;
  blurHideSuppressed = true;
  try {
    return await fn();
  } finally {
    blurHideSuppressed = previous;
  }
}

// Fixed strings on purpose: a raw error message here would put filesystem paths
// and internal detail straight into the settings pane.
function backupErrorMessage(err) {
  switch (err && err.code) {
    case 'not_a_backup': return 'That file is not a Clipmer backup';
    case 'unsupported_version': return 'That backup was written by a newer version of Clipmer';
    case 'bad_params': return 'That backup file is malformed';
    case 'bad_password': return 'Wrong password, or the file has been modified';
    case 'corrupt': return 'That backup file is damaged';
    case 'too_large': return 'That file is too large to be a Clipmer backup';
    case 'weak_password':
      return `Password must be at least ${backup.MIN_PASSWORD_CHARS} characters`;
    default: return 'Could not read that backup file';
  }
}

function defaultBackupDir() {
  // getPath('documents') is synthesized from XDG and can name a directory that
  // was never created, which leaves the dialog opening on nothing.
  try {
    const docs = app.getPath('documents');
    if (fs.existsSync(docs)) return docs;
  } catch {}
  return app.getPath('home');
}

function defaultBackupName() {
  const d = new Date();
  const stamp = [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-');
  return `clipmer-backup-${stamp}.json`;
}

async function readBackupFile(filePath) {
  const stat = await fs.promises.stat(filePath);
  // Checked before the read, not after: parseEnvelope cannot judge the size of
  // a file it has already had to load into memory.
  if (stat.size > backup.MAX_FILE_BYTES) throw new backup.BackupError('too_large');
  return fs.promises.readFile(filePath, 'utf8');
}

ipcMain.handle('export-backup', async (_event, password) => {
  if (!license.isPro()) return { success: false, error: 'Pro required' };
  if (typeof password !== 'string' || password.length < backup.MIN_PASSWORD_CHARS) {
    return { success: false, error: backupErrorMessage({ code: 'weak_password' }) };
  }

  try {
    const result = await withDialogSuppressed(() =>
      dialog.showSaveDialog(mainWindow, {
        title: 'Export encrypted backup',
        defaultPath: path.join(defaultBackupDir(), defaultBackupName()),
        filters: [{ name: 'Clipmer backup', extensions: ['json'] }],
      })
    );
    if (result.canceled || !result.filePath) return { success: false, canceled: true };

    // GTK does not append the filter's extension, so a name typed without one
    // saves as a bare file that the import dialog's own *.json filter then
    // hides from the user who just made it.
    const target = path.extname(result.filePath) ? result.filePath : `${result.filePath}.json`;

    // Commit whatever the debounce is still holding, so the file matches what
    // the list is showing rather than trailing it by up to 400ms.
    flushHistory();

    // History and folders only. licenseKey and licenseEmail live in the same
    // store and are deliberately left out: a backup is a thing people mail to
    // themselves, and a signed Pro key inside one is a key handed out.
    const envelope = await backup.encrypt({
      payload: { history: clipboardHistory, groups },
      password,
      appVersion: app.getVersion(),
    });

    await fs.promises.writeFile(target, JSON.stringify(envelope, null, 2), { mode: 0o600 });
    // `mode` above only applies when the file is created, so overwriting an
    // existing backup would keep its old permissions. The contents are
    // encrypted, but a world-readable clipboard backup is still nobody else's
    // business — and clipmer-data.json already got this wrong once.
    try {
      await fs.promises.chmod(target, 0o600);
    } catch {}

    return {
      success: true,
      path: target,
      entries: clipboardHistory.length,
      folders: groups.length,
    };
  } catch (err) {
    console.error('Backup export failed:', err);
    return {
      success: false,
      error: err && err.code ? backupErrorMessage(err) : 'Could not write the backup file',
    };
  }
});

// Split from the apply step so the user picks a file, sees what is in it, and is
// only then asked for a password — and so an unreadable file is rejected before
// anyone bothers typing one.
ipcMain.handle('import-backup-pick', async () => {
  if (!license.isPro()) return { success: false, error: 'Pro required' };
  try {
    const result = await withDialogSuppressed(() =>
      dialog.showOpenDialog(mainWindow, {
        title: 'Import encrypted backup',
        properties: ['openFile'],
        filters: [
          { name: 'Clipmer backup', extensions: ['json'] },
          { name: 'All files', extensions: ['*'] },
        ],
      })
    );
    if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
      return { success: false, canceled: true };
    }
    const filePath = result.filePaths[0];
    const { meta } = backup.parseEnvelope(await readBackupFile(filePath));
    return { success: true, path: filePath, meta };
  } catch (err) {
    if (!(err instanceof backup.BackupError)) console.error('Backup pick failed:', err);
    return { success: false, error: backupErrorMessage(err) };
  }
});

ipcMain.handle('import-backup-apply', async (_event, args) => {
  if (!license.isPro()) return { success: false, error: 'Pro required' };
  const filePath = args && typeof args.path === 'string' ? args.path : '';
  const password = args && typeof args.password === 'string' ? args.password : '';
  const mode = args && args.mode === 'replace' ? 'replace' : 'merge';
  if (!filePath) return { success: false, error: 'No file selected' };
  if (!password) return { success: false, error: 'Password required' };

  try {
    // Re-read rather than caching the parse from the pick step: the file may
    // have changed in between, and keeping a decrypted payload alive between
    // two IPC calls is worse than paying for the read twice.
    const { header, params } = backup.parseEnvelope(await readBackupFile(filePath));
    const payload = await backup.decrypt({ header, params, password });

    // applyImport returns fresh arrays and leaves these two alone, so a throw
    // anywhere above this point leaves live state exactly as it was.
    const merged = backup.applyImport({
      current: { history: clipboardHistory, groups },
      incoming: payload,
      mode,
      limit: MAX_HISTORY,
    });

    clipboardHistory = merged.history;
    groups = merged.groups;

    // lastClipboardText is deliberately not touched — see clearHistory(). An
    // import does not change the system clipboard, and resetting the tracker
    // would have the next poll re-add whatever is still on it as a brand new,
    // unmasked record.

    // Written straight through rather than debounced: an import is one
    // deliberate change and must not be lost to a crash in the next 400ms.
    persistHistory({ immediate: true });
    store.set('groups', groups);

    // Replace mode can remove the folder the list is currently filtered to,
    // which would leave an empty list and no visible way back.
    const activeFilter = store.get('activeFilter');
    if (activeFilter && activeFilter !== 'all' && !groups.some((g) => g.id === activeFilter)) {
      store.set('activeFilter', 'all');
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('filter-reset');
      }
    }

    emitGroupsUpdated();
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('history-updated', getVisibleHistory());
    }

    return { success: true, mode, ...merged.stats };
  } catch (err) {
    if (!(err instanceof backup.BackupError)) console.error('Backup import failed:', err);
    return { success: false, error: backupErrorMessage(err) };
  }
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
ipcMain.handle('get-effective-shortcut', () => {
  // isRegistered() throws on an accelerator it cannot parse, and a store written
  // by an older build can still hold one — the very case this whole area exists
  // to survive. A throw here rejects the IPC and the settings pane silently
  // never updates.
  let bound = false;
  try {
    bound = globalShortcut.isRegistered(effectiveShortcut);
  } catch {
    bound = false;
  }
  return {
    requested: store.get('shortcut') || DEFAULT_SHORTCUT,
    effective: effectiveShortcut,
    bound,
    // Which fallback the settings pane may truthfully point at when nothing
    // bound. It used to claim the GNOME shortcut regardless, which is wrong on
    // every other desktop — and on Plasma it was wrong in the one case the
    // message exists to explain.
    desktop: desktopEnv(),
  };
});

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
      registerKdeShortcut();
      return { success: true, bound: false };
    }
    store.set('shortcut', previous);
    registerGlobalShortcut();
    registerGnomeShortcut();
    registerKdeShortcut();
    return { success: false, error: 'That shortcut is already in use' };
  }

  effectiveShortcut = shortcut;
  store.set('shortcut', shortcut);
  registerGnomeShortcut();
  registerKdeShortcut();
  return { success: true, bound: true };
});

const COLLAPSED_SIZE = { width: 380, height: 500 };
const EXPANDED_SIZE = { width: 800, height: 900 };

let isExpanded = false;
ipcMain.handle('toggle-expand', () => {
  if (!mainWindow) return isExpanded;

  const area = activeWorkArea();
  // Collapsing returns to whatever size the user last chose, not to a stock
  // 380x500 that would throw away a deliberate resize every time.
  const target = isExpanded ? savedWindowSize() : EXPANDED_SIZE;

  // 800x900 was applied unconditionally. On a 1366x768 laptop that put y at
  // -79, pushing the drag strip — the only draggable surface outside minimal
  // mode — above the top of the screen, leaving the window unmovable.
  const width = Math.min(target.width, area.width);
  const height = Math.min(target.height, area.height);
  mainWindow.setSize(width, height);

  const { x, y } = clampToWorkArea(
    area.x + (area.width - width) / 2,
    area.y + (area.height - height) / 2,
    width, height, area
  );
  mainWindow.setPosition(x, y);

  isExpanded = !isExpanded;
  // Re-centring discards a deliberate placement, so record the new one rather
  // than leaving a stale position to be restored later.
  persistBounds();
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

// GVariant switches to double quotes for any string containing an apostrophe.
// The parser only understands the single-quoted form, so rewriting a list that
// contains one would silently drop another application's keybinding. Refuse to
// touch the list in that case rather than destroying someone else's shortcuts.
function readCustomKeybindingPaths() {
  const raw = gsettings(['get', MEDIA_KEYS_SCHEMA, 'custom-keybindings']);
  if (raw.includes('"')) {
    throw new Error('custom-keybindings contains a double-quoted entry; leaving it alone');
  }
  return parseGVariantStringArray(raw);
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

// Which desktop is running decides which registration path can work at all.
// Matched by substring and case-insensitively because the variable holds a
// colon-separated list in practice: Ubuntu reports "ubuntu:GNOME", and Plasma
// reports "KDE" on some sessions and "KDE:plasma" on others.
function desktopEnv() {
  const raw = (process.env.XDG_CURRENT_DESKTOP || '').toLowerCase();
  if (raw.includes('kde') || raw.includes('plasma')) return 'kde';
  if (raw.includes('gnome') || raw.includes('unity')) return 'gnome';
  return 'other';
}

// The one command both desktop bindings run. The PID is read when the key is
// PRESSED, not when the binding is written. Previously `$(cat …)` sat inside a
// double-quoted string handed to a shell at registration time, so the running
// process's PID was baked into dconf — the hotkey worked until the next restart
// and then silently signalled a dead process. The /proc check makes a stale PID
// harmless rather than sending SIGUSR1 (default disposition: terminate) to
// whatever recycled it.
function toggleScript() {
  return (
    `p=$(cat ${shellQuote(PID_FILE)} 2>/dev/null); ` +
    `[ -n "$p" ] && grep -qs clipmer /proc/$p/cmdline && kill -USR1 "$p"`
  );
}

function toggleCommand() {
  return `bash -c ${shellQuote(toggleScript())}`;
}

// Register a GNOME custom keyboard shortcut. It signals the running instance;
// the SIGUSR1 handler toggles the window.
function registerGnomeShortcut() {
  const command = toggleCommand();

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

// ─── KDE Plasma shortcut ───────────────────────────────────────────────────────

// Plasma has no equivalent of GNOME's custom-keybinding schema. It binds global
// shortcuts to a .desktop file, so the file has to exist before the binding can
// name it, and the binding itself lives in a group named after that file.
const KDE_DESKTOP_FILE = 'clipmer-toggle.desktop';

// Plasma names two modifiers differently from Electron: Super is Meta, and the
// Cmd aliases do not exist. The key itself needs no translation.
function toKdeBinding(shortcut) {
  const MAP = {
    Super: 'Meta',
    Control: 'Ctrl',
    CmdOrCtrl: 'Ctrl',
    CommandOrControl: 'Ctrl',
    Option: 'Alt',
  };
  return shortcut.split('+').map((part) => MAP[part] || part).join('+');
}

// Plasma 6 ships kwriteconfig6 and Plasma 5 kwriteconfig5. Try the newer one
// first and fall through only on ENOENT — any other failure is a real error and
// must not be masked by retrying against a tool that is not there either.
function kwriteconfig(args) {
  const { execFileSync } = require('child_process');
  for (const bin of ['kwriteconfig6', 'kwriteconfig5']) {
    try {
      execFileSync(bin, args, { timeout: 5000, stdio: 'ignore' });
      return true;
    } catch (err) {
      if (err.code === 'ENOENT') continue;
      throw err;
    }
  }
  return false;
}

// `Exec=` is NOT a shell string. The desktop-entry spec gives it its own
// grammar: double quotes are the quoting character, `"`, backtick, `$` and `\`
// have to be backslash-escaped inside them, and a literal `%` has to be
// doubled or it reads as a field code. Shell quoting pushed through unchanged
// produces an Exec line the spec cannot parse.
function desktopExecQuote(value) {
  const escaped = value.replace(/(["`$\\])/g, '\\$1').replace(/%/g, '%%');
  return `"${escaped}"`;
}

// Guarded internally, like registerGnomeShortcut: set-shortcut calls this
// outside the startup wrapper, and an escaping throw there would reject the IPC
// and tell the user their shortcut failed when it had in fact been saved.
function registerKdeShortcut() {
  if (desktopEnv() !== 'kde') return;

  const os = require('os');
  const appsDir = path.join(os.homedir(), '.local', 'share', 'applications');
  const desktopPath = path.join(appsDir, KDE_DESKTOP_FILE);
  const shortcut = store.get('shortcut') || DEFAULT_SHORTCUT;

  try {
    // Rather than encode the toggle through both the shell's quoting and the
    // desktop entry's, write it to a file and point Exec at that path. One path
    // needs no escaping beyond quoting, and setAutostart() already writes a
    // launcher script for the same reason.
    const scriptPath = path.join(app.getPath('userData'), 'clipmer-toggle.sh');
    fs.writeFileSync(scriptPath, `#!/bin/sh\n${toggleScript()}\n`, { mode: 0o755 });

    // NoDisplay keeps this out of the application menu — it is a binding
    // target, not something anyone should launch. The X-KDE line is what files
    // it under Shortcuts → Commands rather than as an application launcher.
    fs.mkdirSync(appsDir, { recursive: true });
    fs.writeFileSync(
      desktopPath,
      [
        '[Desktop Entry]',
        'Type=Application',
        'Name=Clipmer Toggle',
        `Exec=${desktopExecQuote(scriptPath)}`,
        'NoDisplay=true',
        'StartupNotify=false',
        'X-KDE-GlobalAccel-CommandShortcut=true',
        '',
      ].join('\n'),
      { mode: 0o644 }
    );

    // kwriteconfig edits in place and only the group it is given, so the rest
    // of the user's shortcuts are left untouched — the same reason the GNOME
    // path reads the existing path list instead of overwriting it. Never
    // hand-write kglobalshortcutsrc: it holds every global shortcut on the
    // system. The value is `<active>,<default>,<description>`.
    const wrote = kwriteconfig([
      '--file', 'kglobalshortcutsrc',
      '--group', KDE_DESKTOP_FILE,
      '--key', '_launch',
      `${toKdeBinding(shortcut)},none,Toggle Clipmer`,
    ]);

    if (!wrote) {
      console.log('Neither kwriteconfig6 nor kwriteconfig5 found; skipped KDE shortcut');
      return;
    }

    kwriteconfig([
      '--file', 'kglobalshortcutsrc',
      '--group', KDE_DESKTOP_FILE,
      '--key', '_k_friendly_name',
      'Clipmer',
    ]);

    console.log(`KDE shortcut registered: ${toKdeBinding(shortcut)}`);
  } catch (err) {
    console.log('Could not register KDE shortcut:', err.message);
  }
}

// Deliberately NOT removed on quit, which is where this differs from the GNOME
// path. kglobalaccel only picks up changes to its config on a daemon restart or
// a fresh login, so writing the binding on every launch and deleting it on every
// quit would leave it in whichever state the last logout happened to catch.
// Leaving it in place is safe: the command no-ops against a stale PID file,
// which is exactly what the /proc check in toggleScript() is for.

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

    // Under an AppImage, process.execPath points inside /tmp/.mount_XXXX, which
    // is unmounted on exit and renamed on every run — so autostart pointed at a
    // path that no longer existed while isAutostartEnabled() still reported
    // true, because it only checks that the .desktop file exists. $APPIMAGE is
    // the stable path to the image itself.
    const target = process.env.APPIMAGE || process.execPath;
    const execTarget = app.isPackaged
      ? shellQuote(target)
      : `${shellQuote(target)} ${shellQuote(app.getAppPath())}`;

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
      // Quoted because the Desktop Entry spec word-splits Exec, so a home
      // directory containing a space broke login startup entirely.
      `Exec="${launcherScript}"`,
      // A theme name, not a path into app.asar. Electron's patched fs reads
      // through the archive — which is why the tray icon works — but
      // gnome-session does not, so stat() returned ENOTDIR and the entry fell
      // back to a generic icon. electron-builder installs hicolor icons for us.
      'Icon=clipmer',
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

const PASTE_EXTENSION_ID = 'clipmer-paste@clipmer.local';

function installPasteExtension() {
  const os = require('os');
  const extId = PASTE_EXTENSION_ID;
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

  try {
    const { execFileSync } = require('child_process');
    execFileSync('gnome-extensions', ['enable', extId], { timeout: 5000, stdio: 'ignore' });
  } catch {
    // Extension not yet known to GNOME Shell — needs logout/login
  }

  return isNew;
}

// Disable and delete the paste helper. The extension exports a keystroke
// injection service on the session bus, so opting out has to actually remove it
// rather than just flip a flag in our own store.
function removePasteExtension() {
  const os = require('os');
  const extId = PASTE_EXTENSION_ID;
  const extDir = path.join(os.homedir(), '.local/share/gnome-shell/extensions', extId);

  try {
    const { execFileSync } = require('child_process');
    execFileSync('gnome-extensions', ['disable', extId], { timeout: 5000, stdio: 'ignore' });
  } catch {
    // Not installed, or GNOME Shell not running — removing the directory below
    // is what actually matters.
  }

  try {
    fs.rmSync(extDir, { recursive: true, force: true });
  } catch (err) {
    console.log('Could not remove paste extension:', err.message);
  }
}

// What GNOME Shell reports for the paste helper: 'ACTIVE', 'OUT OF DATE',
// 'ERROR', 'INACTIVE' and so on. null means Shell has not registered it — it
// only scans for extensions at login — and 'UNAVAILABLE' means there is no
// gnome-extensions tool, so this is not a GNOME session. LC_ALL=C because the
// "State:" label is translated.
function getPasteExtensionState() {
  return new Promise((resolve) => {
    const { execFile } = require('child_process');
    execFile(
      'gnome-extensions',
      ['info', PASTE_EXTENSION_ID],
      { timeout: 5000, env: { ...process.env, LC_ALL: 'C' } },
      (err, stdout) => {
        if (err) return resolve(err.code === 'ENOENT' ? 'UNAVAILABLE' : null);
        const match = /^\s*State:\s*(.+?)\s*$/m.exec(stdout);
        resolve(match ? match[1] : null);
      }
    );
  });
}

// Why auto-paste is switched on but cannot work, for the settings pane — or
// null when it should work. The toggle alone used to read ON while GNOME
// refused to load the helper and every paste did nothing.
ipcMain.handle('get-auto-paste-status', async () => {
  if (!store.get('autoPaste')) return null;
  const state = await getPasteExtensionState();
  // GNOME 49 renamed ENABLED to ACTIVE; older Shells still print ENABLED.
  if (state === 'ACTIVE' || state === 'ENABLED') return null;
  if (state === 'OUT OF DATE') return 'out-of-date';
  if (state === 'ERROR') return 'error';
  if (state === 'UNAVAILABLE') return 'not-gnome';
  return 'not-running';
});

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
  store.set('autoPaste', !!enabled);

  if (enabled) {
    const isNew = installPasteExtension();
    if (isNew) {
      return 'needs-restart';
    }
    return 'ok';
  }

  // Turning it off used to write the flag and nothing else, so the keystroke
  // injection service stayed enabled on the session bus indefinitely.
  removePasteExtension();
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
    ['KDE shortcut', registerKdeShortcut],
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
  // Commit anything the debounce is still holding.
  flushHistory();
  // Release the GNOME key combination rather than leaving a binding pointing at
  // a process that no longer exists. Re-registered on the next launch.
  unregisterGnomeShortcut();
  // Clean up PID file
  try { fs.unlinkSync(PID_FILE); } catch {}
});

app.on('window-all-closed', () => {
  // Do nothing — app stays alive in tray
});
