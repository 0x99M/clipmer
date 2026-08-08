import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteNav } from "@/components/site-nav";
import { Footer } from "@/components/sections/footer";
import { ArticleShell } from "@/components/blog/article-shell";
import { POSTS, POST_CONTENT, getPost } from "@/lib/posts";
import { ALTERNATE_TYPES, AUTHOR, OG_BASE, SITE, canonical } from "@/lib/seo";

type Params = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return POSTS.map((post) => ({ slug: post.slug }));
}

// POSTS is a compile-time array and adding a post already requires a rebuild,
// so an unknown slug can 404 at the routing layer instead of rendering the
// page and generateMetadata for nothing.
export const dynamicParams = false;

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return {};

  const url = canonical(`/blog/${post.slug}`);
  const title = post.seoTitle ?? post.title;

  return {
    title: `${title} — Clipmer`,
    description: post.metaDescription ?? post.description,
    keywords: post.tags,
    // `types` must be repeated here: per-page `alternates` replaces the root
    // layout's rather than merging, and a post page is exactly where a feed
    // reader looks for autodiscovery.
    alternates: {
      canonical: url,
      types: ALTERNATE_TYPES,
    },
    openGraph: {
      ...OG_BASE,
      type: "article",
      url,
      title,
      description: post.description,
      publishedTime: post.date,
      modifiedTime: post.updated ?? post.date,
      tags: post.tags,
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

  const url = canonical(`/blog/${post.slug}`);

  // BlogPosting rather than Article: same rich-result eligibility, and Google's
  // guidance is to use the most specific applicable type. The author is a Person
  // matching the byline ArticleShell renders — marked-up authorship that
  // describes nothing visible on the page is the weaker signal.
  const schema = [
    {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      "@id": `${url}#article`,
      headline: post.seoTitle ?? post.title,
      description: post.description,
      image: [canonical("/opengraph-image")],
      datePublished: post.date,
      dateModified: post.updated ?? post.date,
      author: { "@type": "Person", name: AUTHOR.name, url: AUTHOR.url },
      publisher: { "@type": "Organization", name: "Clipmer", url: SITE },
      mainEntityOfPage: { "@type": "WebPage", "@id": url },
      keywords: post.tags.join(", "),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE },
        { "@type": "ListItem", position: 2, name: "Blog", item: canonical("/blog") },
        { "@type": "ListItem", position: 3, name: post.title, item: url },
      ],
    },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
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
