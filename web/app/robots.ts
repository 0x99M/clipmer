import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    // The feed is a second discovery lane: it lists only recent posts, which is
    // exactly what makes it useful to Google as a freshness signal.
    sitemap: [
      "https://clipmer.app/sitemap.xml",
      "https://clipmer.app/blog/rss.xml",
    ],
  };
}
