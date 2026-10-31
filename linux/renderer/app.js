// Chromium's default drop behaviour navigates the frame to a dropped URL or
// .html file. The preload bridge survives navigation, so that page would inherit
// full access to the clipboard store. Main blocks the navigation too; this stops
// the drag being interpreted at all.
window.addEventListener('dragover', (e) => e.preventDefault());
window.addEventListener('drop', (e) => e.preventDefault());

let historyData = [];
let groupsData = [];
let filteredData = [];
// True whenever the search box has a query, including one that matches nothing.
// currentEntries() depends on this rather than on filteredData being non-empty.
let searchActive = false;
// A history update that arrived while a note input had focus. Applied when that
// input blurs, so the list never renders stale while the user is typing but is
// never left permanently out of sync either.
let pendingHistory = null;
let selectedIndex = -1;
let searchMode = 'content';
let activeFilter = 'all';  // 'all' | group.id
let filterMenuOpen = false;
// Which desktop is hosting us, read from main on the first shortcut query.
// 'other' until then, which is the honest default: it promises no fallback.
let hostDesktop = 'other';
let settingsOpen = false;
let foldersViewOpen = false;
let autoScrollTop = true;
let autoClearSearch = true;
let closeSettingsOnOpen = true;
let autoFocusFirst = false;
let proActive = false;
let viewerOpen = false;
let viewerEntry = null;
// Reset every time the viewer closes, so revealing a masked entry never
// persists into the next time it is opened.
let viewerRevealed = false;
let entryMenuOpen = false;
let entryMenuTarget = null;
let entryMenuView = 'main'; // 'main' | 'folders'
let backupOverlayOpen = false;
let backupOverlayMode = null; // 'export' | 'import'
let backupPendingPath = null;
// The key derivation takes a few hundred milliseconds. Without this, a second
// Enter starts another export on top of the first one.
let backupBusy = false;

// Frozen "now" used to format entry timestamps. Refreshed only when the window
// becomes visible, so the displayed times don't drift while the user looks at
// the list and we don't waste a render to bump every "37s ago" once a second.
let timeReferenceNow = Date.now();

// Pagination — render only the first PAGE_SIZE entries; clicking the load-more
// row (or pressing the down arrow once it's selected) reveals another page.
const PAGE_SIZE = 25;
let visibleCount = PAGE_SIZE;

const listEl = document.getElementById('history-list');
const emptyEl = document.getElementById('empty-state');
const searchEl = document.getElementById('search');
const clearBtn = document.getElementById('clear-all');

