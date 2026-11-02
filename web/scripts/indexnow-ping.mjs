#!/usr/bin/env node
/**
 * Tells Bing, DuckDuckGo and Yandex which URLs changed, via IndexNow.
 *
 * Google ignores IndexNow, so this never moves the Search Console numbers in
 * SEO.md and must not be credited or blamed for them. What it does is cut the
 * weeks-long gap between a push and Bing noticing — and DuckDuckGo, which this
 * audience over-uses, is Bing-sourced.
 *
 *   node scripts/indexnow-ping.mjs [--wait] [--since <days>] [--dry-run] [url ...]
 *
 *   --wait          poll https://clipmer.app/api/health every 10 s (up to 10 min)
 *                   until the serving commit is the one checked out here, so the
 *                   crawl that follows sees the new build, not the old one
 *   --since <days>  submit every sitemap URL whose <lastmod> is within the last
 *                   N days (default 7) — which is why sitemap.ts keeps lastmod
 *                   honest; a stale date here means a page never gets pinged
 *   --dry-run       print the request instead of sending it
 *   url ...         submit exactly these instead of reading the sitemap; a bare
 *                   path like /pro is expanded against the site
 *
 * The key is discovered from public/<key>.txt — the one hex-named text file
 * there — never hard-coded, so rotating it is "replace the file". Built-in
 * fetch only (Node ≥ 20), no packages.
 *
 * Never fails a release: every outcome is printed and the exit code is 0.
 */
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const SITE = "https://clipmer.app";
const HOST = new URL(SITE).host;
const ENDPOINT = "https://api.indexnow.org/indexnow";
const HEALTH = `${SITE}/api/health`;
const SITEMAP = `${SITE}/sitemap.xml`;

const WAIT_INTERVAL_MS = 10_000;
const WAIT_LIMIT_MS = 10 * 60_000;

const here = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = join(here, "..", "public");

const warn = (msg) => console.log(`  warn ${msg}`);

// --- arguments -------------------------------------------------------------

const args = process.argv.slice(2);
let wait = false;
let dryRun = false;
let since = 7;
const explicit = [];

for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === "--wait") wait = true;
  else if (a === "--dry-run") dryRun = true;
  else if (a === "--since") {
    since = Number(args[++i]);
    if (!Number.isInteger(since) || since < 0) {
      warn(`--since wants a whole number of days, got ${JSON.stringify(args[i])}`);
      process.exit(0);
    }
  } else if (a.startsWith("--")) {
    warn(`unknown flag ${a}`);
    process.exit(0);
  } else {
    explicit.push(a.startsWith("/") ? `${SITE}${a}` : a);
  }
}

// --- key -------------------------------------------------------------------

/** The single hex-named .txt in public/, or null with a warning. */
export function findKey(publicDir = PUBLIC_DIR) {
  const candidates = readdirSync(publicDir).filter((name) =>
    /^[0-9a-f]{8,128}\.txt$/.test(name)
  );
  if (candidates.length !== 1) {
    warn(
      candidates.length === 0
        ? `no IndexNow key file in ${publicDir} (expected one <hex>.txt)`
        : `more than one key file in ${publicDir}: ${candidates.join(", ")}`
    );
    return null;
  }
  const key = candidates[0].replace(/\.txt$/, "");
  const body = readFileSync(join(publicDir, candidates[0]), "utf8").trim();
  if (body !== key) {
    warn(`${candidates[0]} does not contain its own key`);
    return null;
  }
  return key;
}

// --- deploy wait -----------------------------------------------------------

function headCommit() {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: here,
      encoding: "utf8",
    }).trim();
  } catch {
    return null;
  }
}

