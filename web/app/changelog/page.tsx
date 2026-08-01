import type { Metadata } from "next";
import { SiteNav } from "@/components/site-nav";
import { Footer } from "@/components/sections/footer";
import { CHANGELOG, type ChangeType } from "@/lib/changelog";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Changelog — Clipmer",
  description:
    "Every Clipmer release, what changed in it, and when it shipped.",
  alternates: {
    canonical: "https://clipmer.app/changelog",
    types: { "application/rss+xml": "https://clipmer.app/blog/rss.xml" },
  },
  openGraph: {
    type: "website",
    url: "https://clipmer.app/changelog",
    siteName: "Clipmer",
    title: "Changelog — Clipmer",
    description:
      "Every Clipmer release, what changed in it, and when it shipped.",
    // Declaring `openGraph` replaces the root layout's resolved value, which
    // drops the app/opengraph-image.tsx file convention — name it explicitly.
    images: [{ url: "/opengraph-image", width: 1200, height: 630 }],
  },
  // Likewise `twitter`: without this the root layout's homepage title and
  // description are inherited and contradict the og: tags on this page.
  twitter: {
    card: "summary_large_image",
    title: "Changelog — Clipmer",
    description:
      "Every Clipmer release, what changed in it, and when it shipped.",
  },
};

const TYPE_STYLES: Record<ChangeType, string> = {
  added: "border-green-500/30 bg-green-500/10 text-green-400",
  changed: "border-orange/30 bg-orange/10 text-orange",
  fixed: "border-blue-500/30 bg-blue-500/10 text-blue-400",
  removed: "border-red-500/30 bg-red-500/10 text-red-400",
  security: "border-purple-500/30 bg-purple-500/10 text-purple-400",
};

function formatDate(iso: string) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

export default function ChangelogPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <SiteNav />

      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-14 sm:py-20">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Changelog</h1>
        <p className="mt-3 text-lg text-muted-foreground">
          Every release, what changed, and when it shipped.
        </p>

        <div className="mt-14 space-y-14">
          {CHANGELOG.map((release, i) => (
            <section key={release.version} className="relative">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h2
                  id={`v${release.version}`}
                  className="scroll-mt-20 font-mono text-xl font-bold text-orange"
                >
                  v{release.version}
                </h2>
                {i === 0 ? (
                  <span className="rounded-full border border-orange/30 bg-orange/10 px-2 py-0.5 text-xs font-medium text-orange">
                    Latest
                  </span>
                ) : null}
                <time
                  dateTime={release.date}
                  className="text-sm text-muted-foreground"
                >
                  {formatDate(release.date)}
                </time>
              </div>

              <p className="mt-2 text-lg font-medium">{release.highlight}</p>

              <ul className="mt-5 space-y-3">
                {release.changes.map((change) => (
                  <li key={change.text} className="flex flex-wrap gap-x-3 gap-y-2">
                    <span
                      className={cn(
                        "mt-0.5 h-fit shrink-0 rounded border px-1.5 py-0.5 font-mono text-[0.6875rem] uppercase tracking-wide",
                        TYPE_STYLES[change.type]
                      )}
                    >
                      {change.type}
                    </span>
                    <span className="min-w-0 flex-1 leading-relaxed text-foreground/85">
                      {change.text}
                    </span>
                  </li>
                ))}
              </ul>

              <a
                href={`https://github.com/0x99M/clipmer/releases/tag/v${release.version}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 inline-block text-sm text-muted-foreground transition-colors hover:text-orange"
              >
                Download v{release.version} &rarr;
              </a>
            </section>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  );
}