// ─── Init ───────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  // Load theme and accent
  const savedTheme = await window.clipboardManager.getTheme();
  applyTheme(savedTheme);
  const savedAccent = await window.clipboardManager.getAccent();
  applyAccent(savedAccent);
  const savedShortcut = await window.clipboardManager.getShortcut();
  document.getElementById('shortcut-recorder').textContent = savedShortcut;
  const autostartToggle = document.getElementById('autostart-toggle');
  autostartToggle.checked = await window.clipboardManager.getAutostart();
  const autoPasteToggle = document.getElementById('auto-paste-toggle');
  autoPasteToggle.checked = await window.clipboardManager.getAutoPaste();
  const autoScrollToggle = document.getElementById('auto-scroll-toggle');
  autoScrollTop = await window.clipboardManager.getAutoScrollTop();
  autoScrollToggle.checked = autoScrollTop;
  const autoClearSearchToggle = document.getElementById('auto-clear-search-toggle');
  autoClearSearch = await window.clipboardManager.getAutoClearSearch();
  autoClearSearchToggle.checked = autoClearSearch;
  const closeSettingsToggle = document.getElementById('close-settings-toggle');
  closeSettingsOnOpen = await window.clipboardManager.getCloseSettingsOnOpen();
  closeSettingsToggle.checked = closeSettingsOnOpen;
  const autoFocusFirstToggle = document.getElementById('auto-focus-first-toggle');
  autoFocusFirst = await window.clipboardManager.getAutoFocusFirst();
  autoFocusFirstToggle.checked = autoFocusFirst;
  const rememberPosToggle = document.getElementById('remember-position-toggle');
  rememberPosToggle.checked = await window.clipboardManager.getRememberPosition();
  const minimalToggle = document.getElementById('minimal-view-toggle');
  const savedMinimal = await window.clipboardManager.getMinimalView();
  minimalToggle.checked = savedMinimal;
  if (savedMinimal) document.body.classList.add('minimal');
  const fontSlider = document.getElementById('font-size-slider');
  const savedFontSize = await window.clipboardManager.getFontSize();
  applyFontSize(savedFontSize);
  fontSlider.value = savedFontSize;
  document.getElementById('font-size-value').textContent = savedFontSize + 'px';
  const opacitySlider = document.getElementById('opacity-slider');
  const savedOpacity = await window.clipboardManager.getWindowOpacity();
  applyWindowOpacity(savedOpacity);
  opacitySlider.value = Math.round(savedOpacity * 100);
  document.getElementById('opacity-value').textContent =
    Math.round(savedOpacity * 100) + '%';

  window.clipboardManager.getAppVersion().then((v) => {
    const el = document.getElementById('app-version-label');
    if (el) el.textContent = `Clipmer v${v}`;
  });

  historyData = await window.clipboardManager.getHistory();
  groupsData = await window.clipboardManager.getGroups();
  activeFilter = (await window.clipboardManager.getActiveFilter()) || 'all';
  // Snap back to 'all' if the persisted filter points at a deleted folder
  if (activeFilter !== 'all' && !groupsData.some((g) => g.id === activeFilter)) {
    activeFilter = 'all';
    window.clipboardManager.setActiveFilter('all');
  }
  updateFilterLabel();
  applyFilter();

  window.clipboardManager.onHistoryUpdated((history) => {
    // Buffer rather than adopt. Assigning historyData while skipping the
    // re-render left the DOM showing the previous ordering, and rows carry
    // their render-time index — so every index was off by one after a new
    // entry was unshifted, and clicking a row copied the entry rendered one
    // row above it. update-note deliberately does not broadcast, so blurring
    // the input never repaired it either.
    if (document.activeElement && document.activeElement.classList.contains('note-input')) {
      pendingHistory = history;
      return;
    }

    historyData = history;

    // The viewer holds its own reference to an entry. If that entry is gone —
    // deleted, cleared, or evicted by the cap — keep showing it and the Copy
    // button writes a wiped secret straight back to disk.
    if (viewerOpen && viewerEntry && !history.some((e) => e.id === viewerEntry.id)) {
      closeViewer();
    }

    // Skip the render when nobody can see it. The visibilitychange handler
    // already calls applyFilter() when the window opens, so we catch up then.
    if (document.hidden) return;
    applyFilter();
  });

  window.clipboardManager.onGroupsUpdated((groups) => {
    groupsData = groups;
    // If the active filter points at a now-missing group, reset
    if (activeFilter !== 'all' && !groups.some((g) => g.id === activeFilter)) {
      activeFilter = 'all';
      window.clipboardManager.setActiveFilter('all');
    }
    if (document.hidden) return;
    updateFilterLabel();
    // Refresh the main list (chips may have changed)
    applyFilter();
    // Refresh the folders view if it's currently open
    if (foldersViewOpen) {
      renderFolders(document.getElementById('folders-view-content'));
    }
  });

  window.clipboardManager.onFilterReset(() => {
    activeFilter = 'all';
    visibleCount = PAGE_SIZE;
    updateFilterLabel();
    applyFilter();
  });

  searchEl.addEventListener('input', () => {
    visibleCount = PAGE_SIZE;
    applyFilter();
  });

  clearBtn.addEventListener('click', async () => {
    // Names what actually happens: clearHistory() deliberately keeps entries
    // referenced by a folder. Promising to remove everything and then leaving
    // secrets in the list is exactly the wrong surprise before a screen share.
    const ok = await withModal(() =>
      confirm('Clear clipboard history?\n\nEntries saved in folders are kept. This can\'t be undone.')
    );
    if (!ok) return;
    await window.clipboardManager.clearHistory();
  });

  document.getElementById('expand-btn').addEventListener('click', async () => {
    const expanded = await window.clipboardManager.toggleExpand();
    document.body.classList.toggle('expanded', expanded);
    document.getElementById('expand-icon').style.display = expanded ? 'none' : '';
    document.getElementById('collapse-icon').style.display = expanded ? '' : 'none';
  });

  // Filter dropdown trigger
  document.getElementById('filter-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    if (filterMenuOpen) closeFilterMenu();
    else openFilterMenu();
  });

  // FAB — block mousedown focus so clicking the trigger doesn't trap the
  // menu open via :focus-within. Click events still fire normally.
  document.getElementById('fab').addEventListener('mousedown', (e) => {
    e.preventDefault();
  });
  document.getElementById('fab-folders').addEventListener('click', () => {
    if (settingsOpen) toggleSettings();
    if (!foldersViewOpen) toggleFoldersView();
  });
  document.getElementById('fab-settings').addEventListener('click', () => {
    if (foldersViewOpen) toggleFoldersView();
    if (!settingsOpen) toggleSettings();
  });

  // Settings back button
  document.getElementById('settings-back-btn').addEventListener('click', () => {
    toggleSettings();
  });

  // Folders back button
  document.getElementById('folders-back-btn').addEventListener('click', () => {
    toggleFoldersView();
  });

  // Settings tab switching
  document.querySelectorAll('.settings-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.settingsTab;
      document.querySelectorAll('.settings-tab').forEach((t) => t.classList.toggle('active', t === tab));
      document.querySelectorAll('.settings-pane').forEach((p) => p.classList.toggle('active', p.dataset.pane === target));
    });
  });

  // Minimal view toggle
  minimalToggle.addEventListener('change', () => {
    // Main refuses to enable it without a licence, so don't let the UI drift
    // out of sync by pretending it worked.
    if (!proActive && minimalToggle.checked) {
      minimalToggle.checked = false;
      return;
    }
    document.body.classList.toggle('minimal', minimalToggle.checked);
    window.clipboardManager.setMinimalView(minimalToggle.checked);
    // Re-lock the row once a lapsed user has switched it off.
    applyProGating();
  });

  // Font size slider
  fontSlider.addEventListener('input', () => {
    const size = parseInt(fontSlider.value);
    applyFontSize(size);
    document.getElementById('font-size-value').textContent = size + 'px';
    window.clipboardManager.setFontSize(size);
  });

  // Window opacity slider. Applied locally on every input event so dragging
  // shows the result immediately; the main process only stores the value.
  opacitySlider.addEventListener('input', () => {
    const percent = parseInt(opacitySlider.value);
    applyWindowOpacity(percent / 100);
    document.getElementById('opacity-value').textContent = percent + '%';
    window.clipboardManager.setWindowOpacity(percent / 100);
  });

  // Autostart toggle
  autostartToggle.addEventListener('change', () => {
    window.clipboardManager.setAutostart(autostartToggle.checked);
  });

  // Auto-paste toggle
  autoPasteToggle.addEventListener('change', async () => {
    const result = await window.clipboardManager.setAutoPaste(autoPasteToggle.checked);
    if (result === 'needs-restart') {
      await withModal(() => alert('Almost there! Log out and log back in to activate auto-paste.'));
    }
    refreshAutoPasteStatus();
  });

  // Auto-scroll toggle
  autoScrollToggle.addEventListener('change', () => {
    autoScrollTop = autoScrollToggle.checked;
    window.clipboardManager.setAutoScrollTop(autoScrollTop);
  });

  // Auto-clear search toggle
  autoClearSearchToggle.addEventListener('change', () => {
    autoClearSearch = autoClearSearchToggle.checked;
    window.clipboardManager.setAutoClearSearch(autoClearSearch);
  });

  // Close-settings-on-open toggle
  closeSettingsToggle.addEventListener('change', () => {
    closeSettingsOnOpen = closeSettingsToggle.checked;
    window.clipboardManager.setCloseSettingsOnOpen(closeSettingsOnOpen);
  });

  // Focus-first-item-on-open toggle
  autoFocusFirstToggle.addEventListener('change', () => {
    autoFocusFirst = autoFocusFirstToggle.checked;
    window.clipboardManager.setAutoFocusFirst(autoFocusFirst);
  });

  // Remember position toggle
  rememberPosToggle.addEventListener('change', () => {
    window.clipboardManager.setRememberPosition(rememberPosToggle.checked);
  });

  // Apply settings when window becomes visible
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;

    // Main only ever hides the window; the renderer is never reloaded. So an
    // open viewer or entry menu was still on screen the instant the window came
    // back — a masked entry's plaintext was visible before any keystroke.
    // Closing them here is what makes "hide it, then reopen" safe mid-call.
    if (viewerOpen) closeViewer();
    if (entryMenuOpen) closeEntryMenu();

    // A note input focused when the window hid never fires blur, so anything
    // buffered while it held focus is adopted here.
    flushPendingHistory();

    timeReferenceNow = Date.now();
    visibleCount = PAGE_SIZE;

    // Close settings / folders view if the user enabled that behavior
    if (settingsOpen && closeSettingsOnOpen) {
      toggleSettings();
    }
    if (foldersViewOpen && closeSettingsOnOpen) {
      toggleFoldersView();
    }

    if (!settingsOpen && !foldersViewOpen) {
      if (autoClearSearch) {
        searchEl.value = '';
      }
      selectedIndex = -1;
      applyFilter();
      if (autoScrollTop) {
        listEl.scrollTop = 0;
      }

      // Pre-select the first entry if the user opted in.
      if (autoFocusFirst) {
        const entries = currentEntries();
        if (entries.length > 0) {
          setSelectedIndex(0);
          scrollSelectedIntoView();
        }
      }

      searchEl.focus();
    }
  });

  // Accent color picker
  const accentPicker = document.getElementById('accent-picker');
  accentPicker.value = savedAccent;
  accentPicker.addEventListener('input', () => {
    applyAccent(accentPicker.value);
    window.clipboardManager.setAccent(accentPicker.value);
  });

  // Shortcut recorder
  const recorder = document.getElementById('shortcut-recorder');
  let recording = false;
  let shortcutHintTimer = null;

  function showShortcutHint(text) {
    const hint = document.getElementById('shortcut-hint');
    if (!hint) return;
    hint.textContent = text;
    hint.classList.add('visible');
    clearTimeout(shortcutHintTimer);
    shortcutHintTimer = setTimeout(() => hint.classList.remove('visible'), 4000);
  }

  // Surface a hotkey that never bound — otherwise the pane keeps displaying an
  // accelerator that does nothing.
  window.clipboardManager.getEffectiveShortcut().then((s) => {
    if (!s) return;
    if (s.desktop) hostDesktop = s.desktop;
    recorder.textContent = s.requested;
    // Two distinct cases, and the old single condition could match neither:
    // when the fallback binds, bound is true; when nothing binds, effective
    // equals requested. So `!bound && effective !== requested` was unreachable.
    if (s.effective !== s.requested) {
      showShortcutHint(`Using ${s.effective} — ${s.requested} was unavailable.`);
    } else if (!s.bound) {
      showShortcutHint(unboundHint(s.requested));
    }
  });

  recorder.addEventListener('click', () => {
    recording = !recording;
    if (recording) {
      recorder.textContent = 'Press shortcut...';
      recorder.classList.add('recording');
    } else {
      recorder.classList.remove('recording');
      window.clipboardManager.getShortcut().then((s) => { recorder.textContent = s; });
    }
  });

  document.addEventListener('keydown', (e) => {
    if (!recording) return;
    e.preventDefault();
    e.stopPropagation();

    if (e.key === 'Escape') {
      recording = false;
      recorder.classList.remove('recording');
      window.clipboardManager.getShortcut().then((s) => { recorder.textContent = s; });
      return;
    }

    // Ignore modifier-only presses
    if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) return;

    // Require at least one modifier
    if (!e.ctrlKey && !e.shiftKey && !e.altKey && !e.metaKey) return;

    const parts = [];
    if (e.ctrlKey) parts.push('Ctrl');
    if (e.shiftKey) parts.push('Shift');
    if (e.altKey) parts.push('Alt');
    // Electron and GNOME call this Super, Plasma calls it Meta, and the DOM
    // calls it metaKey. Emitting 'Meta' here would make the GNOME path write
    // <Meta>, a different and usually unmapped modifier — so it has to be
    // normalised to Super at the point of capture. main.js already accepted
    // Super as a modifier; nothing could ever produce one.
    if (e.metaKey) parts.push('Super');

    // Map the DOM key name to Electron's accelerator name. These differ — the
    // arrows are 'ArrowUp' in the DOM but 'Up' to Electron, and passing the DOM
    // spelling through made globalShortcut.register() throw.
    const KEY_ALIASES = {
      ArrowUp: 'Up',
      ArrowDown: 'Down',
      ArrowLeft: 'Left',
      ArrowRight: 'Right',
      ' ': 'Space',
      Spacebar: 'Space',
      Esc: 'Escape',
      Del: 'Delete',
    };

    let key = e.key;
    if (key.length === 1) key = key.toUpperCase();
    else if (KEY_ALIASES[key]) key = KEY_ALIASES[key];
    parts.push(key);

    const accelerator = parts.join('+');
    recorder.classList.remove('recording');
    recording = false;

    // Only paint the new value once the main process confirms it took. It
    // rejects anything it cannot bind, and silently showing a shortcut that
    // never registered is how a dead hotkey goes unnoticed.
    const previous = recorder.textContent;
    recorder.textContent = accelerator;
    window.clipboardManager
      .setShortcut(accelerator)
      .then((result) => {
        if (result && result.success) {
          if (result.bound === false) showShortcutHint(savedUnboundHint());
          return;
        }
        recorder.textContent = previous;
        showShortcutHint((result && result.error) || 'Could not set that shortcut');
      })
      .catch(() => {
        recorder.textContent = previous;
        showShortcutHint('Could not set that shortcut');
      });
  }, true);

  // Theme toggle
  document.querySelectorAll('.theme-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const theme = btn.dataset.theme;
      applyTheme(theme);
      window.clipboardManager.setTheme(theme);
      document.querySelectorAll('.theme-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  // Reset settings
  document.getElementById('reset-settings-btn').addEventListener('click', () => {
    applyTheme('dark');
    applyAccent('#E95420');
    accentPicker.value = '#E95420';
    // Painted optimistically below and corrected if main refuses, the same way
    // the recorder itself behaves — otherwise Reset can display a shortcut that
    // never bound.
    recorder.textContent = 'Ctrl+Shift+D';
    autostartToggle.checked = false;
    window.clipboardManager.setAutostart(false);
    autoPasteToggle.checked = false;
    autoScrollToggle.checked = true;
    autoClearSearchToggle.checked = true;
    rememberPosToggle.checked = true;
    window.clipboardManager.setRememberPosition(true);
    minimalToggle.checked = false;
    document.body.classList.remove('minimal');
    autoScrollTop = true;
    autoClearSearch = true;
    window.clipboardManager.setTheme('dark');
    window.clipboardManager.setMinimalView(false);
    window.clipboardManager.setAccent('#E95420');
    window.clipboardManager.setShortcut('Ctrl+Shift+D').then((r) => {
      if (r && r.success) return;
      window.clipboardManager.getShortcut().then((s) => { recorder.textContent = s; });
      showShortcutHint('Could not reset the shortcut');
    });
    window.clipboardManager.setAutoPaste(false).then(refreshAutoPasteStatus);
    fontSlider.value = 13;
    applyFontSize(13);
    document.getElementById('font-size-value').textContent = '13px';
    window.clipboardManager.setAutoScrollTop(true);
    window.clipboardManager.setAutoClearSearch(true);
    window.clipboardManager.setCloseSettingsOnOpen(true);
    closeSettingsOnOpen = true;
    closeSettingsToggle.checked = true;
    window.clipboardManager.setAutoFocusFirst(false);
    autoFocusFirst = false;
    autoFocusFirstToggle.checked = false;
    window.clipboardManager.setFontSize(13);
    opacitySlider.value = 100;
    applyWindowOpacity(1);
    document.getElementById('opacity-value').textContent = '100%';
    window.clipboardManager.setWindowOpacity(1);
  });

  document.addEventListener('keydown', handleKeyDown);

  // ─── License UI ─────────────────────────────────────────────────────────────
  await initLicense();

  document.getElementById('activate-btn').addEventListener('click', async () => {
    const input = document.getElementById('license-input');
    const key = input.value.trim();
    if (!key) return;
    const result = await window.clipboardManager.activateLicense(key);
    const msg = document.getElementById('license-message');
    msg.style.display = 'block';
    if (result.success) {
      msg.textContent = 'License activated!';
      msg.className = 'license-message success';
      input.value = '';
      await initLicense();
      historyData = await window.clipboardManager.getHistory();
      groupsData = await window.clipboardManager.getGroups();
      applyProGating();
      applyFilter();
    } else {
      msg.textContent = result.error || 'Invalid license key';
      msg.className = 'license-message error';
    }
  });

  document.getElementById('buy-btn').addEventListener('click', () => {
    window.open('https://clipmer.app/pro', '_blank');
  });

  document.getElementById('deactivate-btn').addEventListener('click', async () => {
    await window.clipboardManager.deactivateLicense();
    await initLicense();
    historyData = await window.clipboardManager.getHistory();
    groupsData = await window.clipboardManager.getGroups();
    applyProGating();
    applyFilter();
  });
});

