"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { Download, EyeOff, Folder, StickyNote } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  FeatureTile,
  type TileDepth,
  type TileLayer,
} from "@/components/feature-tile";
import { buttonVariants } from "@/components/ui/button";
import { CopyInstallGroup } from "@/components/install/copy-install-group";
import { cn } from "@/lib/utils";

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

/* ─────────────────────────── Tile contents ───────────────────────────
   Flat CSS and inline SVG only — no images, no icon set beyond the lucide
   glyphs the page already ships. Everything the idle loops will drive carries
   a data-tile hook, so the motion pass never has to restructure this markup.
   All six render here in their resting state. */

function MaskTile() {
  return (
    <div className="flex h-full flex-col justify-center gap-1.5 px-3">
      <EyeOff aria-hidden className="absolute top-2.5 right-2.5 size-3 text-orange" />
      {/* The folder chip is the same shape the app puts on a real entry. */}
      <span className="inline-flex w-fit items-center gap-1 rounded border border-orange/25 bg-orange/[0.08] px-1 py-px font-mono text-[7px] font-medium text-orange">
        <Folder aria-hidden className="size-2" strokeWidth={2.5} />
        Stripe
      </span>
      {/* Both readings are stacked so the loop can cross-fade between them.
          Masked is the resting state — that is the product's whole point. */}
      <span className="relative block h-4 w-full">
        <span
          data-tile="plain"
          className="absolute inset-0 font-mono text-[10px] leading-4 text-foreground opacity-0"
        >
          sk_live_51H8x
        </span>
        <span
          data-tile="masked"
          className="absolute inset-0 font-mono text-[10px] leading-4 text-orange"
        >
          ••••••••••••
        </span>
      </span>
      <span className="font-mono text-[7px] text-muted-foreground">1m ago</span>
    </div>
  );
}

/* The history the mockup used to show. Truncated the way the app truncates —
   these are the strings, not bars standing in for them. */
const STACK_ROWS = ["ssh deploy@10.4", "postgres://api@", "kubectl -n paym"];

function StackTile() {
  return (
    <div className="flex h-full flex-col justify-center gap-1 overflow-hidden px-2.5">
      {/* The arriving entry. Holds its space at rest so the stack never
          reflows mid-animation. */}
      <span data-tile="incoming" className="flex items-center gap-1 opacity-0">
        <span className="size-1 shrink-0 rounded-[1px] bg-orange" />
        <span className="truncate font-mono text-[7px] text-foreground/80">
          AWS_SECRET_ACC
        </span>
      </span>
      {STACK_ROWS.map((row) => (
        <span key={row} data-tile="row" className="flex items-center gap-1">
          <span className="size-1 shrink-0 rounded-[1px] bg-white/25" />
          <span className="truncate font-mono text-[7px] text-muted-foreground">
            {row}
          </span>
        </span>
      ))}
    </div>
  );
}

function OfflineTile() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2">
      <svg
        viewBox="0 0 24 24"
        className="size-7"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      >
        <path
          data-tile="arc-0"
          className="text-muted-foreground"
          d="M2.6 8.4a14 14 0 0 1 18.8 0"
        />
        <path
          data-tile="arc-1"
          className="text-muted-foreground"
          d="M6.2 12.4a9 9 0 0 1 11.6 0"
        />
        <path
          data-tile="arc-2"
          className="text-muted-foreground"
          d="M9.6 16.3a4.5 4.5 0 0 1 4.8 0"
        />
        <circle
          cx="12"
          cy="19.6"
          r="0.9"
          fill="currentColor"
          stroke="none"
          className="text-muted-foreground"
        />
        <path data-tile="slash" className="text-orange" d="M3.5 20.5 20.5 3.5" />
      </svg>
      {/* Concrete beats a label: the count is the claim. */}
      <span className="font-mono text-[7px] tracking-widest text-muted-foreground uppercase">
        0 requests
      </span>
    </div>
  );
}

function FoldersTile() {
  /* Painted back to front: index 0 is the tab currently in hand, and the only
     one carrying a name — the two behind it are occluded, so a label on them
     would collide rather than inform. */
  return (
    <div className="grid h-full place-items-center">
      <span className="relative block h-9 w-16">
        {[2, 1, 0].map((i) => (
          <span
            key={i}
            data-tile={`folder-${i}`}
            style={{ transform: `translate(${i * 5}px, ${i * -5}px)` }}
            className={cn(
              "absolute inset-x-0 bottom-0 flex h-7 items-center justify-center rounded-[5px] border",
              i === 0
                ? "border-orange/40 bg-orange/[0.10]"
                : "border-white/10 bg-surface"
            )}
          >
            <span
              className={cn(
                "absolute -top-[5px] left-1.5 h-1.5 w-5 rounded-t-[3px] border border-b-0",
                i === 0
                  ? "border-orange/40 bg-orange/[0.10]"
                  : "border-white/10 bg-surface"
              )}
            />
            {i === 0 ? (
              <span className="font-mono text-[8px] leading-none font-medium text-orange">
                Stripe
              </span>
            ) : null}
          </span>
        ))}
      </span>
    </div>
  );
}

