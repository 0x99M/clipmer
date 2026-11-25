// Runs electron-builder for an AppImage-only build, working around a bug in
// electron-builder's AppImage tool set (appimage@1.0.2, used because package.json
// sets toolsets.appimage to "1.0.2").
//
// The bug: the tool set's mksquashfs is a bash wrapper that puts the tool set's
// own lib directory first on LD_LIBRARY_PATH, and that directory ships glibc
// 2.27's libm.so.6. Every system tool the wrapper then runs (basename first)
// loads that old libm and fails on a newer glibc, so on Ubuntu 26.04 (glibc
// 2.43) mksquashfs "process failed 1" before squashing anything.
//
// The fix: electron-builder reads the tool set from APPIMAGE_TOOLS_PATH when it
// is set. Point it at a directory with the same pinned runtime, runtime libraries
// and mksquashfs binary, but with mksquashfs linked to the real binary rather
// than the wrapper. That binary needs nothing from the bundled lib directory: it
// links only against system libraries. electron-builder still downloads and
// checksums the tool set itself; this only skips the broken wrapper.
//
// Usage: node build/build-appimage.js <electron-builder args>
//        (npm run build and npm run build:dev call it)

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
// Internal to app-builder-lib, pinned by package-lock.json. If an update moves
// it, this require fails loudly rather than building something different.
const { getAppImageTools } = require('app-builder-lib/out/toolsets/linux');
const { Arch } = require('builder-util');

async function main() {
  const tools = await getAppImageTools(Arch.x64);
  const root = path.dirname(tools.mksquashfs);
  const realMksquashfs = path.join(root, 'linux', 'x64', 'mksquashfs');
  for (const p of [realMksquashfs, path.join(root, 'runtimes'), path.join(root, 'lib')]) {
    if (!fs.existsSync(p)) throw new Error(`AppImage tool set is missing ${p}`);
  }

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'clipmer-appimage-tools-'));
  try {
    fs.symlinkSync(realMksquashfs, path.join(dir, 'mksquashfs'));
    fs.symlinkSync(path.join(root, 'runtimes'), path.join(dir, 'runtimes'));
    fs.symlinkSync(path.join(root, 'lib'), path.join(dir, 'lib'));

    const bin = path.join(__dirname, '..', 'node_modules', '.bin', 'electron-builder');
    const result = spawnSync(bin, process.argv.slice(2), {
      stdio: 'inherit',
      env: { ...process.env, APPIMAGE_TOOLS_PATH: dir },
    });
    if (result.error) throw result.error;
    process.exitCode = result.status ?? 1;
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
