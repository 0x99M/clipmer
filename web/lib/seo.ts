// Next merges metadata SHALLOWLY down the segment tree: a page that sets
// `alternates` or `openGraph` REPLACES the parent's whole object rather than
// merging into it (next/dist/docs/.../generate-metadata.md, "Merging"). Two
// consequences, both of which had already bitten this site:
//
//   - A canonical in the ROOT layout is inherited by every page that doesn't
//     set its own, so /pro, /privacy, /terms, /refund, /contact and /thank-you
//     all told Google they were the homepage. Canonicals now live per-page and
//     never in a shared parent — a page that forgets emits none, and Google
//     self-canonicalizes, which is strictly safer than emitting a wrong one.
//
//   - /install declared its own `openGraph` and silently lost og:image and
//     og:site_name along with it. Anything a page needs to keep while
//     overriding one nested field has to be spread back in, which is what
//     these constants are for.

export const SITE = "https://clipmer.app";

/** Resolve a route to its absolute canonical URL. */
export function canonical(path = ""): string {
  return path ? `${SITE}${path}` : SITE;
}

/**
 * rel="alternate" entries every page should carry. Spread into `alternates`
 * alongside a page's own `canonical`, or the feed link disappears from that
 * page's head.
 */
export const ALTERNATE_TYPES = {
  "application/rss+xml": `${SITE}/blog/rss.xml`,
};

/**
 * The generated card from app/opengraph-image.tsx. Next injects this
 * automatically only while a segment leaves `openGraph.images` alone, so any
 * page that declares `openGraph` has to name it explicitly.
 */
export const OG_IMAGE = [{ url: "/opengraph-image", width: 1200, height: 630 }];

/**
 * Site-wide OpenGraph fields that are not page-specific. Spread first, then
 * override `url`, `title` and `description` per page:
 *
 *   openGraph: { ...OG_BASE, url: canonical("/pro"), title: "…" }
 */
export const OG_BASE = {
  type: "website",
  locale: "en_US",
  siteName: "Clipmer",
  images: OG_IMAGE,
} as const;