// ─── License ────────────────────────────────────────────────────────────────────

async function initLicense() {
  const info = await window.clipboardManager.getLicenseInfo();
  proActive = info.isPro;

  const statusEl = document.getElementById('license-status');
  const freeUI = document.getElementById('license-free-ui');
  const proUI = document.getElementById('license-pro-ui');
  const msgEl = document.getElementById('license-message');

  if (proActive) {
    statusEl.textContent = 'Pro';
    statusEl.classList.add('license-pro-status');
    freeUI.style.display = 'none';
    proUI.style.display = '';
    document.getElementById('license-email').textContent = info.email;
  } else {
    statusEl.textContent = 'Free';
    statusEl.classList.remove('license-pro-status');
    freeUI.style.display = '';
    proUI.style.display = 'none';
    msgEl.style.display = 'none';
  }

  applyProGating();
}

function applyProGating() {
  // Free: themes, accent color, custom shortcut, font size, hidden entries.
  // Pro: folders, notes + note search, minimal view, 200-entry history.

  // A licence that lapses while notes-search is active would otherwise leave
  // the user in a Pro mode they can no longer toggle out of.
  if (!proActive && searchMode === 'notes') {
    searchMode = 'content';
    updateSearchModeIndicator();
  }

  const proRows = ['minimal-view-toggle'];
  const freeRows = ['accent-picker', 'shortcut-recorder'];

  // Themes are free — clear any lock left over from an earlier build.
  document.querySelectorAll('.theme-btn').forEach((btn) => {
    btn.classList.remove('pro-locked');
  });

  freeRows.forEach((id) => {
    const row = document.getElementById(id)?.closest('.settings-row');
    if (!row) return;
    row.classList.remove('pro-locked');
    row.querySelector('.pro-badge')?.remove();
  });

  proRows.forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    const row = el.closest('.settings-row');
    if (!row) return;
    if (!proActive) {
      // Minimal view is the one Pro row a lapsed customer must still be able to
      // operate — to turn it OFF. .pro-locked sets pointer-events:none, which
      // would have made the main-process ungate unreachable, leaving them stuck
      // in a view with no visible header.
      const stuckOn = id === 'minimal-view-toggle' && el.checked;
      row.classList.toggle('pro-locked', !stuckOn);
      if (!row.querySelector('.pro-badge')) {
        const badge = document.createElement('span');
        badge.className = 'pro-badge';
        badge.textContent = 'PRO';
        row.querySelector('.settings-label')?.appendChild(badge);
      }
    } else {
      row.classList.remove('pro-locked');
      row.querySelector('.pro-badge')?.remove();
    }
  });

  // Backup is Pro. The badge goes on the description and the lock on the
  // buttons, so a free user can still read what the feature is before deciding
  // whether it is worth paying for.
  const backupActions = document.getElementById('backup-actions-row');
  const backupLabel = document.querySelector('#backup-label-row .settings-label-text');
  if (backupActions && backupLabel) {
    backupActions.classList.toggle('pro-locked', !proActive);
    const badge = backupLabel.querySelector('.pro-badge');
    if (!proActive && !badge) {
      const el = document.createElement('span');
      el.className = 'pro-badge';
      el.textContent = 'PRO';
      backupLabel.appendChild(el);
    } else if (proActive && badge) {
      badge.remove();
    }
  }

  // Search bar (free tier)
  searchEl.disabled = false;
  searchEl.placeholder = 'Search clipboard...';
}

// ─── Theme ──────────────────────────────────────────────────────────────────────

function applyTheme(theme) {
  if (theme === 'light') {
    document.body.classList.add('theme-light');
  } else {
    document.body.classList.remove('theme-light');
  }
  // Update toggle button states
  document.querySelectorAll('.theme-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.theme === theme);
  });
}

function applyAccent(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  // Darken for hover
  const hoverR = Math.max(0, Math.round(r * 0.8));
  const hoverG = Math.max(0, Math.round(g * 0.8));
  const hoverB = Math.max(0, Math.round(b * 0.8));

  document.documentElement.style.setProperty('--accent', hex);
  document.documentElement.style.setProperty('--accent-hover', `rgb(${hoverR}, ${hoverG}, ${hoverB})`);
  document.documentElement.style.setProperty('--accent-muted', `rgba(${r}, ${g}, ${b}, 0.20)`);
}

// The one knob behind window translucency: every surface that paints the
// window reads --bg-alpha, so setting it here is the whole of the live update.
function applyWindowOpacity(opacity) {
  document.documentElement.style.setProperty('--bg-alpha', String(opacity));
}

function applyFontSize(size) {
  document.documentElement.style.setProperty('--font-size-base', size + 'px');
}

// ─── Rendering ──────────────────────────────────────────────────────────────────

// The window hides itself on blur. That is right for the entry list, but the
// settings pane owns a native colour dialog which blurs us, and the list is
// covered by these panes anyway, so hiding is suppressed while either is open.
// Adopt any history update that arrived while a note input was focused.
function flushPendingHistory() {
  if (!pendingHistory) return;
  historyData = pendingHistory;
  pendingHistory = null;
  if (viewerOpen && viewerEntry && !historyData.some((e) => e.id === viewerEntry.id)) {
    closeViewer();
  }
  if (document.hidden) return;
  applyFilter();
}

// alert() and confirm() open a native dialog that takes focus, which the new
// blur handler reads as "the user left" — so the window hid itself behind its
// own dialog. Bracket every modal with suppression; the sync call restores
// whatever the current pane state warrants.
async function withModal(fn) {
  await window.clipboardManager.setBlurHideSuppressed(true);
  try {
    return fn();
  } finally {
    syncBlurHideSuppression();
  }
}

function syncBlurHideSuppression() {
  window.clipboardManager.setBlurHideSuppressed(settingsOpen || foldersViewOpen);
}

function getSourceData() {
  if (activeFilter === 'all') return historyData;
  const group = groupsData.find((g) => g.id === activeFilter);
  if (!group) return historyData;
  const byId = new Map(historyData.map((e) => [e.id, e]));
  return group.memberIds.map((id) => byId.get(id)).filter(Boolean);
}

