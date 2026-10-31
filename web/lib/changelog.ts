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
    version: "3.5.0",
    date: "2026-10-31",
    highlight: "See through the window, and a crash fix for KDE Plasma",
    changes: [
      {
        type: "added",
        text: "A Window opacity slider in Settings \u2192 Appearance makes the window background translucent, the way a terminal does, so you can read what is behind Clipmer while you work. Entries, menus and the search field stay fully opaque, so nothing becomes harder to read. It defaults to 100%, which looks exactly as it always has, and it stops at 30% so the window can never be made impossible to find.",
      },
      {
        type: "fixed",
        text: "On KDE Plasma, changing the toggle shortcut could raise \"A JavaScript error occurred in the main process\" with a write EPIPE. Clipmer was running GNOME's keybinding path on desktops that have no GNOME keybinding schema; the resulting error surfaced after the code that guards it had already finished, so the guard never caught it. Clipmer now skips that path on Plasma entirely, and the error can no longer escape even where it does run. Thanks to ViolinKaine for the report and the stack trace.",
      },
    ],
  },
  {
    version: "3.4.2",
    date: "2026-10-30",
    highlight: "Folder tabs stay with the history list",
    changes: [
      {
        type: "fixed",
        text: "The folder tabs introduced in 3.4.0 stayed on screen when you opened Settings or the folder editor, leaving a row of history filters above a screen with nothing to filter. They now go away with the list and come back when you return to it.",
      },
    ],
  },
  {
    version: "3.4.1",
    date: "2026-10-30",
    highlight: "A scrollbar that matches the rest of the window",
    changes: [
      {
        type: "fixed",
        text: "The folder list and the backup panel drew the system scrollbar rather than Clipmer’s — a wide pale bar with stepper arrows, which stood out badly against the dark window. Both now use the same slim scrollbar as the history list.",
      },
    ],
  },
  {
    version: "3.4.0",
    date: "2026-10-30",
    highlight: "KDE Plasma, folder tabs, and a window that remembers its size",
    changes: [
      {
        type: "added",
        text: "The keyboard shortcut now registers on KDE Plasma. Electron's own shortcut API never fires on Wayland, and the fallback behind it only ever spoke GNOME's language — so on Plasma no combination worked at all, however it was set. Clipmer now writes a Plasma shortcut as well. Plasma reads its shortcut configuration at login, so it starts working after you next log in.",
      },
      {
        type: "added",
        text: "Folders now appear as a row of tabs above the list, each with the number of entries in it. The filter button is still there and the two always agree: choosing a tab updates the button, and choosing from the button moves the tab. The row only appears once you have a folder, so nothing changes if you do not use them.",
      },
      {
        type: "added",
        text: "The window remembers how big you made it, not only where you put it. Collapsing from the expanded view now returns to your size instead of snapping back to the default one. The setting that controls this is now called “Remember window size and position”.",
      },
      {
        type: "fixed",
        text: "The Super key can be used in a shortcut. The recorder ignored it completely and insisted on Ctrl, Shift or Alt, so a combination like Super+V could not be entered at all — even though everything behind the recorder already accepted it.",
      },
      {
        type: "fixed",
        text: "Settings no longer claims the GNOME shortcut is still working when you are not running GNOME. It now names whichever fallback your desktop actually has, or says plainly that there is not one.",
      },
    ],
  },
  {
    version: "3.3.1",
    date: "2026-10-25",
    highlight: "A new icon",
    changes: [
      {
        type: "changed",
        text: "Clipmer has a new icon: a clipboard whose middle row is masked as three dots — the same thing the app does to an entry you hide. It replaces the grey circle with an orange dot above it, which read as a notification badge and all but disappeared at small sizes.",
      },
      {
        type: "changed",
        text: "The tray icon is drawn for the size the panel shows it at, rather than being an app icon shrunk down, and it now stands out against a light panel as well as a dark one.",
      },
    ],
  },
  {
    version: "3.3.0",
    date: "2026-10-25",
    highlight: "Encrypted backup and restore",
    changes: [
      {
        type: "added",
        text: "Pro can export your history, notes and folders to a single encrypted file, from Settings → License → Backup. You choose the password and the file is unreadable without it — the key is derived from your password with scrypt, and the contents are encrypted with AES-256-GCM. Nothing is uploaded and no account is involved.",
      },
      {
        type: "added",
        text: "Importing a backup either merges it into your current history or replaces it. A merge recognises the entries you already have instead of duplicating them, so importing the same file twice changes nothing, and your notes, folders and hidden entries come back with it.",
      },
      {
        type: "added",
        text: "Your license key is deliberately left out of the backup file, so a backup kept on a USB stick or in cloud storage cannot activate Pro for anyone else. The file is written so that only your user account can read it.",
      },
    ],
  },
  {
    version: "3.2.1",
    date: "2026-09-16",
    highlight: "Auto-paste on Ubuntu 26.04",
    changes: [
      {
        type: "fixed",
        text: "Auto-paste works again on GNOME 50, the version Ubuntu 26.04 LTS ships. The paste helper only declared support up to GNOME 49, so GNOME refused to load it and choosing an entry copied it without pasting. Log out and back in once after updating.",
      },
      {
        type: "changed",
        text: "The paste helper now declares GNOME 51 too, and no longer uses the API GNOME 51 removes.",
      },
      {
        type: "added",
        text: "Settings now says when auto-paste is switched on but cannot work, and what to do about it, instead of showing it as on while nothing pastes.",
      },
    ],
  },
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
