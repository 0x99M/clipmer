const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('clipboardManager', {
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getHistory: () => ipcRenderer.invoke('get-history'),
  copyToClipboard: (entryId) => ipcRenderer.invoke('copy-to-clipboard', entryId),
  clearHistory: () => ipcRenderer.invoke('clear-history'),
  hideWindow: () => ipcRenderer.invoke('hide-window'),
  simulatePaste: () => ipcRenderer.invoke('simulate-paste'),
  updateNote: ({ id, note }) => ipcRenderer.invoke('update-note', { id, note }),
  setEntryHidden: ({ id, hidden }) => ipcRenderer.invoke('set-entry-hidden', { id, hidden }),
  toggleExpand: () => ipcRenderer.invoke('toggle-expand'),
  getGroups: () => ipcRenderer.invoke('get-groups'),
  createGroup: (name) => ipcRenderer.invoke('create-group', name),
  renameGroup: ({ id, name }) => ipcRenderer.invoke('rename-group', { id, name }),
  deleteGroup: (id) => ipcRenderer.invoke('delete-group', id),
  addToGroup: ({ groupId, entryId }) => ipcRenderer.invoke('add-to-group', { groupId, entryId }),
  removeFromGroup: ({ groupId, entryId }) => ipcRenderer.invoke('remove-from-group', { groupId, entryId }),
  deleteEntry: (entryId) => ipcRenderer.invoke('delete-entry', entryId),
  getStats: () => ipcRenderer.invoke('get-stats'),
  getTheme: () => ipcRenderer.invoke('get-theme'),
  setTheme: (theme) => ipcRenderer.invoke('set-theme', theme),
  getAccent: () => ipcRenderer.invoke('get-accent'),
  setAccent: (color) => ipcRenderer.invoke('set-accent', color),
  getShortcut: () => ipcRenderer.invoke('get-shortcut'),
  getEffectiveShortcut: () => ipcRenderer.invoke('get-effective-shortcut'),
  setShortcut: (shortcut) => ipcRenderer.invoke('set-shortcut', shortcut),
  getAutoPaste: () => ipcRenderer.invoke('get-auto-paste'),
  setAutoPaste: (enabled) => ipcRenderer.invoke('set-auto-paste', enabled),
  getAutoScrollTop: () => ipcRenderer.invoke('get-auto-scroll-top'),
  setAutoScrollTop: (v) => ipcRenderer.invoke('set-auto-scroll-top', v),
  getAutoClearSearch: () => ipcRenderer.invoke('get-auto-clear-search'),
  setAutoClearSearch: (v) => ipcRenderer.invoke('set-auto-clear-search', v),
  getCloseSettingsOnOpen: () => ipcRenderer.invoke('get-close-settings-on-open'),
  setCloseSettingsOnOpen: (v) => ipcRenderer.invoke('set-close-settings-on-open', v),
  getAutoFocusFirst: () => ipcRenderer.invoke('get-auto-focus-first'),
  setAutoFocusFirst: (v) => ipcRenderer.invoke('set-auto-focus-first', v),
  getActiveFilter: () => ipcRenderer.invoke('get-active-filter'),
  setActiveFilter: (v) => ipcRenderer.invoke('set-active-filter', v),
  onFilterReset: (callback) => {
    ipcRenderer.removeAllListeners('filter-reset');
    ipcRenderer.on('filter-reset', () => callback());
  },
  getFontSize: () => ipcRenderer.invoke('get-font-size'),
  setFontSize: (size) => ipcRenderer.invoke('set-font-size', size),
  getMinimalView: () => ipcRenderer.invoke('get-minimal-view'),
  setMinimalView: (v) => ipcRenderer.invoke('set-minimal-view', v),
  getRememberPosition: () => ipcRenderer.invoke('get-remember-position'),
  setRememberPosition: (v) => ipcRenderer.invoke('set-remember-position', v),
  getAutostart: () => ipcRenderer.invoke('get-autostart'),
  setAutostart: (v) => ipcRenderer.invoke('set-autostart', v),
  getLicenseInfo: () => ipcRenderer.invoke('license:info'),
  activateLicense: (key) => ipcRenderer.invoke('license:activate', key),
  deactivateLicense: () => ipcRenderer.invoke('license:deactivate'),
  isPro: () => ipcRenderer.invoke('license:isPro'),
  onHistoryUpdated: (callback) => {
    ipcRenderer.removeAllListeners('history-updated');
    ipcRenderer.on('history-updated', (_event, history) => callback(history));
  },
  onGroupsUpdated: (callback) => {
    ipcRenderer.removeAllListeners('groups-updated');
    ipcRenderer.on('groups-updated', (_event, groups) => callback(groups));
  },
});
