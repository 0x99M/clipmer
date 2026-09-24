/**
 * One source of truth for the current release. Download links, the version
 * badge, the footer and the install guide all read from here, so
 * scripts/release.sh only has to rewrite VERSION rather than hunt for version
 * strings across components — which is how the blog install commands silently
 * went stale at 3.1.0.
 */
export const VERSION = "3.2.1";
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

/** Published alongside the binaries by scripts/release.sh. */
export const CHECKSUMS_URL = `${BASE}/SHA256SUMS`;

/**
 * Only x86_64 is built — linux.target in linux/package.json specifies no arch,
 * so electron-builder produces x64 alone. The install guide checks for this
 * rather than handing an ARM user a package that cannot run.
 */
export const SUPPORTED_ARCH = "x86_64";

/**
 * Published releases, v2.0.6 through the current tag. Hardcoded for the same
 * reason DOWNLOADS is, and refreshed by the same script — see below.
 */
export const RELEASE_COUNT = 11;

/**
 * GitHub release asset download counts.
 *
 * Hardcoded deliberately: the site never calls api.github.com at build or
 * request time — the same rule lib/changelog.ts:18 documents. Because baked-in
 * numbers rot, scripts/release.sh rewrites this block through
 * scripts/refresh-release-counts.mjs after every upload. Run that script by hand
 * to refresh between releases; editing the values here directly also works, but
 * the next release overwrites them.
 *
 * Packages only. The SHA256SUMS downloads are excluded, because fetching a
 * checksum is not an install. The counts still include bots, mirrors and
 * repeat downloads, so they are a ceiling on real installs, not a user count.
 */
export const DOWNLOADS = {
  /** Bump whenever the counts below are refreshed. */
  measuredOn: "2026-09-24",
  total: 97,
  /** Ordered by count, so the line reads as a ranking. */
  byFormat: [
    { label: ".deb", count: 50 },
    { label: "AppImage", count: 32 },
    { label: ".rpm", count: 15 },
  ],
} as const;
