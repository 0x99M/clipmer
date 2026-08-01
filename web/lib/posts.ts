import type { ComponentType } from "react";

export type TocEntry = {
  /** Must match slugify() of the heading text — see lib/slug.ts. */
  id: string;
  title: string;
};

export type Post = {
  slug: string;
  /** The <h1>, rendered by the article shell. */
  title: string;
  /** <title> / OG title when it should differ from the h1. */
  seoTitle?: string;
  description: string;
  /** ISO publication date. */
  date: string;
  updated?: string;
  tags: string[];
  readingMinutes: number;
  toc: TocEntry[];
};

export const POSTS: Post[] = [
  {
    slug: "clipboard-managers-on-wayland",
    title: "Clipboard managers on Wayland: why it's hard and what actually works",
    seoTitle: "Clipboard Managers on Wayland: Why It's Hard and What Works",
    description:
      "Wayland deliberately forbids the one thing a clipboard manager needs to do. Here is the security model behind that, the two data-control protocols that work around it, which compositors implement which (GNOME implements neither), and how each Linux clipboard manager actually reads your clipboard.",
    date: "2026-08-01",
    tags: ["Wayland", "Linux", "Clipboard"],
    readingMinutes: 7,
    toc: [
      { id: "the-clipboard-is-not-a-buffer", title: "The clipboard is not a buffer" },
      { id: "what-wayland-actually-changed", title: "What Wayland actually changed" },
      { id: "the-escape-hatches", title: "The escape hatches" },
      { id: "which-compositors-support-what", title: "Which compositors support what" },
      {
        id: "how-to-tell-what-your-own-session-supports",
        title: "How to tell what your own session supports",
      },
      {
        id: "what-this-means-for-the-tools-you-already-know",
        title: "What this means for the tools you already know",
      },
      { id: "how-clipmer-does-it-specifically", title: "How Clipmer does it, specifically" },
      { id: "the-trade-off-nobody-advertises", title: "The trade-off nobody advertises" },
    ],
  },
  {
    slug: "clipboard-history-ubuntu",
    title: "Clipboard history on Ubuntu: the complete guide",
    seoTitle: "Clipboard History on Ubuntu 24.04 and 26.04: The Complete Guide",
    description:
      "Ubuntu ships no clipboard history. Five options that work — Clipboard History, GPaste, Pano, CopyQ, and Clipmer — with every install command run against a real Ubuntu 24.04.4 LTS system, including the t64 package names Pano needs.",
    date: "2026-08-01",
    tags: ["Ubuntu", "GNOME", "Clipboard"],
    readingMinutes: 4,
    toc: [
      { id: "first-check-which-session-you-are-in", title: "First, check which session you are in" },
      { id: "option-1-clipboard-history-extension", title: "Option 1: Clipboard History extension" },
      { id: "option-2-gpaste", title: "Option 2: GPaste" },
      { id: "option-3-pano", title: "Option 3: Pano" },
      { id: "option-4-copyq", title: "Option 4: CopyQ" },
      { id: "option-5-clipmer", title: "Option 5: Clipmer" },
      {
        id: "which-one-should-you-actually-install",
        title: "Which one should you actually install",
      },
      { id: "setting-a-keyboard-shortcut", title: "Setting a keyboard shortcut" },
      {
        id: "one-thing-worth-knowing-before-you-install-any-of-these",
        title: "One thing worth knowing before you install any of these",
      },
    ],
  },
];

/**
 * Explicit slug -> dynamic import. A template-literal import over a directory
 * relies on bundler context modules, which are fragile under Turbopack; this
 * map is fully static and each post page loads only its own MDX chunk.
 */
export const POST_CONTENT: Record<
  string,
  () => Promise<{ default: ComponentType }>
> = {
  "clipboard-managers-on-wayland": () =>
    import("@/content/blog/clipboard-managers-on-wayland.mdx"),
  "clipboard-history-ubuntu": () =>
    import("@/content/blog/clipboard-history-ubuntu.mdx"),
};

/** Newest first. */
export const SORTED_POSTS: Post[] = [...POSTS].sort((a, b) =>
  b.date.localeCompare(a.date)
);

export function getPost(slug: string): Post | undefined {
  return POSTS.find((p) => p.slug === slug);
}

export function formatPostDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}
