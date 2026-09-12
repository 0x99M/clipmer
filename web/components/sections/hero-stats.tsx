import { BadgeDollarSign, Download, Package, WifiOff } from "lucide-react";
import { DOWNLOADS, RELEASE_COUNT, VERSION } from "@/lib/release";
import { cn } from "@/lib/utils";

/**
 * The band that closes the hero. No card surfaces, no radii, no glow — the
 * orange rule on top and the hairlines between cells carry the structure,
 * which is also why every cell is flush left rather than centred: dividers
 * only read as columns when the content starts on them.
 *
 * The four numbers are deliberately mixed — two traction, two product facts —
 * so the band reads as "what is true about Clipmer" rather than a leaderboard.
 * Counts come from lib/release.ts and do not self-update; the price is a
 * literal because the site has no price constant.
 *
 * No "use client" and no hooks, so this adds no client JS of its own. It is
 * still pulled into the client graph today because hero.tsx is a client
 * component and imports it; lifting it to a server parent would need no edit.
 */
const STATS = [
  {
    icon: Download,
    label: "Downloads",
    figure: String(DOWNLOADS.total),
    context: "to date, across .deb, .rpm and AppImage",
    accent: false,
  },
  {
    icon: Package,
    label: "Releases",
    figure: String(RELEASE_COUNT),
    context: `shipped — latest v${VERSION}`,
    accent: false,
  },
  {
    icon: WifiOff,
    label: "Network calls",
    figure: "0",
    context: "no telemetry, no accounts, no sync",
    accent: false,
  },
  {
    icon: BadgeDollarSign,
    label: "Pro price",
    figure: "$9",
    context: "one time — free tier stays free",
    accent: true,
  },
] as const;

export function HeroStats() {
  return (
    <div
      data-hero="stats"
      className="mt-14 border-t-2 border-t-orange border-b border-b-border text-left"
    >
      <div className="grid grid-cols-2 md:grid-cols-4">
        {STATS.map((s, i) => (
          <div
            key={s.label}
            className={cn(
              "flex flex-col gap-3 border-border/60 px-5 py-8 md:px-8",
              // A left hairline on every cell but the first. At two columns
              // the third cell opens a row, so it drops the left rule and the
              // second row takes a top one instead.
              i > 0 && "border-l",
              i === 2 && "max-md:border-l-0 max-md:border-t",
              i === 3 && "max-md:border-t",
              // Flush with the hero container's edges: the outer cells at four
              // columns, and both ends of each row at two. The md: repeats are
              // load-bearing — a bare pl-0 loses to md:px-8, which sits later
              // in the sheet at equal specificity.
              i === 0 && "pl-0 md:pl-0",
              i === 1 && "max-md:pr-0",
              i === 2 && "max-md:pl-0",
              i === 3 && "pr-0 md:pr-0"
            )}
          >
            <span className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-orange">
              <s.icon aria-hidden className="size-3.5 shrink-0" />
              {s.label}
            </span>
            <span
              className={cn(
                "font-bold leading-[0.9] tracking-[-0.04em] tabular-nums",
                "text-4xl md:text-5xl lg:text-6xl",
                s.accent ? "text-orange" : "text-foreground"
              )}
            >
              {s.figure}
            </span>
            <span className="font-mono text-[11px] leading-relaxed text-muted-foreground">
              {s.context}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