function render(entries) {
  listEl.textContent = '';

  if (entries.length === 0) {
    emptyEl.classList.add('visible');
    return;
  }

  emptyEl.classList.remove('visible');

  const visibleEntries = entries.slice(0, visibleCount);
  const hasMore = entries.length > visibleEntries.length;

  visibleEntries.forEach((entry, i) => {
    const row = document.createElement('div');
    row.className = 'history-entry' + (i === selectedIndex ? ' selected' : '');
    row.dataset.index = i;

    // Type badge
    const badge = document.createElement('div');
    badge.className = 'entry-type-badge badge-text';
    badge.textContent = 'T';
    row.appendChild(badge);

    // Body wrapper
    const body = document.createElement('div');
    body.className = 'entry-body';

    const preview = document.createElement('div');
    preview.className = 'entry-preview' + (entry.hidden ? ' hidden' : '');
    preview.textContent = entry.hidden ? '••••••••••' : entry.preview;
    body.appendChild(preview);

    const time = document.createElement('div');
    time.className = 'entry-time';
    time.textContent = timeAgo(entry.timestamp);
    body.appendChild(time);

    // Note input (pro only)
    const noteInput = document.createElement('input');
    noteInput.type = 'text';
    noteInput.className = 'note-input';
    noteInput.placeholder = 'Add a note...';
    noteInput.maxLength = 500;
    // Hidden entries: mask the note too and lock editing so the masked
    // value can't accidentally get saved over the real note.
    if (entry.hidden && entry.note) {
      noteInput.value = '••••••••••';
      noteInput.disabled = true;
    } else if (entry.hidden) {
      noteInput.value = '';
      noteInput.disabled = true;
    } else {
      noteInput.value = entry.note || '';
    }
    if (!proActive) noteInput.style.display = 'none';

    const saveNote = debounce((value) => {
      window.clipboardManager.updateNote({ id: entry.id, note: value });
    }, 300);

    noteInput.addEventListener('input', () => {
      entry.note = noteInput.value;
      saveNote(noteInput.value);
    });

    noteInput.addEventListener('blur', () => {
      window.clipboardManager.updateNote({ id: entry.id, note: noteInput.value });
      // Deferred, because blur fires BEFORE the click that caused it. Re-rendering
      // here destroys the row under the pointer and the click never lands, so
      // clicking straight from a note field onto another entry did nothing.
      setTimeout(flushPendingHistory, 0);
    });

    body.appendChild(noteInput);
    row.appendChild(body);

    // Actions menu button ("...")
    const actionsBtn = document.createElement('button');
    actionsBtn.className = 'entry-actions-btn';
    actionsBtn.title = 'More actions';
    actionsBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none"><circle cx="12" cy="5" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="12" cy="19" r="1.7"/></svg>';
    actionsBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      // Toggle: if this entry's menu is already open, close it instead of reopening
      if (entryMenuOpen && entryMenuTarget && entryMenuTarget.id === entry.id) {
        closeEntryMenu();
      } else {
        openEntryActionsMenu(actionsBtn, entry);
      }
    });
    row.appendChild(actionsBtn);

    // Folder chips: render on their own line at the row's left edge
    const memberGroups = groupsData.filter((g) => g.memberIds.includes(entry.id));
    if (memberGroups.length > 0) {
      const chips = document.createElement('div');
      chips.className = 'entry-chips';
      memberGroups.forEach((group) => {
        const chip = document.createElement('button');
        chip.className = 'entry-chip';
        chip.title = `Remove from "${group.name}"`;
        chip.innerHTML =
          '<svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">' +
          '<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>' +
          '</svg><span class="entry-chip-name"></span>';
        chip.querySelector('.entry-chip-name').textContent = group.name;
        // Removal is ungated in main, so let a lapsed customer actually reach
        // it. Folder members are exempt from Clear History and from the entry
        // cap, so without this their old entries are unremovable.
        chip.addEventListener('click', async (e) => {
          e.stopPropagation();
          await window.clipboardManager.removeFromGroup({ groupId: group.id, entryId: entry.id });
        });
        chips.appendChild(chip);
      });
      row.appendChild(chips);
    }

    row.addEventListener('click', (e) => {
      if (e.target.classList.contains('note-input')) return;
      if (e.target.closest('.entry-actions-btn')) return;
      if (e.target.closest('.entry-chip')) return;
      // By id, not by the render-time index — a row must always copy the entry
      // it is displaying, even if the list has shifted underneath it.
      selectEntryById(entry.id);
    });

    listEl.appendChild(row);
  });

  if (hasMore) {
    const remaining = entries.length - visibleEntries.length;
    const more = document.createElement('button');
    more.type = 'button';
    more.className = 'load-more' + (selectedIndex === visibleEntries.length ? ' selected' : '');
    more.dataset.index = visibleEntries.length;
    more.textContent = `Load ${Math.min(PAGE_SIZE, remaining)} more · ${remaining} hidden`;
    more.addEventListener('click', () => expandVisible(entries));
    listEl.appendChild(more);
  }

  // Update entry count in header
  const sourceData = getSourceData();
  const countEl = document.getElementById('entry-count');
  if (countEl) {
    countEl.textContent = sourceData.length > 0 ? `${sourceData.length} items` : '';
  }
}

function expandVisible(entries) {
  visibleCount = Math.min(visibleCount + PAGE_SIZE, entries.length);
  render(entries);
  scrollSelectedIntoView();
}

async function selectEntry(index) {
  const entries = currentEntries();
  if (index < 0 || index >= entries.length) return;
  await selectEntryById(entries[index].id);
}

async function selectEntryById(entryId) {
  if (!entryId) return;
  await window.clipboardManager.copyToClipboard(entryId);
  await window.clipboardManager.simulatePaste();
}

// ─── Settings ───────────────────────────────────────────────────────────────────

// Auto-paste can be switched on and still do nothing — most often because GNOME
// refused to load the helper. Say why beside the toggle rather than letting
// every paste fail silently. Checked when Settings opens, because the helper's
// state only changes at login or when the toggle flips.
const AUTO_PASTE_STATUS_TEXT = {
  'out-of-date': 'Not running: your GNOME version is newer than this paste helper supports. Update Clipmer, then log out and back in.',
  'error': 'Not running: GNOME could not start the paste helper. Turn auto-paste off and on again, then log out and back in.',
  'not-running': 'Not running yet. Log out and back in to start the paste helper.',
  'not-gnome': 'Auto-paste needs GNOME. On this desktop, choosing an entry copies it without pasting.',
};

async function refreshAutoPasteStatus() {
  const el = document.getElementById('auto-paste-status');
  if (!el) return;
  const status = await window.clipboardManager.getAutoPasteStatus();
  const text = (status && AUTO_PASTE_STATUS_TEXT[status]) || '';
  el.textContent = text;
  el.hidden = !text;
}

async function toggleSettings() {
  // Folders and Settings are mutually exclusive; close folders first if needed
  if (foldersViewOpen) toggleFoldersView();

  settingsOpen = !settingsOpen;
  syncBlurHideSuppression();
  document.body.classList.toggle('settings-open', settingsOpen);
  const settingsView = document.getElementById('settings-view');
  const searchBar = document.getElementById('search-bar');

  if (settingsOpen) {
    listEl.style.display = 'none';
    emptyEl.style.display = 'none';
    searchBar.style.display = 'none';
    settingsView.style.display = '';
    refreshAutoPasteStatus();
    await renderStats();
  } else {
    settingsView.style.display = 'none';
    listEl.style.display = '';
    searchBar.style.display = '';
    applyFilter();
  }
}

function toggleFoldersView() {
  if (settingsOpen) toggleSettings();

  foldersViewOpen = !foldersViewOpen;
  syncBlurHideSuppression();
  document.body.classList.toggle('folders-open', foldersViewOpen);
  const view = document.getElementById('folders-view');
  const searchBar = document.getElementById('search-bar');

  if (foldersViewOpen) {
    listEl.style.display = 'none';
    emptyEl.style.display = 'none';
    searchBar.style.display = 'none';
    view.style.display = '';
    renderFolders(document.getElementById('folders-view-content'));
  } else {
    view.style.display = 'none';
    listEl.style.display = '';
    searchBar.style.display = '';
    applyFilter();
  }
}

// ─── Folders view ──────────────────────────────────────────────────────────────

function renderFolders(container) {
  const target = container || document.getElementById('folders-view-content');
  if (!target) return;
  target.textContent = '';

  if (!proActive) {
    const card = document.createElement('div');
    card.className = 'folders-upgrade';
    card.innerHTML =
      '<div class="folders-upgrade-icon">' +
        '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
          '<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>' +
        '</svg>' +
      '</div>' +
      '<div class="folders-upgrade-title">Folders is a Pro feature</div>' +
      '<div class="folders-upgrade-body">Organize your clipboard entries into named folders. Create, rename, and delete folders with Clipmer Pro.</div>' +
      '<button class="folders-upgrade-btn">Get Clipmer Pro</button>';
    card.querySelector('.folders-upgrade-btn').addEventListener('click', () => {
      window.open('https://clipmer.app/pro', '_blank');
    });
    target.appendChild(card);
    return;
  }

  const createRow = document.createElement('button');
  createRow.className = 'folder-create-btn';
  createRow.innerHTML =
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">' +
    '<line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line>' +
    '</svg><span>New folder</span>';
  createRow.addEventListener('click', () => startCreateFolderInline(createRow, target));
  target.appendChild(createRow);

  if (groupsData.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'folder-empty';
    empty.textContent = 'No folders yet. Click "New folder" to create one.';
    target.appendChild(empty);
    return;
  }

  groupsData.forEach((group) => {
    const row = document.createElement('div');
    row.className = 'folder-row';
    row.dataset.id = group.id;

    // Clicking the row jumps to the main view filtered to this folder.
    // Rename/delete buttons stop propagation, and inline-rename swaps in an
    // input that we ignore here so the user can finish editing.
    row.addEventListener('click', async () => {
      if (row.querySelector('.folder-inline-input')) return;
      activeFilter = group.id;
      await window.clipboardManager.setActiveFilter(group.id);
      updateFilterLabel();
      selectedIndex = -1;
      visibleCount = PAGE_SIZE;
      if (foldersViewOpen) toggleFoldersView();
      applyFilter();
    });

    const icon = document.createElement('span');
    icon.className = 'folder-icon';
    icon.innerHTML =
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>' +
      '</svg>';
    row.appendChild(icon);

    const name = document.createElement('span');
    name.className = 'folder-name';
    name.textContent = group.name;
    row.appendChild(name);

    const actions = document.createElement('span');
    actions.className = 'folder-actions';

    const renameBtn = document.createElement('button');
    renameBtn.className = 'folder-action-btn';
    renameBtn.title = 'Rename';
    renameBtn.innerHTML =
      '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>' +
      '</svg>';
    renameBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      startRenameFolderInline(row, group);
    });
    actions.appendChild(renameBtn);

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'folder-action-btn folder-action-danger';
    deleteBtn.title = 'Delete';
    deleteBtn.innerHTML =
      '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
      '<polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path><path d="M10 11v6"></path><path d="M14 11v6"></path><path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"></path>' +
      '</svg>';
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      handleDeleteFolder(group);
    });
    actions.appendChild(deleteBtn);

    row.appendChild(actions);
    target.appendChild(row);
  });
}

