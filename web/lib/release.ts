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

/** Published alongside the binaries by scripts/release.sh. */
export const CHECKSUMS_URL = `${BASE}/SHA256SUMS`;

/**
 * Only x86_64 is built — linux.target in linux/package.json specifies no arch,
 * so electron-builder produces x64 alone. The install guide checks for this
 * rather than handing an ARM user a package that cannot run.
 */
export const SUPPORTED_ARCH = "x86_64";

/**
 * Published releases, v2.0.6 through the current tag. Counted on 2026-09-12
 * with `gh api repos/0x99M/clipmer/releases --jq '.[].tag_name' | wc -l`.
 * Hardcoded for the same reason DOWNLOADS is — bump it when cutting a release.
 */
export const RELEASE_COUNT = 10;

/**
 * GitHub release asset download counts, read on 2026-09-12 with
 * `gh api repos/0x99M/clipmer/releases --paginate --jq '.[].assets[]'`.
 *
 * Hardcoded deliberately: the site never calls api.github.com at build or
 * request time — the same rule lib/changelog.ts:18 documents — so these do not
 * self-update. Re-run that command and edit the numbers when cutting a release.
 *
 * Packages only. The SHA256SUMS downloads are excluded, because fetching a
 * checksum is not an install. The counts still include bots, mirrors and
 * repeat downloads, so they are a ceiling on real installs, not a user count.
 */
export const DOWNLOADS = {
  /** Bump whenever the counts below are refreshed. */
  measuredOn: "2026-09-12",
  total: 90,
  /** Ordered by count, so the line reads as a ranking. */
  byFormat: [
    { label: ".deb", count: 46 },
    { label: "AppImage", count: 30 },
    { label: ".rpm", count: 14 },
  ],
} as const;
