import { SORTED_POSTS } from "@/lib/posts";

const SITE = "https://clipmer.app";

// The feed depends only on lib/posts.ts, so it can be baked at build time
// rather than re-rendered per request.
export const dynamic = "force-static";

/** Minimal, correct XML text escaping — no `feed` dependency needed. */
function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET() {
  const items = SORTED_POSTS.map((post) => {
    const url = `${SITE}/blog/${post.slug}`;
    return `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <description>${escapeXml(post.description)}</description>
      <pubDate>${new Date(`${post.date}T00:00:00Z`).toUTCString()}</pubDate>
${post.tags.map((t) => `      <category>${escapeXml(t)}</category>`).join("\n")}
    </item>`;
  }).join("\n");

  const latest = SORTED_POSTS[0];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Clipmer Blog</title>
    <link>${SITE}/blog</link>
    <description>How the Linux clipboard actually works, and how to keep secrets out of it.</description>
    <language>en-us</language>
    <atom:link href="${SITE}/blog/rss.xml" rel="self" type="application/rss+xml" />
${latest ? `    <lastBuildDate>${new Date(`${latest.date}T00:00:00Z`).toUTCString()}</lastBuildDate>\n` : ""}${items}
  </channel>
</rss>
`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
