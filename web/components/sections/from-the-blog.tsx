import Link from "next/link";
import { ArrowRight, Clock } from "lucide-react";
import { FadeUp } from "@/components/fade-up";
import { SORTED_POSTS } from "@/lib/posts";

/**
 * The posts had no inbound link from anywhere but /blog, which is itself the
 * weakest page on the site. This gives them an edge from the strongest one.
 */
export function FromTheBlog({ limit = 2 }: { limit?: number }) {
  const posts = SORTED_POSTS.slice(0, limit);
  if (posts.length === 0) return null;

  return (
    <section className="py-20 lg:py-28" aria-labelledby="from-the-blog">
      <div className="mx-auto max-w-5xl px-6">
        <FadeUp>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2
                id="from-the-blog"
                className="text-3xl font-bold tracking-tight sm:text-4xl"
              >
                How the Linux clipboard{" "}
                <span className="text-orange">actually works.</span>
              </h2>
              <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
                Wayland forbids the one thing a clipboard manager needs to do. We
                write about the mechanics, and about our own bugs.
              </p>
            </div>
            <Link
              href="/blog"
              className="inline-flex shrink-0 items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-orange"
            >
              All guides
              <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </FadeUp>

        <FadeUp delay={0.1}>
          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {posts.map((post) => (
              <article
                key={post.slug}
                className="group relative rounded-xl border border-border bg-card/40 p-6 transition-colors hover:border-orange/40 hover:bg-surface/40"
              >
                <h3 className="text-balance text-lg font-semibold leading-snug tracking-tight transition-colors group-hover:text-orange">
                  <Link
                    href={`/blog/${post.slug}`}
                    className="after:absolute after:inset-0 after:content-['']"
                  >
                    {post.title}
                  </Link>
                </h3>
                <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
                  {post.description}
                </p>
                <div className="mt-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Clock className="size-3.5" />
                  {post.readingMinutes} min read
                </div>
              </article>
            ))}
          </div>
        </FadeUp>
      </div>
    </section>
  );
}