function startCreateFolderInline(anchorBtn, container) {
  if (!proActive) return;
  const target = container || document.getElementById('folders-view-content');
  if (!target || target.querySelector('.folder-inline-input')) return;
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'folder-inline-input';
  input.placeholder = 'Folder name';
  target.insertBefore(input, anchorBtn.nextSibling);
  input.focus();

  const commit = async () => {
    input.removeEventListener('blur', commit);
    const value = input.value.trim();
    if (!value) { input.remove(); return; }
    const result = await window.clipboardManager.createGroup(value);
    if (!result || !result.success) {
      input.remove();
      if (result && result.error) await withModal(() => alert(result.error));
    }
  };
  const cancel = () => {
    input.removeEventListener('blur', commit);
    input.remove();
  };
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); commit(); }
    if (e.key === 'Escape') { e.preventDefault(); cancel(); }
  });
  input.addEventListener('blur', commit);
}

function startRenameFolderInline(row, group) {
  if (!proActive) return;
  const nameEl = row.querySelector('.folder-name');
  if (!nameEl || row.querySelector('.folder-inline-input')) return;

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'folder-inline-input folder-rename-input';
  input.value = group.name;
  nameEl.replaceWith(input);
  input.focus();
  input.select();

  const commit = async () => {
    input.removeEventListener('blur', commit);
    const value = input.value.trim();
    if (value && value !== group.name) {
      const result = await window.clipboardManager.renameGroup({ id: group.id, name: value });
      if (!result || !result.success) {
        if (result && result.error) await withModal(() => alert(result.error));
        renderFolders();
      }
    } else {
      renderFolders();
    }
  };
  const cancel = () => {
    input.removeEventListener('blur', commit);
    renderFolders();
  };
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); commit(); }
    if (e.key === 'Escape') { e.preventDefault(); cancel(); }
  });
  input.addEventListener('blur', commit);
}

async function handleDeleteFolder(group) {
  if (!proActive) return;
  const ok = await withModal(() => confirm(`Delete folder "${group.name}"?`));
  if (!ok) return;
  await window.clipboardManager.deleteGroup(group.id);
}

async function renderStats() {
  const stats = await window.clipboardManager.getStats();
  const el = document.getElementById('stats-content');
  const size = stats.totalBytes < 1024 * 1024
    ? (stats.totalBytes / 1024).toFixed(1) + ' KB'
    : (stats.totalBytes / (1024 * 1024)).toFixed(1) + ' MB';

  el.textContent = '';
  const rows = [
    ['History entries', stats.historyTotal],
    ['Notes', stats.historyNotes],
    ['Groups', stats.totalGroups],
    ['Grouped entries', stats.groupedEntries],
    ['Storage used', size],
  ];
  rows.forEach(([label, value]) => {
    const row = document.createElement('div');
    row.className = 'settings-row';
    const labelEl = document.createElement('span');
    labelEl.className = 'settings-label';
    labelEl.textContent = label;
    const valueEl = document.createElement('span');
    valueEl.className = 'settings-value';
    valueEl.textContent = value;
    row.appendChild(labelEl);
    row.appendChild(valueEl);
    el.appendChild(row);
  });
}

// ─── Search ─────────────────────────────────────────────────────────────────────

function applyFilter() {
  const query = searchEl.value.toLowerCase().trim();
  selectedIndex = -1;
  searchActive = !!query;
  updateFilterLabel();

  if (!query) {
    filteredData = [];
    const source = getSourceData();
    // Folder filter with no entries: render a contextual empty state
    if (activeFilter !== 'all' && source.length === 0) {
      renderFilterEmptyState();
      return;
    }
    render(source);
  } else {
    // Search across all of history (groups reference history entries).
    // Hidden entries are deliberately excluded so a search like "pass"
    // can't surface a masked password as a result.
    const notesMode = searchMode === 'notes' && proActive;
    filteredData = historyData.filter((e) => {
      if (e.hidden) return false;
      const matchContent = e.content.toLowerCase().includes(query);
      const matchNote = (e.note || '').toLowerCase().includes(query);
      return notesMode ? matchNote : matchContent;
    });
    render(filteredData);
  }
}

function renderFilterEmptyState() {
  listEl.textContent = '';
  emptyEl.classList.remove('visible');

  if (!proActive) {
    const card = document.createElement('div');
    card.className = 'folders-upgrade';
    card.innerHTML =
      '<div class="folders-upgrade-icon">' +
        '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
          '<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>' +
        '</svg>' +
      '</div>' +
      '<div class="folders-upgrade-title">Folders is a Pro feature</div>' +
      '<div class="folders-upgrade-body">Organize your clipboard entries into named folders. Create, rename, and delete folders with Clipmer Pro.</div>' +
      '<button class="folders-upgrade-btn">Get Clipmer Pro</button>';
    card.querySelector('.folders-upgrade-btn').addEventListener('click', () => {
      window.open('https://clipmer.app/pro', '_blank');
    });
    listEl.appendChild(card);
    return;
  }

  const group = groupsData.find((g) => g.id === activeFilter);
  const name = group ? group.name : 'this folder';
  const msg = document.createElement('div');
  msg.className = 'folder-filter-empty';
  msg.innerHTML =
    '<p>No entries in <strong></strong> yet.</p>' +
    '<p class="empty-hint">Open the ⋯ menu on any entry to add it.</p>';
  msg.querySelector('strong').textContent = name;
  listEl.appendChild(msg);

  const countEl = document.getElementById('entry-count');
  if (countEl) countEl.textContent = '';
}

// Whether a search is active is tracked explicitly rather than inferred from
// filteredData.length. Inferring it meant a query matching nothing rendered the
// empty state while every handler still indexed the FULL history — ArrowDown
// then Enter put historyData[0] on the clipboard, and Shift+Enter opened it in
// the viewer, both defeating the deliberate exclusion of hidden entries from
// search below.
function currentEntries() {
  return searchActive ? filteredData : getSourceData();
}

function updateSearchModeIndicator() {
  const badge = document.getElementById('search-mode-badge');
  if (searchMode === 'notes') {
    searchEl.placeholder = 'Search notes...';
    badge.innerHTML = 'notes <kbd>tab</kbd>';
    badge.classList.add('active');
  } else {
    searchEl.placeholder = 'Search...';
    badge.innerHTML = 'content <kbd>tab</kbd>';
    badge.classList.remove('active');
  }
}

// ─── Keyboard navigation ────────────────────────────────────────────────────────

function handleKeyDown(e) {
  // If the filter menu is open, Escape closes it first
  if (filterMenuOpen) {
    if (e.key === 'Escape') {
      e.preventDefault();
      closeFilterMenu();
    }
    return;
  }

  // If an entry menu is open, Escape closes it first
  if (entryMenuOpen) {
    if (e.key === 'Escape') {
      e.preventDefault();
      closeEntryMenu();
    }
    return;
  }

  // The backup password prompt owns the keyboard while it is up. It has to come
  // before the settingsOpen branch below: it opens from the settings pane, so
  // otherwise Escape would close settings out from under it.
  if (backupOverlayOpen) {
    if (e.key === 'Escape') {
      e.preventDefault();
      if (!backupBusy) closeBackupOverlay();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      submitBackupOverlay();
    }
    return;
  }

  // If viewer is open, Escape closes it (everything else ignored)
  if (viewerOpen) {
    if (e.key === 'Escape') {
      e.preventDefault();
      closeViewer();
    }
    return;
  }

  // In folders view
  if (foldersViewOpen) {
    if (e.key === 'Escape') {
      e.preventDefault();
      toggleFoldersView();
    }
    return;
  }

  // In settings
  if (settingsOpen) {
    if (e.key === 'Escape' || (e.ctrlKey && e.key === ',')) {
      e.preventDefault();
      toggleSettings();
      return;
    }
    // Tab / Shift+Tab cycles through settings tabs
    if (e.key === 'Tab') {
      e.preventDefault();
      const tabs = Array.from(document.querySelectorAll('.settings-tab'));
      const currentIdx = tabs.findIndex((t) => t.classList.contains('active'));
      const nextIdx = e.shiftKey
        ? (currentIdx - 1 + tabs.length) % tabs.length
        : (currentIdx + 1) % tabs.length;
      tabs[nextIdx].click();
    }
    return;
  }

  // Don't intercept keys when typing in the note input
  if (document.activeElement && document.activeElement.classList.contains('note-input')) {
    if (e.key === 'Escape') {
      e.preventDefault();
      document.activeElement.blur();
    }
    return;
  }

  // Shift+Enter: view full content of the selected entry
  if (e.key === 'Enter' && e.shiftKey && selectedIndex >= 0) {
    e.preventDefault();
    const entries = currentEntries();
    // Skip the load-more row — its index is past the visible window.
    if (selectedIndex >= Math.min(visibleCount, entries.length)) return;
    const entry = entries[selectedIndex];
    if (entry) openViewer(entry);
    return;
  }

  // Ctrl+E: toggle expanded window size
  if (e.ctrlKey && e.key.toLowerCase() === 'e') {
    e.preventDefault();
    document.getElementById('expand-btn').click();
    return;
  }

  // Ctrl+,: toggle settings
  if (e.ctrlKey && e.key === ',') {
    e.preventDefault();
    toggleSettings();
    return;
  }

  // Auto-focus search bar when typing a printable character
  if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey && document.activeElement !== searchEl) {
    searchEl.focus();
    return;
  }

  const entries = currentEntries();

  const visibleLen = Math.min(visibleCount, entries.length);
  const hasLoadMore = entries.length > visibleLen;
  // Index past the last entry where the load-more row sits, when shown.
  const loadMoreIndex = hasLoadMore ? visibleLen : -1;

  switch (e.key) {
    case 'ArrowDown':
      e.preventDefault();
      if (hasLoadMore && selectedIndex === loadMoreIndex) {
        // Already on load-more — pressing down again expands.
        expandVisible(entries);
        break;
      }
      setSelectedIndex(
        Math.min(selectedIndex + 1, hasLoadMore ? loadMoreIndex : visibleLen - 1)
      );
      scrollSelectedIntoView();
      break;

    case 'ArrowUp':
      e.preventDefault();
      setSelectedIndex(Math.max(selectedIndex - 1, 0));
      scrollSelectedIntoView();
      break;

    case 'Enter':
      if (e.shiftKey) break; // handled above (open viewer)
      if (selectedIndex >= 0) {
        e.preventDefault();
        if (hasLoadMore && selectedIndex === loadMoreIndex) {
          expandVisible(entries);
        } else {
          selectEntry(selectedIndex);
        }
      }
      break;

    case 'Tab':
      e.preventDefault();
      if (e.shiftKey) {
        // Shift+Tab: cycle through filter options (All + each folder)
        const order = ['all', ...groupsData.map((g) => g.id)];
        const idx = order.indexOf(activeFilter);
        activeFilter = order[(idx + 1) % order.length];
        window.clipboardManager.setActiveFilter(activeFilter);
        updateFilterLabel();
        selectedIndex = -1;
        visibleCount = PAGE_SIZE;
        applyFilter();
      } else {
        // Tab: toggle search mode. Notes are a Pro feature, and searching them
        // was gated nowhere — not here and not in main — while writing them is
        // refused in main. A lapsed customer could still search notes they had
        // authored.
        if (!proActive && searchMode === 'content') break;
        searchMode = searchMode === 'content' ? 'notes' : 'content';
        updateSearchModeIndicator();
        applyFilter();
      }
      break;

    case 'Escape':
      e.preventDefault();
      window.clipboardManager.hideWindow();
      break;
  }
}

