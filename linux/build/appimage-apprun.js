// afterPack hook: gives the AppImage Clipmer's own AppRun.
//
// Why: inside an AppImage, Chromium can only sandbox itself with unprivileged
// user namespaces. Its setuid helper (chrome-sandbox) never works there,
// because the AppImage is mounted nosuid. Ubuntu 24.04 and later block those
// namespaces through AppArmor, so Chromium aborts at startup ("SUID sandbox
// helper binary was found, but is not configured correctly") unless it was
// started with --no-sandbox. main.js can't fix that: by the time its
// appendSwitch('no-sandbox') runs, the zygote has already been set up.
//
// electron-builder's generated AppRun just runs the binary, so only the
// desktop entry (Exec=AppRun --no-sandbox %U) worked. Starting it from a
// terminal, a file manager, the login autostart entry or the 256 MB relaunch
// all aborted. Our AppRun probes the namespaces the way Chromium uses them and
// adds --no-sandbox only when they're blocked. Where they work (Fedora, Arch,
// Debian...) the AppImage keeps its sandbox.
//
// The binary itself keeps its name. The GNOME paste helper checks that
// /proc/<pid>/exe is named exactly "clipmer", so a renamed binary behind a
// wrapper script would break auto-paste.
//
// How it gets in: electron-builder writes its own AppRun into the AppImage's
// staging directory and then copies the packed app directory over it, so an
// AppRun in the app directory replaces the generated one. That app directory is
// shared by every target in a run, which is why this hook refuses to run when
// the AppImage is built together with the deb or rpm: they must never get it.
// `npm run build` builds them in two separate runs. scripts/release.sh checks
// that the AppImage it ships has this AppRun (the CLIPMER_APPRUN marker).

const fs = require('fs');
const path = require('path');

const appRun = (executableName) => `#!/bin/bash
# CLIPMER_APPRUN: Clipmer's AppRun, written by linux/build/appimage-apprun.js.
set -e

if [ -z "$APPDIR" ]; then
  APPDIR="$(dirname "$(readlink -f "$0")")"
fi

# The same environment electron-builder's generated AppRun sets up.
export PATH="\${APPDIR}:\${APPDIR}/usr/sbin:\${PATH}"
export XDG_DATA_DIRS="./share/:/usr/share/gnome:/usr/local/share/:/usr/share/:\${XDG_DATA_DIRS}"
export LD_LIBRARY_PATH="\${APPDIR}/usr/lib:\${LD_LIBRARY_PATH}"
export XDG_DATA_DIRS="\${APPDIR}"/usr/share/:"\${XDG_DATA_DIRS}":/usr/share/gnome/:/usr/local/share/:/usr/share/
export GSETTINGS_SCHEMA_DIR="\${APPDIR}/usr/share/glib-2.0/schemas:\${GSETTINGS_SCHEMA_DIR}"

# Chromium's sandbox needs a user namespace it can map itself into, plus PID
# and network namespaces inside it. Try exactly that. If unshare is missing we
# can't tell, and starting without the sandbox beats not starting at all.
sandbox_works() {
  command -v unshare >/dev/null 2>&1 &&
    unshare --user --map-root-user --pid --net --fork true >/dev/null 2>&1
}

args=("$@")
has_no_sandbox=0
for arg in "$@"; do
  if [ "$arg" = "--no-sandbox" ]; then has_no_sandbox=1; fi
done
if [ "$has_no_sandbox" = 0 ] && ! sandbox_works; then
  args=(--no-sandbox "\${args[@]}")
fi

exec "\${APPDIR}/${executableName}" "\${args[@]}"
`;

module.exports = async function afterPack(context) {
  const names = context.targets.map((t) => t.name);
  if (!names.includes('appImage')) return;
  if (names.length > 1) {
    throw new Error(
      `Build the AppImage on its own (this run has: ${names.join(', ')}). ` +
        'Its AppRun goes into the app directory every target in a run shares, ' +
        'so the deb and rpm would get it too. `npm run build` does two runs.'
    );
  }

  const executableName = context.packager.executableName;
  if (!/^[A-Za-z0-9._-]+$/.test(executableName)) {
    throw new Error(`Unexpected executableName for AppRun: ${executableName}`);
  }
  if (!fs.existsSync(path.join(context.appOutDir, executableName))) {
    throw new Error(`AppRun target ${executableName} not found in ${context.appOutDir}`);
  }

  fs.writeFileSync(path.join(context.appOutDir, 'AppRun'), appRun(executableName), { mode: 0o755 });
};