function KeycapTile() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-1.5 px-2">
      <span
        data-tile="keycap"
        className="rounded-md border border-white/15 bg-surface px-2 py-1.5 font-mono text-[8px] text-foreground/80 shadow-[inset_0_-2px_0_rgba(255,255,255,0.10)]"
      >
        Ctrl+Shift+D
      </span>
      <span className="font-mono text-[7px] tracking-widest text-muted-foreground uppercase">
        anywhere
      </span>
    </div>
  );
}

function NoteTile() {
  return (
    <div className="flex h-full flex-col justify-center gap-1.5 px-2.5">
      <StickyNote aria-hidden className="size-3 text-orange/80" />
      {/* The entry the note is attached to, so the annotation has a subject. */}
      <span className="truncate font-mono text-[7px] text-muted-foreground/60">
        postgres://api
      </span>
      <span className="flex items-center font-mono text-[7px] text-foreground/80">
        <span data-tile="typing" className="overflow-hidden whitespace-nowrap">
          prod db creds
        </span>
        <span data-tile="caret" className="ml-px inline-block h-2 w-px bg-orange" />
      </span>
    </div>
  );
}

/* ───────────────────────────── The six ─────────────────────────────
   x/y are the tile's centre as a percentage of the headline block, so the
   constellation scales with the type. All six arrive together; only their
   feature demos are staggered, at index * 0.3s.

   Three coordinates are nudged off the brief's numbers, all measured rather
   than eyeballed. `offline` at x 4 / y -12 and `keycap` at x -2 sat in the
   block's left margin, clear of every glyph — a back tile nothing crosses is
   just a tile, so both moved inward until the type actually cuts through them.
   `folders` moved out from x 86 / y 72, where it swallowed the whole final
   "it." of the accent line. */
type TileSpec = {
  key: string;
  size: number;
  x: number;
  y: number;
  rotate: number;
  depth: TileDepth;
  layer: TileLayer;
  wideOnly?: boolean;
  content: ReactNode;
};

const TILES: TileSpec[] = [
  { key: "mask", size: 120, x: -6, y: 40, rotate: -10, depth: "near", layer: "front", content: <MaskTile /> },
  { key: "stack", size: 106, x: 80, y: -4, rotate: 8, depth: "near", layer: "front", content: <StackTile /> },
  { key: "offline", size: 92, x: 14, y: 6, rotate: -16, depth: "far", layer: "back", wideOnly: true, content: <OfflineTile /> },
  { key: "folders", size: 112, x: 96, y: 80, rotate: 12, depth: "mid", layer: "front", content: <FoldersTile /> },
  { key: "keycap", size: 98, x: 10, y: 86, rotate: -6, depth: "mid", layer: "back", content: <KeycapTile /> },
  // `mid`, not `far`: this tile is entirely fine text plus the typing
  // animation, and at far's 1.5px blur none of it resolves — it would be the
  // one tile selling a Pro feature while showing nothing. `offline` stays far
  // because its payload is an icon, which survives the blur.
  { key: "note", size: 84, x: 94, y: 44, rotate: 14, depth: "mid", layer: "back", wideOnly: true, content: <NoteTile /> },
];

const clamp = (v: number) => Math.max(-1, Math.min(1, v));

/** Maximum excursion at the nearest depth, in px. Multiplied by each tile's
 *  own parallax factor, so the far plane moves a quarter as far as the near. */
const PARALLAX_X = 16;
const PARALLAX_Y = 11;

