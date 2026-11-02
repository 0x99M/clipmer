import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, Clock, Download, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { SORTED_POSTS, formatPostDate, getPost, type Post } from "@/lib/posts";
import { AUTHOR } from "@/lib/seo";
import { cn } from "@/lib/utils";

/**
 * Tags carried by more than half of the posts (Clipboard, Linux at the time
 * of writing). Counted once: they say nothing about which posts belong
 * together, so the fallback heuristic below ignores them.
 */
const COMMON_TAGS: ReadonlySet<string> = (() => {
  const count = new Map<string, number>();
  for (const p of SORTED_POSTS) {
    for (const tag of p.tags) count.set(tag, (count.get(tag) ?? 0) + 1);
  }
  const half = SORTED_POSTS.length / 2;
  return new Set([...count].filter(([, n]) => n > half).map(([tag]) => tag));
})();

/**
 * The "Keep reading" picks for a post.
 *
 * Curated first: `post.related` is an editor-chosen list of slugs, in order.
 * An unknown slug throws, and because post pages are prerendered that turns
 * a typo into a failed `next build` rather than a shipped 404 link.
 *
 * Without a curated list, fall back to shared tags, but only the distinctive
 * ones. Nearly every post carries Clipboard and Linux, so counting those tied
 * almost every pair and let the date tiebreak funnel most links to the two
 * newest posts while several got none; the picks were also content-blind
 * (a KDE post pointing at a GNOME-only auto-paste guide). The fallback keeps
 * a post from being a dead end, but every post should get a curated list.
 */
function relatedTo(post: Post, limit = 3): Post[] {
  if (post.related) {
    return post.related.map((slug) => {
      const found = getPost(slug);
      if (!found) throw new Error(`related slug not found: ${slug}`);
      return found;
    });
  }
  const distinctive = post.tags.filter((t) => !COMMON_TAGS.has(t));
  const shared = (p: Post) =>
    p.tags.filter((t) => distinctive.includes(t)).length;
  return SORTED_POSTS.filter((p) => p.slug !== post.slug)
    .sort((a, b) => shared(b) - shared(a) || b.date.localeCompare(a.date))
    .slice(0, limit);
}

export function ArticleShell({
  post,
  children,
}: {
  post: Post;
  children: ReactNode;
}) {
  const related = relatedTo(post);

  return (
    <article className="mx-auto w-full max-w-2xl px-6 py-12 sm:py-16">
      <Link
        href="/blog"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        All posts
      </Link>

      <header className="mt-8">
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

        <h1 className="mt-4 text-balance text-3xl font-bold leading-[1.15] tracking-tight sm:text-4xl">
          {post.title}
        </h1>

        <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
          {post.description}
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border pt-5 text-sm text-muted-foreground">
          <span>
            by{" "}
            <a
              href={AUTHOR.url}
              rel="author noopener noreferrer"
              target="_blank"
              className="text-foreground/80 transition-colors hover:text-orange"
            >
              {AUTHOR.name}
            </a>
          </span>
          <span aria-hidden>&middot;</span>
          <time dateTime={post.date}>{formatPostDate(post.date)}</time>
          <span aria-hidden>&middot;</span>
          <span className="inline-flex items-center gap-1.5">
            <Clock className="size-3.5" />
            {post.readingMinutes} min read
          </span>
          {post.updated ? (
            <>
              <span aria-hidden>&middot;</span>
              <span>Updated {formatPostDate(post.updated)}</span>
            </>
          ) : null}
        </div>
      </header>

      {post.toc.length > 0 ? (
        <nav
          aria-label="On this page"
          className="mt-8 rounded-lg border border-border bg-surface/30 p-5"
        >
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            On this page
          </p>
          <ol className="mt-3 space-y-2">
            {post.toc.map((entry) => (
              <li key={entry.id}>
                <a
                  href={`#${entry.id}`}
                  className="text-sm text-foreground/80 transition-colors hover:text-orange"
                >
                  {entry.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>
      ) : null}

      <div className="mt-4">{children}</div>

      {related.length > 0 ? (
        <nav aria-label="Related posts" className="mt-14 border-t border-border pt-8">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Keep reading
          </h2>
          <ul className="mt-4 space-y-4">
            {related.map((other) => (
              <li key={other.slug}>
                <Link
                  href={`/blog/${other.slug}`}
                  className="group block text-balance font-semibold leading-snug tracking-tight transition-colors hover:text-orange"
                >
                  {other.title}
                </Link>
                <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                  {other.description}
                </p>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}

      <aside
        aria-label="About Clipmer"
        className="relative mt-16 overflow-hidden rounded-2xl border border-border bg-gradient-to-b from-surface/50 to-card/20 p-6 sm:p-8"
      >
        {/* Static bloom — rasterized once, nothing animates it. */}
        <div
          aria-hidden
          className="pointer-events-none absolute -right-20 -top-20 size-56 rounded-full bg-orange/[0.10] blur-3xl"
        />

        <div className="relative">
          {/* The product's actual hook, shown rather than described. Ten bullets,
              matching how the app masks an entry (linux/renderer/app.js). */}
          <div className="flex items-center gap-2.5 rounded-lg border border-orange/20 bg-orange/[0.05] px-3 py-2">
            <Lock aria-hidden className="size-3.5 shrink-0 text-orange" />
            <span className="font-mono text-sm tracking-[0.2em] text-orange">
              {"•".repeat(10)}
            </span>
            <span className="ml-auto shrink-0 rounded border border-border/70 bg-surface px-1.5 py-0.5 font-mono text-[0.6875rem] text-foreground/60">
              Stripe
            </span>
          </div>

          <h2 className="mt-5 text-balance text-xl font-bold leading-snug tracking-tight sm:text-[1.375rem]">
            Your clipboard is full of production secrets.
          </h2>

          <p className="mt-2.5 leading-relaxed text-muted-foreground">
            Clipmer masks entries before you screen-share, annotates them with notes,
            and files SSH commands and connection strings into folders. Runs entirely
            offline.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link
              href="/#download"
              className={cn(
                buttonVariants({ size: "lg" }),
                "gap-1.5 bg-orange text-white hover:bg-orange-hover"
              )}
            >
              <Download className="size-4" />
              Download for Linux
            </Link>
            <Link
              href="/pro"
              className={cn(
                buttonVariants({ variant: "ghost", size: "lg" }),
                "text-muted-foreground hover:text-foreground"
              )}
            >
              See Clipmer Pro &rarr;
            </Link>
          </div>

          <p className="mt-5 text-xs text-muted-foreground">
            Free forever &middot; 100 entries &middot; No account, no telemetry
          </p>
        </div>
      </aside>
    </article>
  );
}
