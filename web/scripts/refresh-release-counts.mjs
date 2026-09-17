#!/usr/bin/env node
/**
 * Rewrites the hardcoded release numbers in lib/release.ts from the GitHub API.
 *
 * The site never calls api.github.com at build or request time — the rule
 * lib/changelog.ts documents — so these numbers are baked in, and baked-in
 * numbers rot. scripts/release.sh runs this after uploading, so the release
 * being shipped is counted, and the homepage band cannot quietly drift into
 * claiming a figure nobody has checked in six months.
 *
 * Never fails the release: on any error it warns, leaves the file untouched,
 * and exits 0.
 */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const REPO = process.env.GITHUB_REPO || "0x99M/clipmer";
const FILE = join(dirname(fileURLToPath(import.meta.url)), "..", "lib", "release.ts");

const warn = (msg) => {
  console.warn(`WARNING: release counts not refreshed — ${msg}`);
  process.exit(0);
};

// One JSON object per line rather than `--paginate --slurp`, which only exists
// in newer gh (2.46 rejects it) — --jq streams each element on every version.
let releases;
try {
  const stdout = execFileSync(
    "gh",
    [
      "api",
      `repos/${REPO}/releases`,
      "--paginate",
      "--jq",
      ".[] | {tag: .tag_name, assets: [.assets[] | {name, download_count}]}",
    ],
    { encoding: "utf8", timeout: 60_000 }
  );
  releases = stdout
    .split("\n")
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line));
} catch (err) {
  warn(`could not read the releases API (${err.message.split("\n")[0]})`);
}

if (!Array.isArray(releases) || releases.length === 0) warn("the API returned no releases");

// Packages only. A SHA256SUMS fetch is a verification, not an install.
const SUFFIX = { ".deb": ".deb", AppImage: ".AppImage", ".rpm": ".rpm" };
const counts = Object.fromEntries(Object.keys(SUFFIX).map((k) => [k, 0]));
for (const release of releases) {
  for (const asset of release.assets ?? []) {
    for (const [label, suffix] of Object.entries(SUFFIX)) {
      if (asset.name.endsWith(suffix)) counts[label] += asset.download_count;
    }
  }
}
const total = Object.values(counts).reduce((a, b) => a + b, 0);
if (total === 0) warn("every asset reported zero downloads, which is not plausible");

// Ordered by count, so the rendered line reads as a ranking.
const byFormat = Object.entries(counts).sort((a, b) => b[1] - a[1]);
const today = new Date().toISOString().slice(0, 10);

const before = readFileSync(FILE, "utf8");
let after = before
  .replace(/export const RELEASE_COUNT = \d+;/, `export const RELEASE_COUNT = ${releases.length};`)
  .replace(/(measuredOn: )"[\d-]+"/, `$1"${today}"`)
  .replace(/(\n  total: )\d+/, `$1${total}`)
  .replace(
    /(byFormat: \[)[\s\S]*?(\n  \],)/,
    `$1\n${byFormat.map(([l, c]) => `    { label: "${l}", count: ${c} },`).join("\n")}$2`
  );

if (after === before) {
  console.log(`Release counts already current: ${total} downloads, ${releases.length} releases.`);
  process.exit(0);
}
writeFileSync(FILE, after);
console.log(
  `Release counts refreshed: ${total} downloads ` +
    `(${byFormat.map(([l, c]) => `${l} ${c}`).join(", ")}), ` +
    `${releases.length} releases, measured ${today}.`
);
