export type ChangeType = "added" | "changed" | "fixed" | "removed" | "security";

export type Change = {
  type: ChangeType;
  text: string;
};

export type Release = {
  version: string;
  /** ISO date of the GitHub release. */
  date: string;
  /** One line shown next to the version. */
  highlight: string;
  changes: Change[];
};

/**
 * Hand-maintained so the site never depends on api.github.com at build time.
 * scripts/release.sh refuses to publish a version with no entry here, which is
 * what keeps it from going stale.
 *
 * Packaging experiments that were added and reverted before ever shipping as a
 * release asset (Flatpak in 3.0.4, Snap in 3.0.5) are deliberately omitted —
 * no user ever received them.
 */
export const CHANGELOG: Release[] = [
  {
    version: "3.1.0",
    date: "2026-08-01",
    highlight: "A much bigger free tier",
    changes: [
      {
        type: "changed",
        text: "Free clipboard history raised from 25 to 100 entries.",
      },
      {
        type: "changed",
        text: "Light and dark themes, the accent color, and the custom global shortcut are now free for everyone.",
      },
      {
        type: "changed",
        text: "The source is now published under PolyForm Strict 1.0.0 instead of bespoke terms. Clipmer remains source-available, not open source.",
      },
    ],
  },
  {
    version: "3.0.5",
    date: "2026-05-18",
    highlight: "Hide entries before you screen-share",
    changes: [
      {
        type: "added",
        text: "Mask any entry so its contents render as dots in the list. Free for everyone.",
      },
    ],
  },
  {
    version: "3.0.4",
    date: "2026-05-12",
    highlight: "Text only",
    changes: [
      {
        type: "removed",
        text: "Image clipboard history. Clipmer now tracks text only, which removed the largest source of memory pressure.",
      },
    ],
  },
  {
    version: "3.0.3",
    date: "2026-05-10",
    highlight: "Quieter in the background",
    changes: [
      {
        type: "fixed",
        text: "The history list no longer re-renders while the window is hidden.",
      },
      {
        type: "security",
        text: "Rotated the license verification public key.",
      },
    ],
  },
  {
    version: "3.0.2",
    date: "2026-05-05",
    highlight: "A faster list",
    changes: [
      {
        type: "changed",
        text: "History renders 25 entries at a time with a load-more row instead of building the whole list up front.",
      },
      {
        type: "fixed",
        text: "Arrow-key navigation no longer rebuilds the entire list on every keypress.",
      },
      {
        type: "fixed",
        text: "The settings version label now reads from the running app, and entry timestamps freeze when the window opens.",
      },
    ],
  },
  {
    version: "3.0.1",
    date: "2026-05-04",
    highlight: "Auto-paste for everyone",
    changes: [
      { type: "changed", text: "Auto-paste is now a free feature." },
      {
        type: "fixed",
        text: "Clipboard polling no longer allocates megabytes of base64 for an unchanged image.",
      },
    ],
  },
];

export const LATEST_RELEASE = CHANGELOG[0];