function scrollSelectedIntoView() {
  const el = listEl.querySelector('.selected');
  if (el) el.scrollIntoView({ block: 'nearest' });
}

// Cheap selection update: just swap the .selected class on the two affected
// rows. Avoids the full list rebuild that render() does — critical for arrow
// auto-repeat, which used to queue up renders faster than they could finish.
function setSelectedIndex(newIndex) {
  const prev = listEl.querySelector('.selected');
  if (prev) prev.classList.remove('selected');
  selectedIndex = newIndex;
  if (newIndex >= 0) {
    const next = listEl.querySelector(`[data-index="${newIndex}"]`);
    if (next) next.classList.add('selected');
  }
}

// ─── Utilities ──────────────────────────────────────────────────────────────────

function timeAgo(timestamp) {
  // Use the frozen reference so times stay stable until the window is reopened.
  // Math.max guards entries newer than the reference (added since last open).
  const seconds = Math.max(0, Math.floor((timeReferenceNow - timestamp) / 1000));
  if (seconds < 5) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function debounce(fn, ms) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

// ─── Shortcut hints ─────────────────────────────────────────────────────────────

// Electron's globalShortcut never fires on Wayland, so on a Wayland session the
// hotkey always comes from a desktop-specific fallback. These said "the GNOME
// shortcut still works" on every desktop, which was false on Plasma — the one
// place the message was most likely to be read.
function unboundHint(requested) {
  if (hostDesktop === 'gnome') {
    return `${requested} could not be registered. The GNOME shortcut still works.`;
  }
  if (hostDesktop === 'kde') {
    return `${requested} is registered with Plasma. It starts working after your next login.`;
  }
  return `${requested} could not be registered. This desktop may not allow global shortcuts on Wayland.`;
}

function savedUnboundHint() {
  if (hostDesktop === 'gnome') return 'Saved. Uses the GNOME shortcut on Wayland.';
  if (hostDesktop === 'kde') return 'Saved. Takes effect on Plasma after your next login.';
  return 'Saved, but nothing on this desktop could bind it.';
}

// ─── Folder tabs ────────────────────────────────────────────────────────────────

// Reads and writes the same activeFilter the filter button does, so the two
// controls can never disagree. Called from updateFilterLabel() rather than from
// each of its callers, which is what keeps every existing path in sync.
function renderFolderTabs() {
  const strip = document.getElementById('folder-tabs');
  if (!strip) return;

  // With no folders there is nothing to separate, and a lone "All" tab would
  // cost 30px of a 500px window to say nothing.
  if (groupsData.length === 0) {
    strip.hidden = true;
    strip.textContent = '';
    return;
  }

  strip.hidden = false;
  strip.textContent = '';

  // Counts are against the history actually loaded, matching what the filter
  // button's badge reports — a folder's memberIds can outlive the entries.
  const ids = new Set(historyData.map((e) => e.id));
  const tabs = [
    { id: 'all', name: 'All', count: historyData.length },
    ...groupsData.map((g) => ({
      id: g.id,
      name: g.name,
      count: g.memberIds.filter((id) => ids.has(id)).length,
    })),
  ];

  tabs.forEach((tab) => {
    const isActive = activeFilter === tab.id;
    const btn = document.createElement('button');
    btn.className = 'folder-tab' + (isActive ? ' active' : '');
    btn.setAttribute('role', 'tab');
    btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
    btn.setAttribute('aria-controls', 'history-list');
    // Arrow keys are the list's, not the strip's, so tabs are reached with Tab
    // like any other button. Shift+Tab still cycles the filter app-wide.
    btn.title = tab.name;

    const name = document.createElement('span');
    name.className = 'folder-tab-name';
    name.textContent = tab.name;
    btn.appendChild(name);

    const count = document.createElement('span');
    count.className = 'folder-tab-count';
    count.textContent = String(tab.count);
    btn.appendChild(count);

    btn.addEventListener('click', async () => {
      if (activeFilter === tab.id) return;
      activeFilter = tab.id;
      await window.clipboardManager.setActiveFilter(tab.id);
      selectedIndex = -1;
      visibleCount = PAGE_SIZE;
      applyFilter();
    });

    strip.appendChild(btn);
  });

  // Shift+Tab cycles the filter, so the active tab has to be brought back into
  // view when the strip is wider than the window.
  const active = strip.querySelector('.folder-tab.active');
  if (active) active.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}

// ─── Filter dropdown ────────────────────────────────────────────────────────────

function updateFilterLabel() {
  renderFolderTabs();

  const btn = document.getElementById('filter-btn');
  const icon = document.getElementById('filter-btn-icon');
  const count = document.getElementById('filter-count');
  if (!btn || !icon || !count) return;

  if (activeFilter === 'all') {
    btn.classList.remove('active');
    btn.title = 'Filter entries';
    icon.hidden = false;
    count.hidden = true;
    count.textContent = '';
    return;
  }

  const group = groupsData.find((g) => g.id === activeFilter);
  if (!group) {
    btn.classList.remove('active');
    btn.title = 'Filter entries';
    icon.hidden = false;
    count.hidden = true;
    return;
  }

  const ids = new Set(historyData.map((e) => e.id));
  const n = group.memberIds.filter((id) => ids.has(id)).length;
  btn.classList.add('active');
  btn.title = `Filter: ${group.name}`;
  icon.hidden = true;
  count.hidden = false;
  count.textContent = String(n);
}

function openFilterMenu() {
  closeFilterMenu();
  const anchor = document.getElementById('filter-btn');
  if (!anchor) return;

  const menu = document.createElement('div');
  menu.className = 'entry-menu filter-menu';
  document.body.appendChild(menu);
  filterMenuOpen = true;
  anchor.classList.add('open');

  const buildRow = (id, name) => {
    const row = document.createElement('button');
    row.className = 'entry-menu-item';
    const check = document.createElement('span');
    check.className = 'entry-menu-check' + (activeFilter === id ? '' : ' empty');
    check.textContent = '✓';
    row.appendChild(check);
    const label = document.createElement('span');
    label.textContent = name;
    row.appendChild(label);
    row.addEventListener('click', async (e) => {
      e.stopPropagation();
      activeFilter = id;
      await window.clipboardManager.setActiveFilter(id);
      updateFilterLabel();
      closeFilterMenu();
      selectedIndex = -1;
      visibleCount = PAGE_SIZE;
      applyFilter();
    });
    return row;
  };

  menu.appendChild(buildRow('all', 'All entries'));
  groupsData.forEach((g) => menu.appendChild(buildRow(g.id, g.name)));

  // Position under the anchor
  const rect = anchor.getBoundingClientRect();
  const menuRect = menu.getBoundingClientRect();
  let left = rect.left;
  let top = rect.bottom + 4;
  if (top + menuRect.height > window.innerHeight) {
    top = rect.top - menuRect.height - 4;
  }
  if (left + menuRect.width > window.innerWidth - 4) {
    left = window.innerWidth - menuRect.width - 4;
  }
  if (left < 4) left = 4;
  menu.style.left = left + 'px';
  menu.style.top = top + 'px';
}

function closeFilterMenu() {
  const existing = document.querySelector('.filter-menu');
  if (existing) existing.remove();
  filterMenuOpen = false;
  const anchor = document.getElementById('filter-btn');
  if (anchor) anchor.classList.remove('open');
}

// ─── Per-entry actions menu ─────────────────────────────────────────────────────

function openEntryActionsMenu(anchor, entry) {
  closeEntryMenu();

  const menu = document.createElement('div');
  menu.className = 'entry-menu';
  document.body.appendChild(menu);

  entryMenuOpen = true;
  entryMenuTarget = entry;
  entryMenuView = 'main';

  renderEntryActionsMenu(menu, entry);
  positionEntryMenu(menu, anchor);
}

function positionEntryMenu(menu, anchor) {
  const rect = anchor.getBoundingClientRect();
  const menuRect = menu.getBoundingClientRect();
  let left = rect.right - menuRect.width;
  let top = rect.bottom + 4;
  if (top + menuRect.height > window.innerHeight) {
    top = rect.top - menuRect.height - 4;
  }
  if (left < 4) left = 4;
  if (left + menuRect.width > window.innerWidth - 4) {
    left = window.innerWidth - menuRect.width - 4;
  }
  menu.style.left = left + 'px';
  menu.style.top = top + 'px';
}

function renderEntryActionsMenu(menu, entry) {
  entryMenuView = 'main';
  menu.innerHTML = '';

  // Add to folder
  const addBtn = document.createElement('button');
  addBtn.className = 'entry-menu-item';
  addBtn.innerHTML =
    '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>' +
    '</svg><span>Add to folder</span>';
  if (!proActive) {
    const badge = document.createElement('span');
    badge.className = 'pro-badge';
    badge.textContent = 'PRO';
    badge.style.marginLeft = 'auto';
    addBtn.appendChild(badge);
  } else {
    const arrow = document.createElement('span');
    arrow.style.marginLeft = 'auto';
    arrow.style.color = 'var(--text-muted)';
    arrow.textContent = '›';
    addBtn.appendChild(arrow);
  }
  addBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    renderFolderPickerMenu(menu, entry);
  });
  menu.appendChild(addBtn);

  // View
  const viewBtn = document.createElement('button');
  viewBtn.className = 'entry-menu-item';
  viewBtn.innerHTML =
    '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>' +
    '</svg><span>View full content</span>';
  viewBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    closeEntryMenu();
    openViewer(entry);
  });
  menu.appendChild(viewBtn);

  // Hide / Unhide — masks the entry in the list so it's safe during screen-share.
  // Click-to-copy still puts the real content on the clipboard.
  const hideBtn = document.createElement('button');
  hideBtn.className = 'entry-menu-item';
  hideBtn.innerHTML = entry.hidden
    ? '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>' +
      '</svg><span>Unhide</span>'
    : '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>' +
      '<line x1="1" y1="1" x2="23" y2="23"/>' +
      '</svg><span>Hide</span>';
  hideBtn.addEventListener('click', async (e) => {
    e.stopPropagation();
    closeEntryMenu();
    await window.clipboardManager.setEntryHidden({ id: entry.id, hidden: !entry.hidden });
  });
  menu.appendChild(hideBtn);

  const sep = document.createElement('div');
  sep.className = 'entry-menu-separator';
  menu.appendChild(sep);

  // Delete (2-step confirm)
  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'entry-menu-item danger';
  deleteBtn.dataset.confirming = 'false';
  deleteBtn.innerHTML =
    '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
    '<polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path><path d="M10 11v6"></path><path d="M14 11v6"></path>' +
    '</svg><span class="entry-menu-delete-label">Delete</span>';
  deleteBtn.addEventListener('click', async (e) => {
    e.stopPropagation();
    if (deleteBtn.dataset.confirming !== 'true') {
      deleteBtn.dataset.confirming = 'true';
      deleteBtn.querySelector('.entry-menu-delete-label').textContent = 'Click again to confirm';
      return;
    }
    closeEntryMenu();
    await window.clipboardManager.deleteEntry(entry.id);
    selectedIndex = -1;
  });
  menu.appendChild(deleteBtn);
}

