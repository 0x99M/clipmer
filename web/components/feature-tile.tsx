import { type CSSProperties, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export type TileDepth = "near" | "mid" | "far";
export type TileLayer = "front" | "back";

/* Three fixed rungs, never a value in between — scale, blur and shadow weight
   move together or the tiles stop reading as separate planes. `parallax` is
   the factor the hero's pointer/scroll handler multiplies its offset by; it
   lives here so a tile's depth is described in exactly one place. */
const DEPTH: Record<
  TileDepth,
  { scale: number; blur: number; shadow: number; parallax: number }
> = {
  near: { scale: 1, blur: 0, shadow: 1, parallax: 0.6 },
  mid: { scale: 0.88, blur: 0.5, shadow: 0.7, parallax: 0.35 },
  far: { scale: 0.76, blur: 1.5, shadow: 0.45, parallax: 0.15 },
};

/* Full-weight shadow. Depth scales the alpha, not the geometry. */
const SHADOW_ALPHA = 0.7;

export type FeatureTileProps = {
  children: ReactNode;
  /** Square edge in px, before the depth scale. */
  size: number;
  /** Tile centre as a percentage of the headline block. */
  x: number;
  y: number;
  rotate: number;
  depth: TileDepth;
  layer?: TileLayer;
  /** Offset for this tile's feature demo, in seconds, exposed to the contents
   *  as --t0. Does not affect arrival — all tiles arrive together. */
  delay?: number;
  /** Tiles that hang furthest out are dropped below 1280px instead of pulled in. */
  wideOnly?: boolean;
  className?: string;
};

export function FeatureTile({
  children,
  size,
  x,
  y,
  rotate,
  depth,
  layer = "front",
  delay = 0,
  wideOnly = false,
  className,
}: FeatureTileProps) {
  const { scale, blur, shadow, parallax } = DEPTH[depth];

  return (
    <div
      aria-hidden
      data-parallax={parallax}
      style={
        {
          // Under 1280px the tiles that overhang the block are pulled flush
          // with its edges rather than dropped.
          "--tile-x": `${x}%`,
          "--tile-x-narrow": `${Math.min(100, Math.max(0, x))}%`,
          "--tile-rotate": `${rotate}deg`,
          "--tile-scale": scale,
          // Inherited by the contents. Only the feature demos are staggered —
          // the tiles themselves all arrive together, so this is deliberately
          // NOT applied to the tile's own entrance animation.
          "--t0": `${delay}s`,
          top: `${y}%`,
          width: size,
          height: size,
          filter: blur > 0 ? `blur(${blur}px)` : undefined,
          boxShadow: `0 24px 48px -12px rgba(0,0,0,${(SHADOW_ALPHA * shadow).toFixed(3)})`,
        } as CSSProperties
      }
      className={cn(
        // Decorative and never in the way of the copy underneath.
        "pointer-events-none absolute select-none",
        "left-[var(--tile-x-narrow)] min-[1280px]:left-[var(--tile-x)]",
        wideOnly ? "hidden min-[1280px]:block" : "hidden min-[900px]:block",
        "rounded-2xl border border-white/10 bg-card",
        // One transform, composed: centring, then the parallax offset the hero
        // writes into --px/--py, then the tile's own rest pose. Anything that
        // animates has to go through the custom properties or it clobbers this.
        "[transform:translate(-50%,-50%)_translate(var(--px,0px),var(--py,0px))_rotate(var(--tile-rotate))_scale(var(--tile-scale))]",
        layer === "front" ? "z-[2]" : "z-0",
        className
      )}
    >
      {children}
    </div>
  );
}
