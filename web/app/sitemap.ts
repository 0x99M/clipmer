import type { MetadataRoute } from "next";
import { SORTED_POSTS } from "@/lib/posts";

const SITE = "https://clipmer.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    { url: SITE, lastModified: now, changeFrequency: "monthly", priority: 1 },
    {
      url: `${SITE}/pro`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${SITE}/blog`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${SITE}/changelog`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    ...["privacy", "terms", "refund", "contact"].map((path) => ({
      url: `${SITE}/${path}`,
      lastModified: now,
      changeFrequency: "yearly" as const,
      priority: 0.3,
    })),
  ];

  const posts: MetadataRoute.Sitemap = SORTED_POSTS.map((post) => ({
    url: `${SITE}/blog/${post.slug}`,
    lastModified: new Date(`${post.updated ?? post.date}T00:00:00Z`),
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  return [...staticPages, ...posts];
}
