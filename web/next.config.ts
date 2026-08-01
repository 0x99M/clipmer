import type { NextConfig } from "next";
import createMDX from "@next/mdx";

const nextConfig: NextConfig = {
  // Blog prose lives in content/blog/*.mdx and is imported by
  // app/blog/[slug]/page.tsx, so .mdx never needs to act as a route itself.
  // The extensions are registered anyway to match the documented @next/mdx
  // setup — Next only scans app/ for pages, so this adds no routes.
  pageExtensions: ["js", "jsx", "ts", "tsx", "md", "mdx"],
};

// No remark/rehype plugins: Turbopack can only accept plugins as strings, and
// the one we'd otherwise want (remark-gfm, for tables) is avoidable —
// comparison tables are React components, which also get proper horizontal
// overflow on mobile.
const withMDX = createMDX({});

export default withMDX(nextConfig);