/** True once /api/health reports the commit checked out here. */
async function waitForDeploy() {
  const head = headCommit();
  if (!head) {
    warn("cannot read git HEAD, so --wait has nothing to compare against");
    return false;
  }
  const started = Date.now();
  let lastSeen = null;
  while (Date.now() - started < WAIT_LIMIT_MS) {
    try {
      const res = await fetch(HEALTH, { cache: "no-store" });
      const { commit } = await res.json();
      lastSeen = commit;
      if (typeof commit === "string" && commit.length > 0 && head.startsWith(commit)) {
        console.log(`  live ${commit} is HEAD (${head.slice(0, 7)})`);
        return true;
      }
    } catch (err) {
      lastSeen = `error: ${err.message}`;
    }
    process.stdout.write(`  wait serving ${lastSeen ?? "?"}, want ${head.slice(0, 7)}\n`);
    await new Promise((r) => setTimeout(r, WAIT_INTERVAL_MS));
  }
  warn(
    `gave up after ${WAIT_LIMIT_MS / 60_000} min: live is ${lastSeen ?? "?"}, HEAD is ${head.slice(0, 7)}`
  );
  return false;
}

// --- url selection ---------------------------------------------------------

/** [{ url, lastmod }] from a sitemap body, in document order. */
export function parseSitemap(xml) {
  const entries = [];
  for (const [, block] of xml.matchAll(/<url>([\s\S]*?)<\/url>/g)) {
    const loc = (block.match(/<loc>([^<]*)<\/loc>/) || [])[1];
    const lastmod = (block.match(/<lastmod>([^<]*)<\/lastmod>/) || [])[1];
    if (loc) entries.push({ url: loc.trim(), lastmod: lastmod?.trim() ?? null });
  }
  return entries;
}

/** URLs whose lastmod falls within the last `days` days (today inclusive). */
export function recentUrls(entries, days, now = new Date()) {
  const cutoff = new Date(now);
  cutoff.setUTCHours(0, 0, 0, 0);
  cutoff.setUTCDate(cutoff.getUTCDate() - days);
  return entries
    .filter(({ lastmod }) => {
      if (!lastmod) return false;
      const date = new Date(lastmod);
      return !Number.isNaN(date.getTime()) && date >= cutoff;
    })
    .map(({ url }) => url);
}

async function selectUrls() {
  if (explicit.length > 0) return explicit;
  let xml;
  try {
    const res = await fetch(SITEMAP, { cache: "no-store" });
    if (!res.ok) {
      warn(`${SITEMAP} returned ${res.status}`);
      return [];
    }
    xml = await res.text();
  } catch (err) {
    warn(`could not fetch ${SITEMAP}: ${err.message}`);
    return [];
  }
  const entries = parseSitemap(xml);
  if (entries.length === 0) warn(`${SITEMAP} listed no URLs`);
  return recentUrls(entries, since);
}

// --- submit ----------------------------------------------------------------

const OUTCOMES = {
  200: "ok: URLs submitted",
  202: "accepted: URLs received, key validation pending",
  400: "bad request: the request format is invalid",
  403: "forbidden: key not found or key file does not contain it (is public/<key>.txt deployed?)",
  422: "unprocessable: URLs are not on this host, or the key does not match the schema",
  429: "too many requests: back off and retry later",
};

async function submit(key, urlList) {
  const payload = { host: HOST, key, urlList };
  if (dryRun) {
    console.log(`  dry  POST ${ENDPOINT}`);
    console.log(JSON.stringify(payload, null, 2));
    return;
  }
  let res;
  try {
    res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    warn(`could not reach ${ENDPOINT}: ${err.message}`);
    return;
  }
  const meaning = OUTCOMES[res.status] ?? "unexpected response";
  const line = `${res.status} ${meaning}`;
  if (res.status === 200 || res.status === 202) console.log(`  ${line}`);
  else warn(line);
}

// --- main ------------------------------------------------------------------

async function main() {
  const key = findKey();
  if (!key) return;

  if (wait && !(await waitForDeploy())) {
    warn("not submitting: the live build is not this commit. Re-run without --wait once it is.");
    return;
  }

  const urlList = await selectUrls();
  if (urlList.length === 0) {
    console.log(
      explicit.length > 0
        ? "  nothing to submit"
        : `  nothing changed in the last ${since} day(s) by sitemap lastmod — nothing to submit`
    );
    return;
  }

  console.log(`  ${urlList.length} URL(s):`);
  for (const url of urlList) console.log(`       ${url}`);
  await submit(key, urlList);
}

// Only run when executed directly, so the helpers can be imported in a test.
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main()
    .catch((err) => warn(err.message))
    .finally(() => process.exit(0));
}