/* ───────────────────────────── Hero ───────────────────────────── */
export function Hero() {
  const sectionRef = useRef<HTMLElement>(null);
  const blockRef = useRef<HTMLDivElement>(null);

  /* The only motion that outlives the arrival sequence. Values are written
     straight to the tiles' custom properties — React state here would
     re-render the hero on every frame (and trip react-hooks/set-state-in-
     effect). The 220ms transform transition in globals.css does the smoothing,
     so this can write raw values without lerping.

     Gated three ways: the tiles do not exist below 900px, a coarse pointer has
     no hover position to track, and reduced-motion means none of it runs. */
  useEffect(() => {
    const section = sectionRef.current;
    const block = blockRef.current;
    if (!section || !block) return;

    const wide = window.matchMedia("(min-width: 900px)");
    const fine = window.matchMedia("(pointer: fine)");
    const still = window.matchMedia("(prefers-reduced-motion: reduce)");

    let frame = 0;
    let dx = 0;
    let dy = 0;
    let live = false;

    const paint = () => {
      frame = 0;
      for (const el of block.querySelectorAll<HTMLElement>("[data-parallax]")) {
        const factor = Number(el.dataset.parallax) || 0;
        el.style.setProperty("--px", `${(dx * factor).toFixed(2)}px`);
        el.style.setProperty("--py", `${(dy * factor).toFixed(2)}px`);
      }
    };

    const onMove = (e: PointerEvent) => {
      const r = block.getBoundingClientRect();
      if (!r.width || !r.height) return;
      dx = clamp((e.clientX - (r.left + r.width / 2)) / (r.width / 2)) * PARALLAX_X;
      dy = clamp((e.clientY - (r.top + r.height / 2)) / (r.height / 2)) * PARALLAX_Y;
      if (!frame) frame = requestAnimationFrame(paint);
    };

    const rest = () => {
      dx = 0;
      dy = 0;
      if (!frame) frame = requestAnimationFrame(paint);
    };

    const sync = () => {
      const on = wide.matches && fine.matches && !still.matches;
      if (on === live) return;
      live = on;
      if (on) {
        section.addEventListener("pointermove", onMove);
        section.addEventListener("pointerleave", rest);
      } else {
        section.removeEventListener("pointermove", onMove);
        section.removeEventListener("pointerleave", rest);
        rest();
      }
    };

    sync();
    wide.addEventListener("change", sync);
    fine.addEventListener("change", sync);
    still.addEventListener("change", sync);
    return () => {
      wide.removeEventListener("change", sync);
      fine.removeEventListener("change", sync);
      still.removeEventListener("change", sync);
      section.removeEventListener("pointermove", onMove);
      section.removeEventListener("pointerleave", rest);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  /* The hero is above the fold, so its entrance is pure CSS and runs from the
     first paint. The rest of the page uses <FadeUp>, which is correct there —
     it waits for an intersection observer, and an observer cannot fire until
     React has hydrated. Using it here meant the copy arrived ~600ms after the
     tiles had already finished, with the headline never animating at all.
     Sequencing lives in globals.css under [data-hero]. */
  return (
    <>
      {/* -mt-16 pulls the section up behind the 4rem (h-16) sticky nav so the
          radial glow below renders continuously to the top of the viewport —
          otherwise the nav leaves a flat band and a hard seam where the
          gradient is clipped at the section edge. Top padding restores the
          original spacing (py-20/24 + 4rem), and min-h now spans the nav too. */}
      <section
        ref={sectionRef}
        className="relative -mt-16 flex items-center overflow-hidden pt-36 pb-20 sm:pt-40 sm:pb-24 lg:min-h-svh lg:pt-40 lg:pb-24"
      >
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

        <div className="relative z-10 mx-auto w-full max-w-7xl px-4 text-center sm:px-6">
          <div data-hero="badge" className="flex justify-center">
            <Badge
              variant="outline"
              className="h-auto w-fit gap-1.5 border-orange/25 bg-orange/[0.08] px-3 py-1 text-xs font-normal text-orange"
            >
              <span aria-hidden className="size-1.5 rounded-full bg-orange" />
              100% offline &middot; No telemetry
            </Badge>
          </div>

          {/* The headline block is the tiles' coordinate space, so above 900px
              it shrink-wraps the type rather than the container: a tile at
              x -6% has to hang off the words, not off the page margin. Below
              900px it is a plain full-width block and the tiles are gone. */}
          <div
            ref={blockRef}
            className="relative isolate mx-auto mt-6 w-full min-[900px]:mt-8 min-[900px]:w-fit"
          >
            <h1 className="relative z-[1] font-bold text-[clamp(3rem,8vw,7rem)] leading-[0.92] tracking-[-0.035em]">
              <span data-hero="line-1" className="block">
                Your clipboard
              </span>
              <span data-hero="line-2" className="block">
                is full of secrets.
              </span>
              <span data-hero="line-3" className="block text-orange">
                Treat it like it.
              </span>
            </h1>

            {TILES.map((tile, i) => (
              <FeatureTile
                key={tile.key}
                size={tile.size}
                x={tile.x}
                y={tile.y}
                rotate={tile.rotate}
                depth={tile.depth}
                layer={tile.layer}
                wideOnly={tile.wideOnly}
                delay={i * 0.3}
              >
                {tile.content}
              </FeatureTile>
            ))}
          </div>

          <>
            <ul
              data-hero="caps"
              className="mt-7 flex flex-wrap justify-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground sm:mt-8"
            >
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
            <div
              data-hero="cta"
              className="mt-7 flex flex-col items-stretch gap-3 sm:mt-8 sm:flex-row sm:items-center sm:justify-center"
            >
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

            {/* Its own row rather than a third item in the CTA line: three
                segments beside two buttons pushes the row past the headline's
                width and wraps awkwardly between about 900 and 1100px.
                Wrapped so it picks up a beat in the entrance cascade — the
                component itself only takes className. */}
            <div data-hero="install" className="mt-5">
              <CopyInstallGroup />
            </div>

            {/* Fine print: reassurance first, upsell second. */}
            <div
              data-hero="fine"
              className="mt-4 flex flex-col items-center gap-1.5 text-xs leading-relaxed text-muted-foreground"
            >
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
          </>
        </div>
      </section>
    </>
  );
}
