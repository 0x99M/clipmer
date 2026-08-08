import type { MetadataRoute } from "next";
import { SORTED_POSTS } from "@/lib/posts";
import { CHANGELOG } from "@/lib/changelog";
import { SITE } from "@/lib/seo";

/**
 * Every static URL used to share one `new Date()`, so all nine reported the
 * build time and were re-stamped on every deploy — /privacy claimed to have
 * changed 104 days after it actually had. Google uses lastmod only while it is
 * "consistently and verifiably accurate" and discounts it site-wide otherwise,
 * which would also poison the post dates that are correct.
 *
 * So: the dates that genuinely move are derived from data the release process
 * already updates, and the rest are stated outright. Bump one when you change
 * that page's content — not when you touch its metadata.
 */
const LATEST_RELEASE = CHANGELOG[0].date;
const LATEST_POST = SORTED_POSTS[0].updated ?? SORTED_POSTS[0].date;

const STATIC_PAGES = [
  { path: "", lastModified: "2026-08-08", changeFrequency: "monthly", priority: 1 },
  { path: "/install", lastModified: LATEST_RELEASE, changeFrequency: "monthly", priority: 0.9 },
  { path: "/pro", lastModified: "2026-08-08", changeFrequency: "monthly", priority: 0.9 },
  { path: "/blog", lastModified: LATEST_POST, changeFrequency: "weekly", priority: 0.8 },
  { path: "/changelog", lastModified: LATEST_RELEASE, changeFrequency: "monthly", priority: 0.6 },
  { path: "/privacy", lastModified: "2026-04-25", changeFrequency: "yearly", priority: 0.3 },
  { path: "/terms", lastModified: "2026-08-01", changeFrequency: "yearly", priority: 0.3 },
  { path: "/refund", lastModified: "2026-08-01", changeFrequency: "yearly", priority: 0.3 },
  { path: "/contact", lastModified: "2026-08-01", changeFrequency: "yearly", priority: 0.3 },
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPages: MetadataRoute.Sitemap = STATIC_PAGES.map((page) => ({
    url: `${SITE}${page.path}`,
    lastModified: page.lastModified,
    changeFrequency: page.changeFrequency,
    priority: page.priority,
  }));

  const posts: MetadataRoute.Sitemap = SORTED_POSTS.map((post) => ({
    url: `${SITE}/blog/${post.slug}`,
    lastModified: post.updated ?? post.date,
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  return [...staticPages, ...posts];
}
