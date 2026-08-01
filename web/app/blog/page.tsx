import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Clock, Rss } from "lucide-react";
import { SiteNav } from "@/components/site-nav";
import { Footer } from "@/components/sections/footer";
import { Badge } from "@/components/ui/badge";
import { SORTED_POSTS, formatPostDate } from "@/lib/posts";

export const metadata: Metadata = {
  title: "Blog — Clipmer",
  description:
    "Technical writing on clipboard managers, the Wayland clipboard security model, and keeping secrets out of your clipboard on Linux.",
  alternates: {
    canonical: "https://clipmer.app/blog",
    types: { "application/rss+xml": "https://clipmer.app/blog/rss.xml" },
  },
  openGraph: {
    type: "website",
    url: "https://clipmer.app/blog",
    siteName: "Clipmer",
    title: "Blog — Clipmer",
    description:
      "Technical writing on clipboard managers, the Wayland clipboard security model, and keeping secrets out of your clipboard on Linux.",
    // Declaring `openGraph` replaces the root layout's resolved value, which
    // drops the app/opengraph-image.tsx file convention — name it explicitly.
    images: [{ url: "/opengraph-image", width: 1200, height: 630 }],
  },
  // Likewise `twitter`: without this the root layout's homepage title and
  // description are inherited and contradict the og: tags on this page.
  twitter: {
    card: "summary_large_image",
    title: "Blog — Clipmer",
    description:
      "Technical writing on clipboard managers, the Wayland clipboard security model, and keeping secrets out of your clipboard on Linux.",
  },
};

export default function BlogIndex() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <SiteNav />

      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-14 sm:py-20">
        <div className="flex items-start justify-between gap-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Blog</h1>
            <p className="mt-3 text-lg text-muted-foreground">
              How the Linux clipboard actually works, and how to keep secrets out of
              it.
            </p>
          </div>
          <a
            href="/blog/rss.xml"
            className="mt-2 inline-flex shrink-0 items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-orange"
          >
            <Rss className="size-4" />
            RSS
          </a>
        </div>

        <div className="mt-12 space-y-4">
          {SORTED_POSTS.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="group block rounded-xl border border-border bg-card/40 p-6 transition-colors hover:border-orange/40 hover:bg-surface/40"
            >
              <div className="flex flex-wrap items-center gap-2">
                {post.tags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="outline"
                    className="border-orange/30 bg-orange/10 text-orange"
                  >
                    {tag}
                  </Badge>
                ))}
              </div>

              <h2 className="mt-3 text-xl font-semibold leading-snug tracking-tight transition-colors group-hover:text-orange">
                {post.title}
              </h2>

              <p className="mt-2 line-clamp-3 leading-relaxed text-muted-foreground">
                {post.description}
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                <time dateTime={post.date}>{formatPostDate(post.date)}</time>
                <span aria-hidden>&middot;</span>
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="size-3.5" />
                  {post.readingMinutes} min read
                </span>
                <span className="ml-auto inline-flex items-center gap-1 text-orange opacity-0 transition-opacity group-hover:opacity-100">
                  Read
                  <ArrowRight className="size-3.5" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  );
}
