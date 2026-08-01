"use client";

import { useState } from "react";
import { MotionConfig } from "framer-motion";
import {
  Download,
  Eye,
  EyeOff,
  Folder,
  ListFilter,
  Lock,
  Search,
  StickyNote,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { FadeUp } from "@/components/fade-up";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/* Byte-identical to the shipping renderer: linux/renderer/app.js:569 replaces a
   hidden entry's whole preview with exactly ten bullets — it never masks a
   substring, so neither do we. */
const MASK = "•".repeat(10);

type Row = {
  /** What the entry actually holds. Revealed only when the visitor un-masks it. */
  plain: string;
  folder?: string;
  time: string;
  /** Resting state — rendered on the server, correct with JS off. */
  hidden: boolean;
};

/* Every row is something an SRE copied today. Two folders appear twice with one
   entry masked and one not (Stripe: 2/5, Prod: 3/4) — masking is per entry, not
   a mode. Every plain value is transparently synthetic. */
const ROWS: Row[] = [
  {
    plain: "ssh deploy@10.42.7.15 -p 2222",
    folder: "Servers",
    time: "12s ago",
    hidden: false,
  },
  {
    plain: "sk_live_51H8xEXAMPLEKEYdontuse",
    folder: "Stripe",
    time: "1m ago",
    hidden: true,
  },
  {
    plain: "postgres://api:hunter2-example@db-prod-01:5432/orders",
    folder: "Prod",
    time: "4m ago",
    hidden: true,
  },
  {
    plain: "kubectl -n payments rollout restart deploy/api",
    folder: "Prod",
    time: "9m ago",
    hidden: false,
  },
  {
    plain: "stripe listen --forward-to localhost:4242/webhook",
    folder: "Stripe",
    time: "14m ago",
    hidden: false,
  },
  {
    plain: "AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI",
    folder: "AWS",
    time: "22m ago",
    hidden: true,
  },
];

const CAPABILITIES = [
  { icon: EyeOff, label: "Mask before you present", tier: "Free" },
  { icon: StickyNote, label: "Annotate entries with notes", tier: "Pro" },
  { icon: Folder, label: "File them into folders", tier: "Pro" },
] as const;

function GithubMark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}

