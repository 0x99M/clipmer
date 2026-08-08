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
  /**
   * Search-snippet copy, kept under ~158 chars. `description` is the full
   * standfirst and is what OG, Twitter and the JSON-LD keep using.
   */
  metaDescription?: string;
  /** ISO publication date. */
  date: string;
  updated?: string;
  tags: string[];
  readingMinutes: number;
  toc: TocEntry[];
};

export const POSTS: Post[] = [
  {
    slug: "copyq-alternatives",
    title: "CopyQ alternatives on Linux, compared honestly",
    seoTitle: "CopyQ Alternatives on Linux, Compared",
    metaDescription:
      "A technical comparison of GPaste, Pano, Clipboard History, Klipper, Diodon, Parcellite, Ringboard and Clipmer — and when CopyQ is still better.",
    description:
      "CopyQ is not broken — it is the most capable clipboard manager on Linux and 16.0.0 shipped on 30 May 2026. People leave it over the dated Qt interface, the scripting they never use, or Wayland behaviour that is usually their distro shipping a three-year-old build. Here is what each alternative actually is, how it reads your clipboard, what it is licensed under, and when CopyQ is still the right answer.",
    date: "2026-08-08",
    tags: ["Clipboard", "Linux", "Wayland"],
    readingMinutes: 11,
    toc: [
      { id: "why-people-actually-leave-copyq", title: "Why people actually leave CopyQ" },
      { id: "the-version-your-distro-ships-is-probably-the-problem", title: "The version your distro ships is probably the problem" },
      { id: "how-copyq-actually-reads-your-clipboard", title: "How CopyQ actually reads your clipboard" },
      { id: "the-alternatives-at-a-glance", title: "The alternatives at a glance" },
      { id: "gpaste", title: "GPaste" },
      { id: "pano", title: "Pano" },
      { id: "clipboard-history", title: "Clipboard History" },
      { id: "klipper", title: "Klipper" },
      { id: "the-gtk-old-guard-diodon-parcellite-and-clipit", title: "The GTK old guard: Diodon, Parcellite and ClipIt" },
      { id: "clipmer", title: "Clipmer" },
      { id: "when-copyq-is-still-the-right-answer", title: "When CopyQ is still the right answer" },
      { id: "which-one-to-actually-try", title: "Which one to actually try" },
    ],
  },
  {
    slug: "best-clipboard-manager-wayland",
    title: "The best clipboard manager for Wayland depends on your compositor",
    seoTitle: "Best Clipboard Manager for Wayland",
    metaDescription:
      "What works depends on your compositor: per-compositor picks for GNOME, KDE, Hyprland and Sway, checked against the live protocol registry.",
    description:
      "On Wayland, which clipboard manager works is decided by your compositor, because the data-control protocols are not universally implemented. This is the per-compositor answer for GNOME, KDE Plasma, Hyprland, Sway and the rest, checked against the protocol registry, the compositor source trees and the distro package indexes in August 2026. It also covers the version traps that break the usual advice: wl-clipboard on KDE, Pano's upstream status, and how far behind Ubuntu's GPaste actually is.",
    date: "2026-08-08",
    tags: ["Wayland", "Clipboard", "Linux"],
    readingMinutes: 8,
    toc: [
      { id: "why-the-answer-depends-on-your-compositor", title: "Why the answer depends on your compositor" },
      { id: "check-what-your-session-supports-first", title: "Check what your session supports first" },
      { id: "gnome-a-shell-extension-because-there-is-no-protocol", title: "GNOME: a shell extension, because there is no protocol" },
      { id: "kde-plasma-klipper-is-already-running", title: "KDE Plasma: Klipper is already running" },
      { id: "hyprland-cliphist-and-wl-clipboard", title: "Hyprland: cliphist and wl-clipboard" },
      { id: "sway-the-same-stack", title: "Sway: the same stack" },
      { id: "niri-cosmic-wayfire-river-and-the-rest", title: "niri, COSMIC, Wayfire, river and the rest" },
      { id: "where-clipmer-fits-and-where-it-does-not", title: "Where Clipmer fits, and where it does not" },
      { id: "the-short-version", title: "The short version" },
      { id: "what-none-of-these-solve", title: "What none of these solve" },
    ],
  },
  {
    slug: "auditing-our-own-clipboard-manager",
    title: "We audited our own clipboard manager",
    seoTitle: "Auditing an Electron Clipboard Manager",
    metaDescription:
      "We audited Clipmer's own secret-masking and found the fastest way past it was the menu item directly above the button that turns it on.",
    description:
      "Clipmer's headline feature is masking secrets before a screen share. An audit found the fastest way past it was the menu item directly above the button that turns it on — plus a GNOME hotkey signed to a dead PID, a D-Bus check that authenticated nothing, and a three-line fix that was worse than the bug it closed.",
    date: "2026-08-05",
    tags: ["Security", "Electron", "Linux"],
    readingMinutes: 7,
    toc: [
      { id: "a-feature-that-defeated-a-feature", title: "A feature that defeated a feature" },
      { id: "the-one-that-needed-no-user-action", title: "The one that needed no user action" },
      {
        id: "the-hotkey-that-was-signed-to-a-dead-process",
        title: "The hotkey that was signed to a dead process",
      },
      { id: "the-check-that-authenticated-nothing", title: "The check that authenticated nothing" },
      { id: "the-fix-that-was-worse-than-the-bug", title: "The fix that was worse than the bug" },
      {
        id: "what-actually-changed-about-how-we-work",
        title: "What actually changed about how we work",
      },
      { id: "the-part-that-does-not-get-fixed", title: "The part that does not get fixed" },
    ],
  },
  {
    slug: "clipboard-managers-on-wayland",
    title: "Clipboard managers on Wayland: why it's hard and what actually works",
    seoTitle: "Wayland Clipboard History: Why It's Hard",
    metaDescription:
      "Wayland forbids the one thing a clipboard manager needs to do. The security model, the two data-control protocols, and which compositors support them.",
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
    seoTitle: "Clipboard History on Ubuntu 24.04",
    metaDescription:
      "Ubuntu ships no clipboard history. Five options that work — Clipboard History, GPaste, Pano, CopyQ and Clipmer — with real install commands.",
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
  "copyq-alternatives": () =>
    import("@/content/blog/copyq-alternatives.mdx"),
  "best-clipboard-manager-wayland": () =>
    import("@/content/blog/best-clipboard-manager-wayland.mdx"),
  "auditing-our-own-clipboard-manager": () =>
    import("@/content/blog/auditing-our-own-clipboard-manager.mdx"),
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
