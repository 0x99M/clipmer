import type { NextConfig } from "next";
import createMDX from "@next/mdx";

const nextConfig: NextConfig = {
  // Blog prose lives in content/blog/*.mdx and is imported by
  // app/blog/[slug]/page.tsx, so .mdx never needs to act as a route itself.
  // The extensions are registered anyway to match the documented @next/mdx
  // setup — Next only scans app/ for pages, so this adds no routes.
  pageExtensions: ["js", "jsx", "ts", "tsx", "md", "mdx"],

  // Version skew protection. A deploy replaces the whole build, so a tab that
  // loaded the previous one keeps asking for /_next/static chunks and prefetch
  // payloads that no longer exist, and its next client-side navigation fails.
  // With a deploymentId set, Next stamps assets with ?dpl= and compares the
  // client's id against the server's on navigation — a mismatch becomes a full
  // page reload instead of a broken link. Railway exposes
  // RAILWAY_GIT_COMMIT_SHA with the same value at build and at runtime, so the
  // assets and the server agree on the id. Undefined locally, which simply
  // leaves the feature off.
  deploymentId: process.env.RAILWAY_GIT_COMMIT_SHA,
};

// No remark/rehype plugins: Turbopack can only accept plugins as strings, and
// the one we'd otherwise want (remark-gfm, for tables) is avoidable —
// comparison tables are React components, which also get proper horizontal
// overflow on mobile.
const withMDX = createMDX({});

export default withMDX(nextConfig);
