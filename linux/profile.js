// Which build this is, and every name it must not share with the other one.
//
// A dev build has to be able to run next to the installed release build on the
// same machine, which means nothing identifying the app may be a bare literal
// any more: the config directory, Electron's single-instance lock, the PID
// file, the hotkey, the desktop-wide keybinding and the autostart entry all
// have to differ. The config directory is the one that matters most —
// electron-store writes a flat document and rewrites it whole on every set(),
// so a dev build that resolved the production userData path would destroy real
// clipboard history the first time it recorded a copy.
//
// `prod` is the DEFAULT here, which is the opposite of how a dev-first project
// would do it — but this file ships inside the release app, so the default has
// to be the release identity. A dev build opts in, two ways:
//
//   CLIPMER_PROFILE=dev electron .        running from source (npm run dev)
//   clipmerProfile: "dev" in package.json baked in by electron-builder's
//                                         extraMetadata at package time
//
// The env var wins, so a packaged dev build can still be pointed elsewhere.

const pkg = require('./package.json');

const requested = process.env.CLIPMER_PROFILE || pkg.clipmerProfile || 'prod';

if (!['dev', 'prod'].includes(requested)) {
  throw new Error(`CLIPMER_PROFILE must be 'dev' or 'prod', got '${requested}'`);
}

const isDev = requested === 'dev';

// The userData directory name, and so also the parent of clipmer-data.json, the
// PID file, the toggle script and the single-instance lock. The data file keeps
// its own name in both profiles, so a real document can be copied straight into
// the dev profile for realistic testing without renaming anything.
const appName = isDev ? 'clipmer-dev' : 'clipmer';

module.exports = {
  isDev,
  profile: requested,

  appName,

  // Shown to the user: tray tooltip, autostart entry, dialog titles. Having
  // this differ is the whole point of a dev build — two identical tray icons
  // with no way to tell which one you are clicking is worse than no dev build.
  displayName: isDev ? 'Clipmer Dev' : 'Clipmer',

  // A different hotkey, so launching the dev build cannot steal the shortcut
  // the release build is already holding. Whichever registers second simply
  // fails, and which one that is depends on login order — a coin toss is not
  // something to debug on top of whatever you were actually testing.
  // The dev fallback deliberately changes modifier, to Ctrl+Alt rather than a
  // third Ctrl+Shift combination. The release build's shortcut is
  // user-configurable and every suggestion the UI offers is Ctrl+Shift+<key>,
  // so a Ctrl+Shift fallback stands a real chance of being whatever the user
  // has actually bound — in which case the dev build would steal the release
  // build's hotkey precisely when its own primary failed to bind.
  defaultShortcut: isDev ? 'Ctrl+Shift+J' : 'Ctrl+Shift+D',
  fallbackShortcut: isDev ? 'Ctrl+Alt+J' : 'Ctrl+Shift+B',

  // GNOME keeps custom keybindings in a global list keyed by path, and Plasma
  // keys its global shortcuts to a .desktop filename. Both are machine-wide, so
  // a shared name means the two builds overwrite each other's binding.
  keybindingName: isDev ? 'clipmer-dev-toggle' : 'clipmer-toggle',
  kdeDesktopFile: isDev ? 'clipmer-dev-toggle.desktop' : 'clipmer-toggle.desktop',

  // ~/.config/autostart/<name>.desktop. Sharing this would mean enabling
  // autostart in one build silently rewrites the other build's entry.
  autostartName: appName,

  // A hicolor theme name, not a path. electron-builder installs the icons under
  // the package name, so the dev package's icons land under clipmer-dev.
  iconName: appName,
};
