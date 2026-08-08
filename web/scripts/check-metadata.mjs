#!/usr/bin/env node
// Walks every URL in sitemap.xml and asserts the metadata invariants that this
// site has already broken once each.
//
// Next merges metadata shallowly across segments: a page that declares
// `alternates`, `openGraph` or `twitter` REPLACES the parent's whole object and
// silently loses every sibling key it did not repeat. That is one bug shape
// with several faces — a canonical inherited from the root layout pointed six
// routes at the homepage, and /install declaring its own openGraph dropped
// og:image and og:site_name. Both shipped unnoticed. The sitemap is small
// enough that checking all of it costs nothing.
//
//   node scripts/check-metadata.mjs [origin]
//
// Defaults to http://localhost:3000. Pass https://clipmer.app to check live.
// Exits non-zero on any failure, so it can gate a release.

const origin = (process.argv[2] || "http://localhost:3000").replace(/\/$/, "");

const LIMITS = { title: 63, description: 158 };

const pick = (html, re) => (html.match(re) || [null, null])[1];

const rules = [
  {
    name: "self-canonical",
    check(html, url) {
      const canonical = pick(html, /<link rel="canonical" href="([^"]*)"/);
      const robots = pick(html, /<meta name="robots" content="([^"]*)"/) || "";
      // A noindex page is allowed to omit its canonical — emitting one that
      // points elsewhere is the conflicting signal we are guarding against.
      if (!canonical) return robots.includes("noindex") ? null : "no canonical";
      return canonical === url ? null : `canonical is ${canonical}`;
    },
  },
  {
    name: "og:image",
    check(html) {
      return /<meta property="og:image"/.test(html) ? null : "missing og:image";
    },
  },
  {
    name: "og:site_name",
    check(html) {
      return /<meta property="og:site_name"/.test(html)
        ? null
        : "missing og:site_name";
    },
  },
  {
    name: "title length",
    check(html) {
      const title = pick(html, /<title>([^<]*)<\/title>/);
      if (!title) return "no <title>";
      return title.length <= LIMITS.title
        ? null
        : `${title.length} chars (max ${LIMITS.title})`;
    },
  },
  {
    name: "description length",
    check(html) {
      const description = pick(html, /<meta name="description" content="([^"]*)"/);
      if (!description) return "no meta description";
      return description.length <= LIMITS.description
        ? null
        : `${description.length} chars (max ${LIMITS.description})`;
    },
  },
  {
    name: "app schema is homepage-only",
    check(html, url) {
      const hasAppSchema = /"@type":\s*"SoftwareApplication"/.test(html);
      const isHome = new URL(url).pathname === "/";
      if (hasAppSchema && !isHome) return "SoftwareApplication off the homepage";
      if (!hasAppSchema && isHome) return "homepage lost its SoftwareApplication";
      return null;
    },
  },
];

// The rules above only see URLs the sitemap lists, so a new route that nobody
// added to sitemap.ts would pass by being invisible. Walk app/ for page files
// and assert every indexable route is actually in there.
async function routesOnDisk() {
  const { readdir } = await import("node:fs/promises");
  const { join, relative } = await import("node:path");
  const root = new URL("../app", import.meta.url).pathname;

  const found = [];
  async function walk(dir) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        // Route groups and private folders produce no URL of their own.
        if (entry.name.startsWith("_") || entry.name.startsWith("@")) continue;
        await walk(full);
      } else if (entry.name === "page.tsx" || entry.name === "page.js") {
        const segments = relative(root, dir).split("/").filter(Boolean);
        // Dynamic segments are enumerated by generateStaticParams, not here.
        if (segments.some((s) => s.startsWith("[") || s.startsWith("("))) continue;
        found.push("/" + segments.join("/"));
      }
    }
  }
  await walk(root);
  return found;
}

async function main() {
  const res = await fetch(`${origin}/sitemap.xml`);
  if (!res.ok) {
    console.error(`could not read ${origin}/sitemap.xml — ${res.status}`);
    process.exit(1);
  }
  const urls = [...(await res.text()).matchAll(/<loc>([^<]*)<\/loc>/g)].map(
    (m) => m[1]
  );
  if (urls.length === 0) {
    console.error("sitemap listed no URLs");
    process.exit(1);
  }

  let failures = 0;

  for (const sitemapUrl of urls) {
    // The sitemap states production URLs; fetch the same path from `origin` so
    // this works against a local build.
    const path = new URL(sitemapUrl).pathname;
    const pageRes = await fetch(`${origin}${path}`);
    const html = await pageRes.text();

    const problems = [];
    if (!pageRes.ok) problems.push(`HTTP ${pageRes.status}`);
    for (const rule of rules) {
      const problem = rule.check(html, sitemapUrl);
      if (problem) problems.push(`${rule.name}: ${problem}`);
    }

    if (problems.length === 0) {
      console.log(`  ok   ${path}`);
    } else {
      failures += problems.length;
      console.log(`  FAIL ${path}`);
      for (const problem of problems) console.log(`         ${problem}`);
    }
  }

  // Coverage: a route that exists but is not in the sitemap would otherwise
  // never be checked at all.
  const listed = new Set(urls.map((u) => new URL(u).pathname.replace(/\/$/, "") || "/"));
  const missing = [];
  for (const route of await routesOnDisk()) {
    if (listed.has(route)) continue;
    const pageRes = await fetch(`${origin}${route}`);
    const html = await pageRes.text();
    // Intentionally-excluded pages say so with noindex; anything else is a gap.
    const robots = pick(html, /<meta name="robots" content="([^"]*)"/) || "";
    if (!robots.includes("noindex")) missing.push(route);
  }
  if (missing.length > 0) {
    failures += missing.length;
    console.log(`  FAIL sitemap coverage`);
    for (const route of missing) {
      console.log(`         ${route} is indexable but missing from sitemap.ts`);
    }
  }

  console.log(
    failures === 0
      ? `\n${urls.length} URLs checked, all clean.`
      : `\n${failures} problem(s) across ${urls.length} URLs.`
  );
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