function renderFolderPickerMenu(menu, entry) {
  entryMenuView = 'folders';
  menu.innerHTML = '';

  // Back row
  const back = document.createElement('button');
  back.className = 'entry-menu-item entry-menu-back';
  back.innerHTML =
    '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
    '<polyline points="15 18 9 12 15 6"></polyline>' +
    '</svg><span>Actions</span>';
  back.addEventListener('click', (e) => {
    e.stopPropagation();
    renderEntryActionsMenu(menu, entry);
  });
  menu.appendChild(back);

  if (!proActive) {
    const upgrade = document.createElement('div');
    upgrade.className = 'entry-menu-upgrade';
    upgrade.innerHTML =
      '<div style="margin-bottom:6px">Organize entries with folders.</div>' +
      '<button class="folders-upgrade-btn" style="padding:6px 14px;font-size:var(--font-size-xs)">Get Clipmer Pro</button>';
    upgrade.querySelector('.folders-upgrade-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      window.open('https://clipmer.app/pro', '_blank');
    });
    menu.appendChild(upgrade);
    return;
  }

  if (groupsData.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'entry-menu-upgrade';
    empty.textContent = 'No folders yet. Create one below.';
    menu.appendChild(empty);
  } else {
    groupsData.forEach((group) => {
      const row = document.createElement('button');
      row.className = 'entry-menu-item';
      const isMember = group.memberIds.includes(entry.id);
      const check = document.createElement('span');
      check.className = 'entry-menu-check' + (isMember ? '' : ' empty');
      check.textContent = isMember ? '✓' : '✓';
      row.appendChild(check);
      const name = document.createElement('span');
      name.textContent = group.name;
      row.appendChild(name);
      row.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (isMember) {
          await window.clipboardManager.removeFromGroup({ groupId: group.id, entryId: entry.id });
        } else {
          await window.clipboardManager.addToGroup({ groupId: group.id, entryId: entry.id });
        }
        // onGroupsUpdated will refresh groupsData; re-render the picker if still open
        if (entryMenuOpen && entryMenuView === 'folders') {
          renderFolderPickerMenu(menu, entry);
        }
      });
      menu.appendChild(row);
    });
  }

  // + New folder row
  const addRow = document.createElement('button');
  addRow.className = 'entry-menu-item';
  addRow.style.color = 'var(--text-secondary)';
  addRow.innerHTML = '<span style="width:13px;text-align:center">+</span><span>New folder&hellip;</span>';
  addRow.addEventListener('click', (e) => {
    e.stopPropagation();
    promptNewFolderInMenu(menu, entry, addRow);
  });
  menu.appendChild(addRow);
}

function promptNewFolderInMenu(menu, entry, anchorRow) {
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'entry-menu-inline-input';
  input.placeholder = 'Folder name';
  anchorRow.replaceWith(input);
  input.focus();

  const commit = async () => {
    input.removeEventListener('blur', commit);
    const value = input.value.trim();
    if (!value) {
      renderFolderPickerMenu(menu, entry);
      return;
    }
    const result = await window.clipboardManager.createGroup(value);
    if (result && result.success && result.id) {
      await window.clipboardManager.addToGroup({ groupId: result.id, entryId: entry.id });
    } else if (result && result.error) {
      await withModal(() => alert(result.error));
    }
    if (entryMenuOpen && entryMenuView === 'folders') {
      renderFolderPickerMenu(menu, entry);
    }
  };
  const cancel = () => {
    input.removeEventListener('blur', commit);
    renderFolderPickerMenu(menu, entry);
  };
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); commit(); }
    if (e.key === 'Escape') { e.preventDefault(); cancel(); }
  });
  input.addEventListener('blur', commit);
}

function closeEntryMenu() {
  const existing = document.querySelector('.entry-menu');
  if (existing) existing.remove();
  entryMenuOpen = false;
  entryMenuTarget = null;
  entryMenuView = 'main';
}

// ─── Full-content viewer ────────────────────────────────────────────────────────

// A masked entry opens masked. Marking something hidden is a statement that it
// must not appear on screen, and this viewer used to print entry.content with no
// check at all — so the one feature the product is sold on was defeated by the
// menu item sitting directly above the Hide button.
function openViewer(entry) {
  viewerEntry = entry;
  viewerOpen = true;
  viewerRevealed = false;
  renderViewer();
  document.getElementById('viewer-overlay').style.display = 'flex';
}

function renderViewer() {
  const entry = viewerEntry;
  if (!entry) return;

  const body = document.getElementById('viewer-body');
  const title = document.getElementById('viewer-title');
  const meta = document.getElementById('viewer-meta');
  const reveal = document.getElementById('viewer-reveal');

  const masked = entry.hidden && !viewerRevealed;

  title.textContent = masked ? 'Hidden entry' : 'Full content';
  body.textContent = masked ? '••••••••••' : entry.content;
  body.classList.toggle('viewer-masked', masked);

  // Length and line count are withheld while masked — they leak the shape of
  // the secret, which is often enough to identify it.
  if (masked) {
    meta.textContent = 'Masked';
  } else {
    const chars = entry.content.length;
    const lines = entry.content.split('\n').length;
    // Say so when the stored copy was capped, rather than presenting a partial
    // secret as if it were the whole thing.
    const suffix = entry.truncated ? ' · truncated' : '';
    meta.textContent =
      `${chars.toLocaleString()} chars · ${lines} line${lines === 1 ? '' : 's'}${suffix}`;
  }

  reveal.style.display = entry.hidden ? '' : 'none';
  reveal.textContent = viewerRevealed ? 'Hide' : 'Reveal';
}

