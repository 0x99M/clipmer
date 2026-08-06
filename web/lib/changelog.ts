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
    version: "3.2.0",
    date: "2026-08-05",
    highlight: "Masking now holds everywhere",
    changes: [
      {
        type: "security",
        text: "A masked entry stayed masked in the full-content viewer. Opening one through the ⋯ menu, or with Shift+Enter, previously showed its plaintext. It now opens masked behind an explicit Reveal, and the character count is withheld while masked.",
      },
      {
        type: "security",
        text: "The viewer and the entry menu close when the window hides. An open viewer used to still be on screen the moment the window was reopened.",
      },
      {
        type: "security",
        text: "The window now hides when it loses focus, so the entry list no longer stays pinned over whatever you switch to.",
      },
      {
        type: "security",
        text: "The auto-paste helper now rejects paste requests that did not come from Clipmer. Any application on your session bus could previously trigger a paste into your focused window. Takes effect after your next login.",
      },
      {
        type: "security",
        text: "Turning auto-paste off now removes the GNOME helper instead of leaving it running, and uninstalling Clipmer removes it too.",
      },
      {
        type: "security",
        text: "The window refuses to navigate, so dropping a link or a file onto it can no longer replace the interface, and a content security policy is now enforced.",
      },
      {
        type: "fixed",
        text: "Recording a shortcut that used an arrow key could stop clipboard capture permanently, with no error and no way to tell from the interface.",
      },
      {
        type: "fixed",
        text: "Starting Clipmer a second time silently broke the keyboard shortcut on Wayland until the next restart.",
      },
      {
        type: "fixed",
        text: "The GNOME shortcut stopped working after restarting Clipmer, because it had been recorded against the previous process.",
      },
      {
        type: "fixed",
        text: "Searching for something with no matches, then pressing Down and Enter, copied an unrelated entry instead of doing nothing.",
      },
      {
        type: "fixed",
        text: "Clicking an entry while a note was being edited could copy the entry above it.",
      },
      {
        type: "fixed",
        text: "The window opened on the wrong monitor in some multi-display layouts, and expanding it on a short screen could push it off the top with no way to drag it back.",
      },
      {
        type: "fixed",
        text: "Start on login did nothing for AppImage users, while still showing as enabled.",
      },
      {
        type: "fixed",
        text: "Minimal view could not be switched off, and folders could not be deleted, once a Pro licence lapsed.",
      },
      {
        type: "changed",
        text: "Clear history now says that entries saved in folders are kept, which is what it has always done.",
      },
      {
        type: "changed",
        text: "Ctrl+Shift+B is registered as a fallback when your chosen shortcut cannot be bound, and the settings pane says which one is actually active.",
      },
      {
        type: "changed",
        text: "Very large copies are capped at 256 KB so a stray copy cannot slow the app down permanently. Capped entries are labelled.",
      },
    ],
  },
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
