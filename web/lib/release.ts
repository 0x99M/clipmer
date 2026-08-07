/**
 * One source of truth for the current release. Download links, the version
 * badge, the footer and the install guide all read from here, so
 * scripts/release.sh only has to rewrite VERSION rather than hunt for version
 * strings across components — which is how the blog install commands silently
 * went stale at 3.1.0.
 */
export const VERSION = "3.2.0";
export const TAG = `v${VERSION}`;

const BASE = `https://github.com/0x99M/clipmer/releases/download/${TAG}`;

export type ReleaseAsset = {
  /** Filename as published on the GitHub release. */
  file: string;
  url: string;
};

export const ASSETS = {
  deb: { file: `clipmer_${VERSION}_amd64.deb`, url: `${BASE}/clipmer_${VERSION}_amd64.deb` },
  rpm: { file: `clipmer-${VERSION}.x86_64.rpm`, url: `${BASE}/clipmer-${VERSION}.x86_64.rpm` },
  appImage: { file: `Clipmer-${VERSION}.AppImage`, url: `${BASE}/Clipmer-${VERSION}.AppImage` },
} satisfies Record<string, ReleaseAsset>;

export const RELEASE_PAGE = `https://github.com/0x99M/clipmer/releases/tag/${TAG}`;

/**
 * Only x86_64 is built — linux.target in linux/package.json specifies no arch,
 * so electron-builder produces x64 alone. The install guide checks for this
 * rather than handing an ARM user a package that cannot run.
 */
export const SUPPORTED_ARCH = "x86_64";