function closeViewer() {
  viewerOpen = false;
  viewerEntry = null;
  // Re-masks for next time — a revealed secret must never still be revealed
  // when the viewer is next opened.
  viewerRevealed = false;
  document.getElementById('viewer-overlay').style.display = 'none';
}

// Wire up viewer controls (elements exist since script is at end of body)
document.getElementById('viewer-close').addEventListener('click', closeViewer);
document.getElementById('viewer-backdrop').addEventListener('click', closeViewer);
document.getElementById('viewer-reveal').addEventListener('click', () => {
  viewerRevealed = !viewerRevealed;
  renderViewer();
});
document.getElementById('viewer-copy').addEventListener('click', () => {
  if (viewerEntry) {
    window.clipboardManager.copyToClipboard(viewerEntry.id);
    closeViewer();
    window.clipboardManager.hideWindow();
  }
});

// ─── Encrypted backup ───────────────────────────────────────────────────────────

// Mirrors backup.js. Main rejects a short password regardless of what the UI
// lets through — this only buys a better message than a round trip would give.
const BACKUP_MIN_PASSWORD = 8;

function showBackupMessage(text, kind) {
  const el = document.getElementById('backup-message');
  el.textContent = text || '';
  el.className = kind ? `license-message ${kind}` : 'license-message';
  el.style.display = text ? 'block' : 'none';
}

function setBackupOverlayError(text) {
  const el = document.getElementById('backup-overlay-error');
  el.textContent = text || '';
  el.style.display = text ? 'block' : 'none';
}

function countLabel(n, singular, plural) {
  return `${n} ${n === 1 ? singular : plural}`;
}

// The counts come out of the backup's header, which is covered by the auth tag —
// so this describes the file without having to decrypt it, and cannot be edited
// to misdescribe what is inside.
function formatBackupMeta(meta) {
  if (!meta) return '';
  const parts = [];
  if (typeof meta.entries === 'number') parts.push(countLabel(meta.entries, 'entry', 'entries'));
  if (typeof meta.folders === 'number' && meta.folders > 0) {
    parts.push(countLabel(meta.folders, 'folder', 'folders'));
  }
  const when = meta.exportedAt ? new Date(meta.exportedAt) : null;
  if (when && !Number.isNaN(when.getTime())) {
    parts.push(when.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }));
  }
  return parts.join(' · ');
}

function summarizeImport(result) {
  const parts = [`Added ${countLabel(result.added, 'entry', 'entries')}`];
  if (result.duplicates) parts.push(`${result.duplicates} already here`);
  if (result.foldersAdded) parts.push(`${countLabel(result.foldersAdded, 'new folder', 'new folders')}`);
  if (result.foldersMerged) parts.push(`${countLabel(result.foldersMerged, 'folder', 'folders')} merged`);
  // Named rather than left for the user to notice the count came up short.
  if (result.dropped) parts.push(`${result.dropped} dropped at the history cap`);
  if (result.skipped) parts.push(`${result.skipped} unreadable`);
  return parts.join(' · ');
}

function openBackupOverlay(mode, picked) {
  backupOverlayOpen = true;
  backupOverlayMode = mode;
  backupPendingPath = mode === 'import' ? picked.path : null;

  const title = document.getElementById('backup-overlay-title');
  const desc = document.getElementById('backup-overlay-desc');
  const meta = document.getElementById('backup-overlay-meta');
  const confirmField = document.getElementById('backup-confirm-field');
  const modeField = document.getElementById('backup-mode-field');
  const confirmBtn = document.getElementById('backup-overlay-confirm');

  if (mode === 'export') {
    title.textContent = 'Export backup';
    // Says hidden entries are included, because the whole point of marking one
    // hidden is that it should not turn up where you did not expect it.
    desc.textContent =
      'Your history, notes and folders go into one encrypted file — hidden '
      + 'entries included. There is no recovery: forget this password and the '
      + 'file can never be opened again.';
    meta.textContent = '';
    confirmField.style.display = '';
    modeField.style.display = 'none';
    confirmBtn.textContent = 'Export';
  } else {
    title.textContent = 'Import backup';
    desc.textContent = 'Enter the password this backup was created with.';
    meta.textContent = formatBackupMeta(picked && picked.meta);
    confirmField.style.display = 'none';
    modeField.style.display = '';
    confirmBtn.textContent = 'Import';
  }

  document.getElementById('backup-password').value = '';
  document.getElementById('backup-password-confirm').value = '';
  const mergeRadio = document.querySelector('input[name="backup-mode"][value="merge"]');
  if (mergeRadio) mergeRadio.checked = true;
  setBackupOverlayError('');
  showBackupMessage('');

  document.getElementById('backup-overlay').style.display = 'flex';
  document.getElementById('backup-password').focus();
}

function closeBackupOverlay() {
  backupOverlayOpen = false;
  backupOverlayMode = null;
  backupPendingPath = null;
  // A password left in an input would still be sitting in the DOM afterwards,
  // and still be there the next time the overlay opened.
  document.getElementById('backup-password').value = '';
  document.getElementById('backup-password-confirm').value = '';
  setBackupOverlayError('');
  document.getElementById('backup-overlay').style.display = 'none';
}

function selectedBackupMode() {
  const checked = document.querySelector('input[name="backup-mode"]:checked');
  return checked && checked.value === 'replace' ? 'replace' : 'merge';
}

async function submitBackupOverlay() {
  if (backupBusy) return;

  const password = document.getElementById('backup-password').value;
  if (!password) {
    setBackupOverlayError('Enter a password');
    return;
  }

  if (backupOverlayMode === 'export') {
    if (password.length < BACKUP_MIN_PASSWORD) {
      setBackupOverlayError(`Password must be at least ${BACKUP_MIN_PASSWORD} characters`);
      return;
    }
    if (password !== document.getElementById('backup-password-confirm').value) {
      setBackupOverlayError('The two passwords do not match');
      return;
    }
  }

  const mode = backupOverlayMode === 'import' ? selectedBackupMode() : null;
  if (mode === 'replace') {
    const ok = await withModal(() =>
      confirm(
        'Replace your clipboard history?\n\n'
        + 'Everything in Clipmer now — entries, notes and folders — is discarded '
        + "and replaced by the contents of this backup. This can't be undone."
      )
    );
    if (!ok) return;
  }

  backupBusy = true;
  const confirmBtn = document.getElementById('backup-overlay-confirm');
  const previousLabel = confirmBtn.textContent;
  confirmBtn.disabled = true;
  confirmBtn.textContent = backupOverlayMode === 'export' ? 'Encrypting…' : 'Decrypting…';
  setBackupOverlayError('');

  try {
    if (backupOverlayMode === 'export') {
      const result = await window.clipboardManager.exportBackup(password);
      // A dismissed save dialog leaves the overlay up with the password intact,
      // so picking a different location does not mean typing it again.
      if (result.canceled) return;
      if (!result.success) {
        setBackupOverlayError(result.error || 'Export failed');
        return;
      }
      closeBackupOverlay();
      const what = result.folders
        ? `${countLabel(result.entries, 'entry', 'entries')} and ${countLabel(result.folders, 'folder', 'folders')}`
        : countLabel(result.entries, 'entry', 'entries');
      showBackupMessage(`Saved ${what} to ${result.path}`, 'success');
    } else {
      const result = await window.clipboardManager.applyBackup({
        path: backupPendingPath,
        password,
        mode,
      });
      if (!result.success) {
        setBackupOverlayError(result.error || 'Import failed');
        return;
      }
      closeBackupOverlay();
      showBackupMessage(summarizeImport(result), 'success');
      // The list repairs itself from main's history-updated and groups-updated
      // broadcasts; the stats block is only read when the pane is opened, so it
      // needs asking again.
      await renderStats();
    }
  } catch {
    setBackupOverlayError('Something went wrong');
  } finally {
    backupBusy = false;
    confirmBtn.disabled = false;
    confirmBtn.textContent = previousLabel;
  }
}

// Wired at module level like the viewer controls above — the script is at the
// end of body, so the elements exist.
document.getElementById('export-backup-btn').addEventListener('click', () => {
  openBackupOverlay('export');
});

document.getElementById('import-backup-btn').addEventListener('click', async () => {
  showBackupMessage('');
  // The file is picked and validated before any password is asked for, so an
  // unreadable file never costs the user a typed password.
  const picked = await window.clipboardManager.pickBackupFile();
  if (!picked.success) {
    // A dismissed dialog is not an error worth reporting.
    if (!picked.canceled) showBackupMessage(picked.error || 'Could not read that file', 'error');
    return;
  }
  openBackupOverlay('import', picked);
});

document.getElementById('backup-overlay-cancel').addEventListener('click', closeBackupOverlay);
document.getElementById('backup-overlay-close').addEventListener('click', closeBackupOverlay);
document.getElementById('backup-backdrop').addEventListener('click', () => {
  // Not mid-derivation: closing would leave the pending result with nowhere to
  // report itself.
  if (!backupBusy) closeBackupOverlay();
});
document.getElementById('backup-overlay-confirm').addEventListener('click', submitBackupOverlay);

// Dismiss entry actions menu on outside click
document.addEventListener('click', (e) => {
  if (entryMenuOpen) {
    const menu = document.querySelector('.entry-menu:not(.filter-menu)');
    if (menu && !menu.contains(e.target) && !e.target.closest('.entry-actions-btn')) {
      closeEntryMenu();
    }
  }
  if (filterMenuOpen) {
    const menu = document.querySelector('.filter-menu');
    if (menu && !menu.contains(e.target) && !e.target.closest('#filter-btn')) {
      closeFilterMenu();
    }
  }
});
