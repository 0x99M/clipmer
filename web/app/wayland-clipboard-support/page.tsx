import type { Metadata } from "next";
import Link from "next/link";
import { ALTERNATE_TYPES, OG_BASE, ORG_ID, canonical } from "@/lib/seo";
import { SiteNav } from "@/components/site-nav";
import { Footer } from "@/components/sections/footer";
import { CommandBlock } from "@/components/copy-button";
import { SupportMatrix } from "@/components/wayland/support-matrix";
import {
  CHECKS,
  COMPOSITORS,
  SOURCES,
  VERIFIED_ON,
} from "@/lib/wayland-support";

const TITLE = "Wayland Clipboard Support by Compositor";
const DESCRIPTION =
  "Which Wayland compositors let a clipboard manager work, and what to install on each. Checked against the protocol registry, with the version traps that break the usual advice.";
/**
 * The search snippet, kept under the 158 chars scripts/check-metadata.mjs
 * enforces — same split as a post's metaDescription vs description. The longer
 * copy above still carries OG, Twitter and the JSON-LD, which are not truncated.
 */
const META_DESCRIPTION =
  "Which Wayland compositors let a clipboard manager work, and what to install on each — including the wl-clipboard version trap on KDE.";

export const metadata: Metadata = {
  title: `${TITLE} — Clipmer`,
  description: META_DESCRIPTION,
  keywords: [
    "wayland clipboard support",
    "does my compositor support clipboard managers",
    "wlr-data-control support",
    "ext-data-control-v1",
    "gnome clipboard manager wayland",
    "kde clipboard manager wayland",
  ],
  alternates: {
    canonical: canonical("/wayland-clipboard-support"),
    types: ALTERNATE_TYPES,
  },
  openGraph: {
    ...OG_BASE,
    url: canonical("/wayland-clipboard-support"),
    title: TITLE,
    description: DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
};

// A compatibility matrix with a stated source and a verification date is a
// Dataset, and saying so is more honest than dressing a lookup table up as an
// Article. Publisher is referenced by @id rather than restated — the
// Organization node is defined once, on the homepage.
const schema = {
  "@context": "https://schema.org",
  "@type": "Dataset",
  "@id": `${canonical("/wayland-clipboard-support")}#dataset`,
  name: "Wayland compositor clipboard-manager support matrix",
  description: DESCRIPTION,
  url: canonical("/wayland-clipboard-support"),
  dateModified: VERIFIED_ON,
  creator: { "@id": ORG_ID },
  publisher: { "@id": ORG_ID },
  isAccessibleForFree: true,
  keywords: [
    "Wayland",
    "clipboard manager",
    "ext-data-control-v1",
    "wlr-data-control",
    "compositor support",
  ],
  isBasedOn: SOURCES.map((s) => s.href),
  variableMeasured: [
    "ext-data-control-v1 support",
    "wlr-data-control support",
    "working clipboard manager",
  ],
};

function formatVerified(iso: string) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

export default function WaylandClipboardSupportPage() {
  // Counted off the protocol columns rather than `route`, which is a different
  // axis: a compositor with no protocol may still have a working in-process
  // route (GNOME's shell extensions), and conflating the two produced a
  // sentence that read as though Mutter and Muffin were six compositors.
  const noProtocol = COMPOSITORS.filter((c) => !c.ext && !c.wlr).length;

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <script
        type="application/ld+json"
        // Escaping `<` is the guard the Next JSON-LD guide asks for. Everything
        // here is authored data with no user input, so this is belt-and-braces.
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(schema).replace(/</g, "\\u003c"),
        }}
      />
      <SiteNav />

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-14 sm:py-20">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Which Wayland compositors support clipboard managers
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
          On Wayland, whether a clipboard manager can work at all is decided by
          your compositor, not by the manager. Find yours below for the answer
          and what to install.
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          {COMPOSITORS.length} compositors, read from the Wayland protocol
          registry on{" "}
          <time dateTime={VERIFIED_ON}>{formatVerified(VERIFIED_ON)}</time>.
        </p>

        {/* The page's own contribution, above the tool: two facts that are
            individually documented but not written down together anywhere. */}
        <div className="mt-10 space-y-3">
          <div className="rounded-xl border border-border bg-card/50 p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-orange">
              GNOME and Cinnamon are the stranded ones
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-foreground/80">
              Mutter and Muffin implement neither data-control protocol, so{" "}
              <code className="font-mono text-[0.9em] text-foreground">
                cliphist
              </code>
              ,{" "}
              <code className="font-mono text-[0.9em] text-foreground">
                clipman
              </code>{" "}
              and every other{" "}
              <code className="font-mono text-[0.9em] text-foreground">
                wl-paste --watch
              </code>{" "}
              pipeline fails on both — no matter how well it works for someone
              on Hyprland. {noProtocol} of the {COMPOSITORS.length} tracked
              compositors have no data-control support at all, and the other{" "}
              {noProtocol - 2} are kiosk, gaming and embedded shells nobody runs
              a desktop on. That leaves GNOME and Cinnamon as the only
              mainstream desktops in the group.
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card/50 p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-orange">
              On KDE, your wl-clipboard version decides it
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-foreground/80">
              KWin implements{" "}
              <code className="font-mono text-[0.9em] text-foreground">
                ext-data-control-v1
              </code>{" "}
              and nothing else, and wl-clipboard did not learn that protocol
              until 2.3.0 on 22 March 2026. Any older build cannot watch the
              clipboard on Plasma at all, which takes cliphist and everything
              downstream of it with it. The tool is not broken and the
              compositor is not broken — they simply have no protocol in common.
            </p>
          </div>
        </div>

        <div className="mt-12">
          <SupportMatrix />
        </div>

        {/* ── Verify it yourself ─────────────────────────────────────── */}
        <section className="mt-16">
          <h2
            id="check-your-own-session"
            className="scroll-mt-20 text-2xl font-bold tracking-tight"
          >
            Check your own session
          </h2>
          <p className="mt-3 leading-relaxed text-muted-foreground">
            The table above is what your compositor <em>ships</em>. These three
            commands are what your machine is actually doing right now, which is
            not always the same thing — a good share of &ldquo;my Wayland
            clipboard manager broke&rdquo; reports turn out to be an X11 session.
          </p>

          <div className="mt-6 space-y-6">
            {CHECKS.map((check) => (
              <div key={check.command}>
                <CommandBlock command={check.command} />
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {check.explains}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Context ────────────────────────────────────────────────── */}
        <section className="mt-16">
          <h2
            id="why-this-varies"
            className="scroll-mt-20 text-2xl font-bold tracking-tight"
          >
            Why this varies at all
          </h2>
          <div className="mt-3 space-y-4 leading-relaxed text-muted-foreground">
            <p>
              Wayland&rsquo;s core protocol only offers the selection to the
              client that currently holds keyboard focus. A clipboard manager is
              by definition a program that wants to read the clipboard while it
              is <em>not</em> focused, so it needs a privileged protocol
              extension — and each compositor decides for itself whether to
              implement one.
            </p>
            <p>
              Two extensions do that job.{" "}
              <a
                href="https://wayland.app/protocols/wlr-data-control-unstable-v1"
                target="_blank"
                rel="noopener noreferrer"
                className="text-foreground underline decoration-border underline-offset-4 transition-colors hover:decoration-orange"
              >
                wlr-data-control
              </a>{" "}
              came out of wlroots and was for years the only option; the registry
              now carries an explicit deprecation notice on it.{" "}
              <a
                href="https://wayland.app/protocols/ext-data-control-v1"
                target="_blank"
                rel="noopener noreferrer"
                className="text-foreground underline decoration-border underline-offset-4 transition-colors hover:decoration-orange"
              >
                ext-data-control-v1
              </a>{" "}
              is the standardised successor. Supporting one does not imply
              supporting the other, which is the whole reason a generic ranking
              article gets this wrong.
            </p>
            <p>
              The full mechanics — why the protocol exists, why portals are not
              the answer, and what XWayland changes — are in{" "}
              <Link
                href="/blog/clipboard-managers-on-wayland"
                className="text-orange transition-opacity hover:opacity-80"
              >
                clipboard managers on Wayland
              </Link>
              . For the per-compositor picks written out in prose, see{" "}
              <Link
                href="/blog/best-clipboard-manager-wayland"
                className="text-orange transition-opacity hover:opacity-80"
              >
                the best clipboard manager for Wayland
              </Link>
              .
            </p>
          </div>
        </section>

        {/* ── Sources ────────────────────────────────────────────────── */}
        <section className="mt-16">
          <h2
            id="sources"
            className="scroll-mt-20 text-2xl font-bold tracking-tight"
          >
            Sources
          </h2>
          <p className="mt-3 leading-relaxed text-muted-foreground">
            Support moves. Every cell above was read from a primary source on{" "}
            <time dateTime={VERIFIED_ON}>{formatVerified(VERIFIED_ON)}</time> —
            check these rather than trusting this page a year from now.
          </p>
          <ul className="mt-6 space-y-4">
            {SOURCES.map((s) => (
              <li key={s.href}>
                <a
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-foreground underline decoration-border underline-offset-4 transition-colors hover:decoration-orange"
                >
                  {s.label}
                </a>
                <p className="mt-1 text-sm text-muted-foreground">{s.backs}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* ── Product, kept at the bottom and kept honest ─────────────── */}
        <section className="mt-16 rounded-xl border border-border bg-card/50 p-6">
          <h2 className="text-lg font-semibold">Where Clipmer fits</h2>
          <p className="mt-2 text-sm leading-relaxed text-foreground/80">
            Clipmer is an Electron application, so it runs as an XWayland client
            and reads the clipboard through Electron&rsquo;s own API rather than
            a data-control protocol. That means it works on GNOME and Cinnamon,
            where the protocol-based tools cannot — and it also means it brings
            nothing the native tools do not already have on Hyprland, Sway or
            KDE. If you are on a compositor with data-control support and all
            you need is history, install cliphist and keep your money.
          </p>
          <Link
            href="/install"
            className="mt-4 inline-block text-sm font-medium text-orange transition-opacity hover:opacity-80"
          >
            Install Clipmer &rarr;
          </Link>
        </section>
      </main>

      <Footer />
    </div>
  );
}