/* ───────────────────────── The exhibit ───────────────────────── */
function ClipmerWindow() {
  const [hidden, setHidden] = useState<boolean[]>(() => ROWS.map((r) => r.hidden));
  const maskedCount = hidden.filter(Boolean).length;

  const toggle = (i: number) =>
    setHidden((prev) => prev.map((v, j) => (j === i ? !v : v)));

  return (
    <div className="relative mx-auto w-full max-w-md lg:max-w-none">
      {/* Static bloom. Rasterized once; nothing animates it. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-8 rounded-[2rem] bg-[radial-gradient(closest-side,rgba(233,84,32,0.12),rgba(233,84,32,0))] blur-2xl"
      />

      <div className="relative overflow-hidden rounded-xl border border-border bg-card shadow-[0_28px_70px_-24px_rgba(0,0,0,0.9)]">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-10 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(233,84,32,0.5),transparent)]"
        />

        {/* Title bar — GNOME, not macOS. No traffic lights on a Linux product. */}
        <div className="flex items-center gap-2 border-b border-border bg-surface/30 px-3 py-2">
          <span className="grid size-4 shrink-0 place-items-center rounded-[4px] bg-orange text-[8px] font-bold text-white">
            C
          </span>
          <span className="text-xs font-medium">Clipmer</span>
          <span className="font-mono text-[10px] text-muted-foreground">
            {ROWS.length} items
          </span>
          <span className="ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-md border border-orange/25 bg-orange/[0.08] px-1.5 py-0.5 text-[10px] font-medium text-orange tabular-nums">
            <EyeOff aria-hidden className="size-2.5" />
            {maskedCount} masked
          </span>
          <kbd className="ml-1 hidden shrink-0 rounded border border-border bg-surface/60 px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground sm:block">
            Ctrl+Shift+D
          </kbd>
        </div>

        {/* Search bar — mirrors renderer/index.html #search-bar */}
        <div className="flex items-center gap-2 px-2.5 pt-2.5">
          <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-border/70 bg-surface/40 px-2.5 py-1.5">
            <Search aria-hidden className="size-3.5 shrink-0 text-muted-foreground" />
            <span className="truncate text-xs text-muted-foreground">Search...</span>
            <span className="ml-auto hidden shrink-0 items-center gap-1 rounded border border-border bg-surface/70 px-1.5 py-px font-mono text-[9px] text-muted-foreground sm:inline-flex">
              content <kbd className="rounded bg-background/60 px-1">tab</kbd>
            </span>
          </div>
          <span
            aria-hidden
            className="grid size-7 shrink-0 place-items-center rounded-lg border border-border/70 bg-surface/40 text-muted-foreground"
          >
            <ListFilter className="size-3.5" />
          </span>
        </div>

        {/* History list */}
        <div className="space-y-0.5 p-1.5 sm:p-2">
          {ROWS.map((row, i) => {
            const isHidden = hidden[i];
            const shown = isHidden ? MASK : row.plain;
            return (
              <div
                key={row.plain}
                data-masked={isHidden}
                className="group/row flex items-start gap-2.5 rounded-lg border border-transparent px-2 py-2 transition-colors duration-200 hover:bg-surface/30 data-[masked=true]:border-orange/20 data-[masked=true]:bg-orange/[0.05]"
              >
                <span
                  aria-hidden
                  className="mt-px grid size-5 shrink-0 place-items-center rounded-[5px] border border-border bg-surface/50 font-mono text-[10px] leading-none text-muted-foreground"
                >
                  T
                </span>

                <div className="min-w-0 flex-1">
                  {/* Row height is one line of mono at fixed leading in a flex-1
                      box, so swapping the string can shift nothing. */}
                  <span className="sr-only">
                    {isHidden ? "Entry hidden" : row.plain}
                  </span>
                  <span
                    aria-hidden
                    className={cn(
                      "block truncate font-mono text-[12px] leading-5 select-none sm:text-[13px]",
                      isHidden ? "text-muted-foreground" : "text-foreground"
                    )}
                  >
                    {shown}
                  </span>

                  <div className="mt-1 flex items-center gap-1.5">
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {row.time}
                    </span>
                    {row.folder ? (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-md border border-orange/20 bg-orange/[0.08] px-1.5 py-px text-[9px] font-medium text-orange sm:text-[10px]">
                        <Folder aria-hidden className="size-2.5" strokeWidth={2.5} />
                        {row.folder}
                      </span>
                    ) : null}
                  </div>
                </div>

                {/* Real control on every row: masking is a per-entry choice. */}
                <button
                  type="button"
                  onClick={() => toggle(i)}
                  aria-pressed={isHidden}
                  aria-label={`Hide entry copied ${row.time}`}
                  className={cn(
                    "mt-px grid size-6 shrink-0 place-items-center rounded-md transition-colors",
                    "focus-visible:ring-2 focus-visible:ring-orange/60 focus-visible:outline-none",
                    isHidden
                      ? "bg-orange/10 text-orange hover:bg-orange/20"
                      : "text-muted-foreground/50 hover:bg-surface/70 hover:text-foreground group-hover/row:text-muted-foreground"
                  )}
                >
                  {isHidden ? (
                    <EyeOff className="size-3.5" />
                  ) : (
                    <Eye className="size-3.5" />
                  )}
                </button>
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-1.5 border-t border-border bg-surface/20 px-3 py-1.5">
          <Lock aria-hidden className="size-2.5 shrink-0 text-muted-foreground" />
          <span className="truncate font-mono text-[9px] text-muted-foreground sm:text-[10px]">
            ~/.config/clipmer &middot; never leaves this machine
          </span>
        </div>
      </div>

      <p className="mt-3 text-center text-xs text-muted-foreground">
        Masked rows still copy the real value. Hiding is free, forever.
      </p>
    </div>
  );
}

/* ───────────────────────────── Hero ───────────────────────────── */
export function Hero() {
  return (
    <MotionConfig reducedMotion="user">
      {/* -mt-16 pulls the section up behind the 4rem (h-16) sticky nav so the
          radial glow below renders continuously to the top of the viewport —
          otherwise the nav leaves a flat band and a hard seam where the
          gradient is clipped at the section edge. Top padding restores the
          original spacing (py-20/24 + 4rem), and min-h now spans the nav too. */}
      <section className="relative -mt-16 flex items-center overflow-hidden pt-36 pb-20 sm:pt-40 sm:pb-24 lg:min-h-svh lg:pt-40 lg:pb-24">
        {/* Static substrate — replaces the rAF canvas and three animated orbs. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 [background-image:linear-gradient(to_right,rgba(233,84,32,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(233,84,32,0.05)_1px,transparent_1px)] [background-size:50px_50px] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_35%,#000,transparent)]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 [background:radial-gradient(ellipse_58%_45%_at_50%_-5%,rgba(233,84,32,0.12),transparent_70%)]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-background"
        />

        <div className="relative z-10 mx-auto w-full max-w-7xl px-4 sm:px-6">
          <div className="flex flex-col gap-12 lg:grid lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-10 xl:gap-14">
            {/* ── Copy: four clusters on one descending ramp ── */}
            <FadeUp className="mx-auto max-w-xl text-center lg:mx-0 lg:max-w-none lg:text-left">
              <Badge
                variant="outline"
                className="h-auto w-fit gap-1.5 border-orange/25 bg-orange/[0.08] px-3 py-1 text-xs font-normal text-orange"
              >
                <span aria-hidden className="size-1.5 rounded-full bg-orange" />
                100% offline &middot; No telemetry
              </Badge>

              {/* Three authored lines. The blocks decide the breaks; nbsp,
                  nowrap and text-balance are only fallbacks. */}
              <h1 className="mt-4 text-balance font-bold text-[clamp(1.625rem,calc(3.2vw_+_0.6rem),3.375rem)] leading-[1.06] tracking-[-0.03em] sm:mt-5">
                <span className="block">Your clipboard is full of</span>
                <span className="block w-fit mx-auto lg:mx-0 box-decoration-clone bg-[linear-gradient(100deg,#E95420_0%,#ff8a52_55%,#E95420_100%)] bg-clip-text text-transparent">
                  production&nbsp;secrets.
                </span>
                <span className="block whitespace-nowrap">Treat it like it.</span>
              </h1>

              <p className="mt-4 mx-auto max-w-[56ch] text-pretty text-base leading-relaxed text-muted-foreground sm:mt-5 sm:text-lg lg:mx-0">
                Never lose a copied item again &mdash; and never flash a credential
                on a screen share. Masked entries stay copyable, but unreadable.
              </p>

              <ul className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground lg:justify-start">
                {CAPABILITIES.map(({ icon: Icon, label, tier }) => (
                  <li key={label} className="inline-flex items-center gap-1.5">
                    <Icon aria-hidden className="size-3.5 text-orange/80" />
                    {label}
                    <span
                      className={cn(
                        "rounded px-1 py-px text-[9px] font-semibold tracking-wide uppercase",
                        tier === "Free"
                          ? "bg-orange/15 text-orange"
                          : "bg-surface text-muted-foreground"
                      )}
                    >
                      {tier}
                    </span>
                  </li>
                ))}
              </ul>

              {/* Widest gap in the column sits directly above Download. */}
              <div className="mt-7 flex flex-col items-stretch gap-3 sm:mt-8 sm:flex-row sm:items-center sm:justify-center lg:justify-start">
                <a
                  href="#download"
                  className={cn(
                    buttonVariants({ size: "lg" }),
                    "group/btn relative h-12 w-full gap-2 overflow-hidden rounded-lg px-7 text-base font-semibold sm:w-auto",
                    "bg-orange text-white shadow-lg shadow-orange/25 transition-shadow hover:bg-orange-hover hover:shadow-orange/40"
                  )}
                >
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 ease-out group-hover/btn:translate-x-full motion-reduce:transition-none"
                  />
                  <Download className="relative size-5" />
                  <span className="relative">Download for Linux</span>
                </a>
                <a
                  href="https://github.com/0x99M/clipmer"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    buttonVariants({ variant: "ghost", size: "lg" }),
                    "h-12 w-full gap-2 rounded-lg px-4 text-sm text-muted-foreground sm:w-auto",
                    "hover:bg-surface/60 hover:text-foreground dark:hover:bg-surface/60"
                  )}
                >
                  <GithubMark className="size-4" />
                  View on GitHub
                </a>
              </div>

              {/* Fine print: reassurance first, upsell second. */}
              <div className="mt-4 flex flex-col items-center gap-1.5 text-xs leading-relaxed text-muted-foreground lg:items-start">
                <p className="max-w-[58ch]">
                  Source-available, not open source &mdash; read and audit every
                  line under the{" "}
                  <a
                    href="https://github.com/0x99M/clipmer/blob/master/LICENSE"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline decoration-border underline-offset-2 transition-colors hover:text-foreground"
                  >
                    PolyForm Strict 1.0.0
                  </a>{" "}
                  license.
                </p>
                <a
                  href="/pro"
                  className="group/pro inline-flex items-center gap-1.5 transition-colors hover:text-foreground"
                >
                  <span className="rounded bg-orange/15 px-1.5 py-px font-semibold text-orange">
                    $9
                  </span>
                  <span>Get Clipmer Pro &mdash; one payment, forever</span>
                  <span
                    aria-hidden
                    className="text-orange transition-transform group-hover/pro:translate-x-0.5 motion-reduce:transition-none"
                  >
                    &rarr;
                  </span>
                </a>
              </div>
            </FadeUp>

            {/* ── The exhibit ── */}
            <FadeUp delay={0.12}>
              <ClipmerWindow />
            </FadeUp>
          </div>
        </div>
      </section>
    </MotionConfig>
  );
}
