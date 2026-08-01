import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteNav } from "@/components/site-nav";
import { Footer } from "@/components/sections/footer";
import { ArticleShell } from "@/components/blog/article-shell";
import { POSTS, POST_CONTENT, getPost } from "@/lib/posts";

type Params = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return POSTS.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return {};

  const url = `https://clipmer.app/blog/${post.slug}`;
  const title = post.seoTitle ?? post.title;

  return {
    title: `${title} — Clipmer`,
    description: post.description,
    keywords: post.tags,
    // `types` must be repeated here: per-page `alternates` replaces the root
    // layout's rather than merging, and a post page is exactly where a feed
    // reader looks for autodiscovery.
    alternates: {
      canonical: url,
      types: { "application/rss+xml": "https://clipmer.app/blog/rss.xml" },
    },
    openGraph: {
      type: "article",
      url,
      siteName: "Clipmer",
      title,
      description: post.description,
      publishedTime: post.date,
      modifiedTime: post.updated ?? post.date,
      tags: post.tags,
      // Declaring `openGraph` here REPLACES the root layout's resolved value
      // wholesale, which drops the app/opengraph-image.tsx file convention. The
      // image has to be named explicitly or the page ships a large-image card
      // with no image at all.
      images: [{ url: "/opengraph-image", width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: post.description,
    },
  };
}

export default async function PostPage({ params }: Params) {
  const { slug } = await params;
  const post = getPost(slug);
  const load = POST_CONTENT[slug];
  if (!post || !load) notFound();

  const { default: Content } = await load();

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.seoTitle ?? post.title,
    description: post.description,
    datePublished: post.date,
    dateModified: post.updated ?? post.date,
    author: { "@type": "Organization", name: "Clipmer" },
    publisher: { "@type": "Organization", name: "Clipmer" },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `https://clipmer.app/blog/${post.slug}`,
    },
    keywords: post.tags.join(", "),
  };

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <SiteNav />
      <main className="flex-1">
        <ArticleShell post={post}>
          <Content />
        </ArticleShell>
      </main>
      <Footer />
    </div>
  );
}
