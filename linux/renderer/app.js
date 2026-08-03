let historyData = [];
let groupsData = [];
let filteredData = [];
// True whenever the search box has a query, including one that matches nothing.
// currentEntries() depends on this rather than on filteredData being non-empty.
let searchActive = false;
let selectedIndex = -1;
let searchMode = 'content';
let activeFilter = 'all';  // 'all' | group.id
let filterMenuOpen = false;
let settingsOpen = false;
let foldersViewOpen = false;
let autoScrollTop = true;
let autoClearSearch = true;
let closeSettingsOnOpen = true;
let autoFocusFirst = false;
let proActive = false;
let viewerOpen = false;
let viewerEntry = null;
let entryMenuOpen = false;
let entryMenuTarget = null;
let entryMenuView = 'main'; // 'main' | 'folders'

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
    historyData = history;
    if (document.activeElement && document.activeElement.classList.contains('note-input')) {
      return;
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
    const ok = confirm('Clear all clipboard history? This can\'t be undone.');
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
    document.body.classList.toggle('minimal', minimalToggle.checked);
    window.clipboardManager.setMinimalView(minimalToggle.checked);
  });

  // Font size slider
  fontSlider.addEventListener('input', () => {
    const size = parseInt(fontSlider.value);
    applyFontSize(size);
    document.getElementById('font-size-value').textContent = size + 'px';
    window.clipboardManager.setFontSize(size);
  });

  // Autostart toggle
  autostartToggle.addEventListener('change', () => {
    window.clipboardManager.setAutostart(autostartToggle.checked);
  });

  // Auto-paste toggle
  autoPasteToggle.addEventListener('change', async () => {
    const result = await window.clipboardManager.setAutoPaste(autoPasteToggle.checked);
    if (result === 'needs-restart') {
      alert('Almost there! Log out and log back in to activate auto-paste.');
    }
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
    recorder.textContent = s.requested;
    if (!s.bound && s.effective !== s.requested) {
      showShortcutHint(`Using ${s.effective} — ${s.requested} was unavailable.`);
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
    if (!e.ctrlKey && !e.shiftKey && !e.altKey) return;

    const parts = [];
    if (e.ctrlKey) parts.push('Ctrl');
    if (e.shiftKey) parts.push('Shift');
    if (e.altKey) parts.push('Alt');

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
          if (result.bound === false) showShortcutHint('Saved. Uses the GNOME shortcut on Wayland.');
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
    window.clipboardManager.setShortcut('Ctrl+Shift+D');
    window.clipboardManager.setAutoPaste(false);
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
      row.classList.add('pro-locked');
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

function applyFontSize(size) {
  document.documentElement.style.setProperty('--font-size-base', size + 'px');
}

// ─── Rendering ──────────────────────────────────────────────────────────────────

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
        chip.title = proActive ? `Remove from "${group.name}"` : group.name;
        chip.innerHTML =
          '<svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">' +
          '<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>' +
          '</svg><span class="entry-chip-name"></span>';
        chip.querySelector('.entry-chip-name').textContent = group.name;
        if (proActive) {
          chip.addEventListener('click', async (e) => {
            e.stopPropagation();
            await window.clipboardManager.removeFromGroup({ groupId: group.id, entryId: entry.id });
          });
        } else {
          chip.addEventListener('click', (e) => e.stopPropagation());
        }
        chips.appendChild(chip);
      });
      row.appendChild(chips);
    }

    row.addEventListener('click', (e) => {
      if (e.target.classList.contains('note-input')) return;
      if (e.target.closest('.entry-actions-btn')) return;
      if (e.target.closest('.entry-chip')) return;
      selectEntry(i);
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
  await window.clipboardManager.copyToClipboard(entries[index]);
  await window.clipboardManager.simulatePaste();
}

// ─── Settings ───────────────────────────────────────────────────────────────────

async function toggleSettings() {
  // Folders and Settings are mutually exclusive; close folders first if needed
  if (foldersViewOpen) toggleFoldersView();

  settingsOpen = !settingsOpen;
  document.body.classList.toggle('settings-open', settingsOpen);
  const settingsView = document.getElementById('settings-view');
  const searchBar = document.getElementById('search-bar');

  if (settingsOpen) {
    listEl.style.display = 'none';
    emptyEl.style.display = 'none';
    searchBar.style.display = 'none';
    settingsView.style.display = '';
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
      if (result && result.error) alert(result.error);
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
        if (result && result.error) alert(result.error);
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
  const ok = confirm(`Delete folder "${group.name}"?`);
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
    filteredData = historyData.filter((e) => {
      if (e.hidden) return false;
      const matchContent = e.content.toLowerCase().includes(query);
      const matchNote = (e.note || '').toLowerCase().includes(query);
      return searchMode === 'notes' ? matchNote : matchContent;
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
        // Tab: toggle search mode
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

// ─── Filter dropdown ────────────────────────────────────────────────────────────

function updateFilterLabel() {
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
      alert(result.error);
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

function openViewer(entry) {
  viewerEntry = entry;
  viewerOpen = true;

  const overlay = document.getElementById('viewer-overlay');
  const body = document.getElementById('viewer-body');
  const title = document.getElementById('viewer-title');
  const meta = document.getElementById('viewer-meta');

  title.textContent = 'Full content';
  body.textContent = entry.content;
  const chars = entry.content.length;
  const lines = entry.content.split('\n').length;
  meta.textContent = `${chars.toLocaleString()} chars · ${lines} line${lines === 1 ? '' : 's'}`;

  overlay.style.display = 'flex';
}

function closeViewer() {
  viewerOpen = false;
  viewerEntry = null;
  document.getElementById('viewer-overlay').style.display = 'none';
}

// Wire up viewer controls (elements exist since script is at end of body)
document.getElementById('viewer-close').addEventListener('click', closeViewer);
document.getElementById('viewer-backdrop').addEventListener('click', closeViewer);
document.getElementById('viewer-copy').addEventListener('click', () => {
  if (viewerEntry) {
    window.clipboardManager.copyToClipboard(viewerEntry);
    closeViewer();
    window.clipboardManager.hideWindow();
  }
});

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
