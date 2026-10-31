// electron-builder config for the dev build.
//
// Spreads the release config from package.json rather than restating it, so the
// dev build keeps testing the same packaging the release build uses and only
// the identity differs.
//
// AppImage only, and that is deliberate rather than a shortcut. A dev .deb
// would inherit the release maintainer scripts, and both are written against
// the release install:
//
//   build/postinst.sh     pkill -f "/opt/Clipmer/clipmer"  — installing the dev
//                         build would kill the running release build
//   build/afterRemove.sh  removes the clipmer-toggle GNOME keybinding, the
//                         clipmer-paste GNOME Shell extension and
//                         ~/.config/autostart/clipmer.desktop — uninstalling
//                         the dev build would strip the RELEASE build's
//                         desktop integration
//
// Giving the dev package forked copies of both is possible but is a second
// maintenance burden, and it buys nothing a dev build needs. An AppImage has no
// maintainer scripts at all, needs no sudo, and still exercises the real
// packaged path: asar, the sandbox fallback, the baked-in profile.

const base = require('../package.json').build;

module.exports = {
  ...base,

  appId: 'com.clipmer.app.dev',

  // No space, on purpose. productName becomes the install directory and feeds
  // executableName, and a path with a space in it is a liability in shell
  // fragments. The human-readable name is set on the desktop entry instead.
  productName: 'ClipmerDev',

  // Baked into the packaged package.json, which is where profile.js looks when
  // CLIPMER_PROFILE is not set. This is what makes an installed dev build know
  // it is a dev build without the user having to set an env var.
  extraMetadata: { clipmerProfile: 'dev' },

  linux: {
    ...base.linux,
    target: ['AppImage'],

    // Pinned rather than derived from productName, which would give
    // `clipmerdev`. The GNOME paste helper walks /proc/<pid>/exe and requires
    // the basename to be exactly "clipmer", so a differently named binary
    // cannot use auto-paste and that code path would go untestable.
    executableName: 'clipmer',

    desktop: { entry: { Name: 'Clipmer Dev' } },
  },

  // Dropped, not overridden: these only exist for deb/rpm, and leaving them in
  // place would point the dev build at scripts written for /opt/Clipmer.
  deb: undefined,
  rpm: undefined,
};
