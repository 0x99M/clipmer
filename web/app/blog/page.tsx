import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Clock, Rss } from "lucide-react";
import { SiteNav } from "@/components/site-nav";
import { Footer } from "@/components/sections/footer";
import { Badge } from "@/components/ui/badge";
import { SORTED_POSTS, formatPostDate } from "@/lib/posts";
import { ALTERNATE_TYPES, OG_BASE, canonical } from "@/lib/seo";

// "Blog — Clipmer" targeted a query nobody issues. This is the one page that
// distributes crawl priority to the posts, so it names the subject instead.
const TITLE = "Linux Clipboard Guides — Clipmer Blog";
const DESCRIPTION =
  "How the Linux clipboard actually works: clipboard managers on Wayland, clipboard history on Ubuntu, and keeping secrets out of what you copy.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: {
    canonical: canonical("/blog"),
    types: ALTERNATE_TYPES,
  },
  openGraph: {
    ...OG_BASE,
    url: canonical("/blog"),
    title: TITLE,
    description: DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
};

export default function BlogIndex() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <SiteNav />

      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-14 sm:py-20">
        <div className="flex items-start justify-between gap-6">
          <div>
            <h1 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">
              Linux clipboard guides
            </h1>
            <p className="mt-3 text-lg leading-relaxed text-muted-foreground">
              How the Linux clipboard actually works, and how to keep secrets out of
              it.
            </p>
            <p className="mt-4 leading-relaxed text-muted-foreground">
              Wayland deliberately forbids the one thing a clipboard manager needs to
              do, which is why{" "}
              <Link
                href="/blog/clipboard-managers-on-wayland"
                className="text-orange hover:underline"
              >
                clipboard history on Wayland is genuinely hard
              </Link>{" "}
              and why GNOME still ships none of it. If you just want something that
              works today,{" "}
              <Link
                href="/blog/clipboard-history-ubuntu"
                className="text-orange hover:underline"
              >
                five clipboard managers for Ubuntu
              </Link>{" "}
              covers the real install commands for each. We also{" "}
              <Link
                href="/blog/auditing-our-own-clipboard-manager"
                className="text-orange hover:underline"
              >
                publish our own security audits
              </Link>
              , including the ones that found bugs in Clipmer itself.
            </p>
            <p className="mt-4 leading-relaxed text-muted-foreground">
              Clipmer is the clipboard manager we build.{" "}
              <Link href="/install" className="text-orange hover:underline">
                Install it on Linux
              </Link>{" "}
              in one command.
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
            /* The whole card used to be one <Link>, which made each post's only
               inbound anchor text a ~60-word blob. The link now wraps the title
               and a stretched overlay restores whole-card clicking. */
            <article
              key={post.slug}
              className="group relative rounded-xl border border-border bg-card/40 p-6 transition-colors hover:border-orange/40 hover:bg-surface/40"
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
                <Link
                  href={`/blog/${post.slug}`}
                  className="after:absolute after:inset-0 after:content-['']"
                >
                  {post.title}
                </Link>
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
            </article>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  );
}
