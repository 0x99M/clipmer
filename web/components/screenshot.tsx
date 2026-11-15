import Image from "next/image";
import { cn } from "@/lib/utils";
import history from "@/public/screenshots/clipmer-clipboard-history.png";
import search from "@/public/screenshots/clipmer-search.png";
import folders from "@/public/screenshots/clipmer-folders-notes.png";

/**
 * Real screenshots of the Clipmer window, used on the home page and in posts.
 *
 * Captured from the shipped 3.6.1 renderer (linux/renderer with linux/preload.js,
 * 2x scale, dark theme, default accent) with made-up entries answered over IPC —
 * the real main process never ran, so no real clipboard or history is in them.
 * Every caption says the entries are examples, and the folders shot says Pro,
 * because folders and notes are paid. Recapture rather than edit these if the
 * window changes: a doctored screenshot is the thing SEO.md says not to ship.
 */
export const SHOTS = {
  history: {
    src: history,
    alt: "The Clipmer window listing recent copies: an ssh command, a hidden entry shown as a row of dots, a kubectl command, a link and a note to self.",
    caption: "The history window. The second entry is hidden, so it shows as dots. Example entries.",
  },
  search: {
    src: search,
    alt: "The Clipmer window with ssh typed in the search box, narrowed to two matching entries with the first one selected.",
    caption: "Type any word you remember; the list narrows as you type. Example entries.",
  },
  folders: {
    src: folders,
    alt: "The Clipmer window with folder tabs All, Deploy and Snippets. The Deploy folder is open and each entry has a note under it.",
    caption: "Clipmer Pro: a Deploy folder, with notes under its entries. Example entries.",
  },
} as const;

export type ShotName = keyof typeof SHOTS;

export function Screenshot({
  shot,
  className,
  priority = false,
}: {
  shot: ShotName;
  className?: string;
  priority?: boolean;
}) {
  const s = SHOTS[shot];
  return (
    <figure className={cn("mx-auto my-8 w-full max-w-[420px]", className)}>
      <Image
        src={s.src}
        alt={s.alt}
        // Shown at 420 CSS px at most, so the 840 px capture covers 2x screens.
        sizes="(min-width: 480px) 420px, 92vw"
        priority={priority}
        className="h-auto w-full rounded-xl border border-border shadow-[0_24px_60px_-24px_rgba(0,0,0,0.8)]"
      />
      <figcaption className="mt-3 text-center text-sm leading-snug text-muted-foreground">
        {s.caption}
      </figcaption>
    </figure>
  );
}
