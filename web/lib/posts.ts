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
  /** ISO date of the last material prose change. Never equal to `date`. */
  updated?: string;
  tags: string[];
  readingMinutes: number;
  toc: TocEntry[];
  /**
   * Curated "Keep reading" picks: three slugs, in display order. An unknown
   * slug throws in components/blog/article-shell.tsx and fails `next build`.
   */
  related?: string[];
  /** Pinned ahead of the newest posts in the home page's blog section. */
  featured?: boolean;
};

export const POSTS: Post[] = [
  {
    slug: "clipboard-extension-stopped-working-gnome-upgrade",
    title: "Clipboard extension stopped working after a GNOME upgrade? Why it happens every six months, and what to do",
    seoTitle: "Clipboard Indicator Broken on GNOME 51: What to Do",
    metaDescription:
      "Clipboard Indicator has no GNOME 51 build, so it stops after the Ubuntu 26.10 or Fedora 45 upgrade. The 30-second check, the fixes, and where your history is.",
    description:
      "Clipboard history gone from the top bar after a GNOME upgrade? The extension was refused, not broken: its build does not list your Shell version. Why this happens every six months, the 30-second check, the two fixes and when the override is a bad idea, where each extension keeps its history file, and the GNOME 51 status of Clipboard Indicator, Clipboard History, Copyous, GPaste and Pano.",
    date: "2026-11-02",
    tags: ["Clipboard", "GNOME", "Ubuntu", "Linux"],
    readingMinutes: 9,
    related: ["clipboard-history-fedora", "clipboard-history-ubuntu", "best-clipboard-manager-wayland"],
    toc: [
      { id: "what-you-are-seeing", title: "What you are seeing" },
      { id: "right-now-clipboard-indicator-has-no-gnome-51-build", title: "Right now: Clipboard Indicator has no GNOME 51 build" },
      { id: "why-this-happens-every-six-months", title: "Why this happens every six months" },
      { id: "check-in-30-seconds", title: "Check in 30 seconds" },
      { id: "fix-1-update-the-extension-then-look-at-github", title: "Fix 1: update the extension, then look at GitHub" },
      { id: "fix-2-the-version-validation-override-and-when-it-is-a-bad-idea", title: "Fix 2: the version-validation override, and when it is a bad idea" },
      { id: "your-history-file-is-probably-still-there", title: "Your history file is probably still there" },
      { id: "status-today-per-extension", title: "Status today, per extension" },
      { id: "avoiding-the-cycle-capture-that-does-not-run-inside-the-shell", title: "Avoiding the cycle: capture that does not run inside the Shell" },
    ],
  },
  {
    slug: "clipboard-history-fedora",
    title: "Clipboard history on Fedora 44 and 45: which extensions still load on GNOME 50 and 51",
    seoTitle: "Clipboard History on Fedora 44 and 45 (GNOME 50, 51)",
    metaDescription:
      "Fedora ships no clipboard history. Which extensions load on Fedora 44 (GNOME 50) and 45 (GNOME 51), the dnf commands, and the check to run after each upgrade.",
    description:
      "Fedora ships no clipboard history, and because it tracks upstream GNOME every release changes the Shell version your extensions must declare. Which clipboard extensions load on Fedora 44 (GNOME 50) and Fedora 45 (GNOME 51), GPaste and CopyQ from Fedora's own repository with the versions dnf installs, why Clipboard Indicator does not load on 45 yet, and the 30-second check to run after every upgrade.",
    date: "2026-11-02",
    tags: ["Clipboard", "GNOME", "Linux"],
    readingMinutes: 9,
    related: ["clipboard-extension-stopped-working-gnome-upgrade", "clipboard-history-ubuntu", "best-clipboard-manager-wayland"],
    toc: [
      { id: "check-your-gnome-version-first-fedora-44-is-50-fedora-45-is-51", title: "Check your GNOME version first: Fedora 44 is 50, Fedora 45 is 51" },
      { id: "which-extensions-declare-gnome-50-and-51", title: "Which extensions declare GNOME 50 and 51" },
      { id: "option-1-clipboard-history-extension-declares-gnome-48-to-51", title: "Option 1: Clipboard History extension (declares GNOME 48 to 51)" },
      { id: "what-the-fedora-45-beta-showed-extensions-break-before-their-builds-catch-up", title: "What the Fedora 45 beta showed: extensions break before their builds catch up" },
      { id: "option-2-gpaste-from-fedoras-own-repository", title: "Option 2: GPaste from Fedora's own repository" },
      { id: "option-3-clipboard-indicator-on-fedora-fine-on-44-not-on-45-yet", title: "Option 3: Clipboard Indicator on Fedora: fine on 44, not on 45 yet" },
      { id: "option-4-copyq-from-the-fedora-repository", title: "Option 4: CopyQ from the Fedora repository" },
      { id: "option-5-clipmer-whose-capture-does-not-depend-on-an-extension", title: "Option 5: Clipmer, whose capture does not depend on an extension" },
      { id: "which-one-by-what-you-need", title: "Which one, by what you need" },
      { id: "after-every-fedora-upgrade-the-30-second-check", title: "After every Fedora upgrade: the 30-second check" },
    ],
  },
  {
    slug: "clipboard-manager-saving-passwords-linux",
    title: "Your clipboard manager is keeping your passwords: Bitwarden, KeePassXC and the Linux secret hint",
    seoTitle: "Stop Clipboard Managers Saving Passwords on Linux",
    metaDescription:
      "Bitwarden and KeePassXC clear the clipboard, not your clipboard manager’s history. Which Linux tools honour the secret hint, and what to do if yours doesn’t.",
    description:
      "A password copied from Bitwarden or KeePassXC on Linux is recorded by your clipboard manager before the password manager’s clear timer runs. The hint that keeps it out, x-kde-passwordManagerHint, is set by the KeePassXC and Bitwarden desktop apps but not by the Bitwarden browser extension, keepassxc-cli or GTK 4 apps, and honoured by Klipper, CopyQ, GPaste 51.1, Clipboard History and cliphist but not by Clipboard Indicator or Clipmer. What each gap means, what Clipmer does with the entry instead, and the habits that work with any tool.",
    date: "2026-11-02",
    tags: ["Clipboard", "Security", "Linux"],
    readingMinutes: 8,
    related: ["hide-clipboard-secrets-screen-sharing", "clear-clipboard-linux", "auditing-our-own-clipboard-manager"],
    toc: [
      { id: "the-short-answer", title: "The short answer" },
      { id: "how-the-secret-hint-works", title: "How the secret hint works" },
      { id: "who-sets-it-and-who-cant", title: "Who sets it, and who can't" },
      { id: "which-clipboard-managers-honour-it", title: "Which clipboard managers honour it" },
      { id: "what-clipmer-does-with-a-copied-password", title: "What Clipmer does with a copied password" },
      { id: "habits-that-keep-passwords-out-of-any-clipboard-history", title: "Habits that keep passwords out of any clipboard history" },
      { id: "if-you-want-no-history-at-all", title: "If you want no history at all" },
    ],
  },
  {
    slug: "clipboard-history-linux-mint",
    title: "Clipboard history on Linux Mint: Cinnamon has none, and here is what works",
    seoTitle: "Clipboard History on Linux Mint and Cinnamon",
    metaDescription:
      "Linux Mint has no clipboard history, but Cinnamon runs on X11, so every clipboard manager works. Spices applets, CopyQ, Diodon and Clipmer on Mint 22.3.",
    description:
      "Cinnamon ships no clipboard history, and Linux Mint 22.3 is no different. Because Mint logs you into X11 by default, every clipboard manager still works there — the opposite of the GNOME story. Both Spices applets compared honestly, CopyQ and Diodon from the repositories, where Clipmer stands untested on Cinnamon, and how to bind a Super+V-style shortcut in Cinnamon's Keyboard settings.",
    date: "2026-11-02",
    tags: ["Clipboard", "Linux", "Tools"],
    readingMinutes: 9,
    related: ["clipboard-history-ubuntu", "copyq-alternatives", "win-v-clipboard-history-linux"],
    toc: [
      { id: "cinnamon-has-no-clipboard-history-and-on-x11-that-is-easy-to-fix", title: "Cinnamon has no clipboard history, and on X11 that is easy to fix" },
      { id: "first-check-which-session-you-are-in", title: "First, check which session you are in" },
      { id: "option-1-a-cinnamon-clipboard-applet-from-spices", title: "Option 1: a Cinnamon clipboard applet from Spices" },
      { id: "option-2-copyq-from-the-mint-repositories", title: "Option 2: CopyQ from the Mint repositories" },
      { id: "option-3-diodon-parcellite-and-clipit", title: "Option 3: Diodon, Parcellite and ClipIt" },
      { id: "option-4-clipmer", title: "Option 4: Clipmer" },
      { id: "which-one-to-pick", title: "Which one to pick" },
      { id: "set-a-super-v-style-shortcut-in-cinnamon", title: "Set a Super + V-style shortcut in Cinnamon" },
      { id: "if-you-switch-to-the-wayland-session-later", title: "If you switch to the Wayland session later" },
      { id: "one-thing-to-know-before-installing-any-of-these", title: "One thing to know before installing any of these" },
    ],
  },
  {
    slug: "xclip-not-working-wayland",
    title: "xclip not working on Wayland? What to use instead for scripts, tmux and Neovim",
    seoTitle: "xclip Not Working on Wayland? Use wl-clipboard",
    metaDescription:
      "xclip half-works on Wayland: fine on GNOME, stale on KDE, silent on Sway and Hyprland. Install wl-clipboard, translate the flags, and fix Neovim and tmux.",
    description:
      "xclip still runs under Wayland through XWayland, but whether its copies reach Wayland apps depends on how each compositor bridges X11 selections: Mutter always, KWin in one direction, wlroots and Hyprland only while an X11 window has focus, all checked against current source. The fix is wl-clipboard. A flag-for-flag translation from xclip and xsel, a detector for scripts that run on both, and the settings that make Neovim and tmux use wl-copy.",
    date: "2026-11-02",
    tags: ["Clipboard", "Wayland", "Linux", "Tools"],
    readingMinutes: 9,
    related: ["clipboard-managers-on-wayland", "best-clipboard-manager-wayland", "clipboard-empty-after-closing-app-linux"],
    toc: [
      { id: "why-xclip-half-works-on-wayland", title: "Why xclip half-works on Wayland" },
      { id: "install-wl-clipboard-on-ubuntu-fedora-and-arch", title: "Install wl-clipboard on Ubuntu, Fedora and Arch" },
      { id: "xclip-and-xsel-to-wl-copy-and-wl-paste", title: "xclip and xsel to wl-copy and wl-paste" },
      { id: "scripts-that-must-work-on-both", title: "Scripts that must work on both" },
      { id: "neovim-clipboard-on-wayland-unnamedplus-checkhealth-and-the-display-trap", title: "Neovim clipboard on Wayland: unnamedplus, checkhealth and the DISPLAY trap" },
      { id: "tmux-copy-to-the-wayland-clipboard-with-copy-command", title: "tmux: copy to the Wayland clipboard with copy-command" },
      { id: "wl-paste-watch-needs-data-control", title: "wl-paste --watch needs data-control" },
      { id: "what-a-clipboard-history-sees-from-all-this", title: "What a clipboard history sees from all this" },
    ],
  },
  {
    slug: "clear-clipboard-linux",
    title: "How to clear the clipboard on Linux, and the history your clipboard manager kept",
    seoTitle: "Clear the Clipboard on Linux: Commands and History",
    metaDescription:
      "xsel --clipboard --clear on X11, wl-copy --clear on Wayland, why Klipper puts it back, and how to clear the history in GPaste, cliphist, CopyQ and Clipmer.",
    description:
      "Clearing the clipboard and clearing your clipboard manager’s history are two different jobs. Here are the X11 and Wayland commands for the first, the Klipper default that silently undoes it on Plasma, verified clear commands for Klipper, GPaste, Clipboard Indicator, Clipboard History, CopyQ, cliphist and Clipmer, what password managers’ timed clears do and do not remove, and a one-key panic clear for GNOME and Plasma.",
    date: "2026-11-02",
    tags: ["Clipboard", "Linux", "Security", "KDE"],
    readingMinutes: 8,
    related: ["hide-clipboard-secrets-screen-sharing", "clipboard-manager-saving-passwords-linux", "kde-plasma-clipboard-history-not-working"],
    toc: [
      { id: "clearing-the-clipboard-is-not-clearing-the-history", title: "Clearing the clipboard is not clearing the history" },
      { id: "clear-the-clipboard-from-the-command-line", title: "Clear the clipboard from the command line" },
      { id: "on-plasma-klipper-puts-it-straight-back", title: "On Plasma, Klipper puts it straight back" },
      { id: "clear-the-clipboard-history-tool-by-tool", title: "Clear the clipboard history, tool by tool" },
      { id: "auto-clear-after-a-few-seconds-and-what-a-manager-keeps-anyway", title: "Auto-clear after a few seconds, and what a manager keeps anyway" },
      { id: "a-one-key-panic-clear-on-gnome-and-plasma", title: "A one-key panic clear on GNOME and Plasma" },
      { id: "what-clear-history-keeps-in-clipmer", title: "What Clear History keeps in Clipmer" },
    ],
  },
  {
    slug: "get-back-overwritten-clipboard-linux",
    title: "Copied over something on Linux? Here's what you can still get back",
    seoTitle: "Recover Overwritten Clipboard Text on Linux",
    metaDescription:
      "Copied over something on Linux? Check the primary selection, the source app and your shell history first. Then make sure it never happens again.",
    description:
      "Linux keeps one clipboard item, so a new copy replaces the old one for good. But the primary selection, the app you copied from, your shell history and KDE's built-in history can each still hold what you lost. Here is where to look, in the order that matters, and how to make it the last time.",
    date: "2026-11-02",
    tags: ["Clipboard", "Linux", "GNOME"],
    readingMinutes: 5,
    related: ["clipboard-empty-after-closing-app-linux", "kde-plasma-clipboard-history-not-working", "clipboard-history-ubuntu"],
    toc: [
      { id: "the-short-answer", title: "The short answer" },
      { id: "check-the-primary-selection-first", title: "Check the primary selection first" },
      { id: "go-back-to-where-you-copied-it-from", title: "Go back to where you copied it from" },
      { id: "on-kde-plasma-you-already-have-a-history", title: "On KDE Plasma, you already have a history" },
      { id: "on-gnome-and-everything-else-nothing-kept-it", title: "On GNOME and everything else, nothing kept it" },
      { id: "make-it-the-last-time", title: "Make it the last time" },
      { id: "why-linux-does-not-keep-it-for-you", title: "Why Linux does not keep it for you" },
    ],
  },
  {
    slug: "clipboard-empty-after-closing-app-linux",
    title: "Why your clipboard empties when you close an app on Linux",
    seoTitle: "Clipboard Empty After Closing an App on Linux",
    metaDescription:
      "On Linux the clipboard dies with the app you copied from, unless something saves it. Which desktops do (GNOME, Plasma) and how to fix Sway and Hyprland.",
    description:
      "On Linux, copying doesn't move your text anywhere: the app you copied from serves it on paste, so closing that app can empty the clipboard. GNOME's compositor and KDE's Klipper quietly save it; Sway, Hyprland and the other wlroots compositors don't. How to tell which you have, the fix for each, and how to keep more than the last copy.",
    date: "2026-11-02",
    tags: ["Clipboard", "Wayland", "Linux"],
    readingMinutes: 5,
    related: ["get-back-overwritten-clipboard-linux", "clipboard-managers-on-wayland", "best-clipboard-manager-wayland"],
    toc: [
      { id: "the-clipboard-is-a-promise-not-a-copy", title: "The clipboard is a promise, not a copy" },
      { id: "which-desktops-catch-it-for-you", title: "Which desktops catch it for you" },
      { id: "how-to-tell-what-yours-does", title: "How to tell what yours does" },
      { id: "the-fix-for-each-desktop", title: "The fix for each desktop" },
      { id: "keeping-more-than-the-last-copy", title: "Keeping more than the last copy" },
      { id: "why-this-hits-wayland-users-harder", title: "Why this hits Wayland users harder" },
    ],
  },
  {
    slug: "win-v-clipboard-history-linux",
    title: "Win+V on Linux: Windows-style clipboard history on Ubuntu",
    seoTitle: "Win+V Clipboard History on Ubuntu Linux",
    metaDescription:
      "Super+V on Ubuntu opens notifications, not a clipboard. Free the key with one command, put a clipboard history behind it, and see how it compares with Win+V.",
    description:
      "Pressing Super+V on Ubuntu opens GNOME's notification list, and Ubuntu has no clipboard history at all. One gsettings command frees the key without losing the notification shortcut, and a clipboard manager goes behind it. Plus an honest comparison with Windows' Win+V, including the things Linux doesn't match.",
    date: "2026-11-02",
    tags: ["Ubuntu", "GNOME", "Clipboard"],
    readingMinutes: 4,
    related: ["clipboard-history-ubuntu", "clipboard-shortcut-not-working-wayland", "clipboard-manager-auto-paste-wayland"],
    toc: [
      { id: "what-win-v-actually-does-on-windows", title: "What Win+V actually does on Windows" },
      { id: "what-super-v-does-on-ubuntu-instead", title: "What Super + V does on Ubuntu instead" },
      { id: "step-1-free-super-v", title: "Step 1: free Super + V" },
      { id: "step-2-put-a-clipboard-history-behind-it", title: "Step 2: put a clipboard history behind it" },
      { id: "how-it-compares-with-win-v", title: "How it compares with Win+V" },
      { id: "on-kde-plasma-meta-v-is-already-a-clipboard", title: "On KDE Plasma, Meta + V is already a clipboard" },
      { id: "other-ways-to-get-there", title: "Other ways to get there" },
    ],
  },
  {
    slug: "clipboard-manager-auto-paste-wayland",
    title: "Why your clipboard manager won't paste on Wayland",
    seoTitle: "Clipboard Manager Auto-Paste on Wayland",
    metaDescription:
      "On Wayland, picking a clipboard entry does not paste it. Why apps cannot press Ctrl+V for you, what ydotool and wtype cost, and how auto-paste works on GNOME.",
    description:
      "On Wayland, choosing an entry in a clipboard manager puts it on the clipboard but doesn't paste it, because no ordinary app may type into another app's window. The ways around that — ydotool, wtype, the Remote Desktop portal, and a compositor-side helper — and what each costs, with how Clipmer's GNOME paste helper works and where it doesn't.",
    date: "2026-11-02",
    tags: ["Wayland", "GNOME", "Clipboard"],
    readingMinutes: 5,
    related: ["clipboard-shortcut-not-working-wayland", "clipboard-managers-on-wayland", "clipboard-history-ubuntu"],
    toc: [
      { id: "what-auto-paste-really-is", title: "What \"auto-paste\" really is" },
      { id: "why-wayland-stops-it", title: "Why Wayland stops it" },
      { id: "the-ways-around-it", title: "The ways around it" },
      { id: "how-clipmer-pastes-on-gnome", title: "How Clipmer pastes on GNOME" },
      { id: "turning-it-on", title: "Turning it on" },
      { id: "where-it-wont-work", title: "Where it won't work" },
      { id: "living-without-it", title: "Living without it" },
    ],
  },
  {
    slug: "clipboard-shortcut-not-working-wayland",
    title: "Clipboard manager shortcut not working on Wayland? The fix for each desktop",
    seoTitle: "Clipboard Shortcut Not Working on Wayland",
    metaDescription:
      "A shortcut set inside a clipboard manager never fires on Wayland. Why, the GlobalShortcuts portal, and how to bind it on GNOME, KDE Plasma, Sway and Hyprland.",
    description:
      "Wayland doesn't let an application hear keys pressed in other windows, so a shortcut set inside a clipboard manager often does nothing. Why that happens, where the GlobalShortcuts portal helps, the desktop-level binding that works everywhere — for GNOME, KDE Plasma, Sway and Hyprland — and how Clipmer registers its own shortcut on GNOME and Plasma.",
    date: "2026-11-02",
    tags: ["Wayland", "KDE", "GNOME"],
    readingMinutes: 5,
    related: ["clipboard-manager-auto-paste-wayland", "win-v-clipboard-history-linux", "clipboard-managers-on-wayland"],
    toc: [
      { id: "why-the-shortcut-never-arrives", title: "Why the shortcut never arrives" },
      { id: "two-ways-it-can-work", title: "Two ways it can work" },
      { id: "bind-it-in-your-desktop-settings", title: "Bind it in your desktop settings" },
      { id: "how-clipmer-does-it-without-asking", title: "How Clipmer does it without asking" },
      { id: "if-it-still-does-nothing", title: "If it still does nothing" },
    ],
  },
  {
    slug: "kde-plasma-clipboard-history-not-working",
    title: "KDE Plasma clipboard history not working? Check these first",
    seoTitle: "KDE Plasma Clipboard History Not Working: Fixes",
    metaDescription:
      "Klipper showing one entry, losing history on reboot, or breaking paste after Meta+V? The usual causes, from QT_QPA_PLATFORM to one setting.",
    description:
      "Plasma ships a working clipboard history, so when Klipper misbehaves the fix is usually a setting or an environment variable. Why it can hold only one entry (QT_QPA_PLATFORM=wayland-egl), how to keep history across reboots, a reported Meta+V paste problem, and the three situations where a different clipboard manager makes more sense.",
    date: "2026-11-02",
    tags: ["KDE", "Wayland", "Clipboard"],
    readingMinutes: 5,
    related: ["clipboard-history-after-reboot-linux", "get-back-overwritten-clipboard-linux", "best-clipboard-manager-wayland"],
    toc: [
      { id: "check-these-first", title: "Check these first" },
      { id: "open-the-right-settings", title: "Open the right settings" },
      { id: "only-one-entry-ever-shows-up", title: "Only one entry ever shows up" },
      { id: "history-is-gone-after-a-reboot", title: "History is gone after a reboot" },
      { id: "paste-stops-working-after-cancelling-meta-v", title: "Paste stops working after cancelling Meta + V" },
      { id: "one-thing-klipper-does-that-most-dont", title: "One thing Klipper does that most don't" },
      { id: "when-an-alternative-makes-sense", title: "When an alternative makes sense" },
    ],
  },
  {
    slug: "hide-clipboard-secrets-screen-sharing",
    title: "Screen sharing with a clipboard manager: how not to show your secrets",
    seoTitle: "Hide Clipboard History Secrets When Screen Sharing",
    metaDescription:
      "Opening clipboard history on a call shows everything you copied today. Habits that help with any tool, how hiding entries works, and what it cannot protect.",
    description:
      "Open your clipboard history during a screen share and everyone sees every password, token and address you copied today. Habits that help with any tool, how hiding individual entries works in Clipmer — masked in the list, out of search, behind Reveal in the viewer — and, just as plainly, what hiding does not protect.",
    date: "2026-11-02",
    tags: ["Security", "Clipboard", "Linux"],
    readingMinutes: 5,
    related: ["auditing-our-own-clipboard-manager", "clipboard-manager-saving-passwords-linux", "clear-clipboard-linux"],
    toc: [
      { id: "why-a-clipboard-history-is-the-worst-thing-to-have-on-screen", title: "Why a clipboard history is the worst thing to have on screen" },
      { id: "habits-that-help-with-any-tool", title: "Habits that help with any tool" },
      { id: "hiding-individual-entries", title: "Hiding individual entries" },
      { id: "the-window-gets-out-of-the-way", title: "The window gets out of the way" },
      { id: "what-clearing-keeps", title: "What clearing keeps" },
      { id: "what-hiding-does-not-do", title: "What hiding does not do" },
      { id: "if-you-dont-want-a-history-at-all", title: "If you don't want a history at all" },
    ],
  },
  {
    slug: "clipboard-manager-freezes-large-copy",
    title: "Why a huge copy can freeze your clipboard manager",
    seoTitle: "Clipboard Manager Freezes After a Large Copy",
    metaDescription:
      "Copied a big log or SVG and your clipboard manager hung? Why one large entry slows every later copy, how to get out of it, and why a size cap is the fix.",
    description:
      "One large copy — a log, a minified bundle, an 18 MB SVG — can make a clipboard manager crawl long after you made it, because many store the whole history in one file and rewrite it on every copy. The bug reports, how to get out of it now, and how a per-entry size cap prevents it.",
    date: "2026-11-02",
    tags: ["Clipboard", "Linux", "Performance"],
    readingMinutes: 4,
    related: ["copyq-alternatives", "clipboard-history-after-reboot-linux", "clipboard-empty-after-closing-app-linux"],
    toc: [
      { id: "why-a-big-copy-hurts-long-after-you-made-it", title: "Why a big copy hurts long after you made it" },
      { id: "getting-out-of-it-now", title: "Getting out of it now" },
      { id: "how-clipmer-keeps-it-from-happening", title: "How Clipmer keeps it from happening" },
      { id: "why-a-size-cap-is-the-right-fix", title: "Why a size cap is the right fix" },
      { id: "if-it-isnt-the-clipboard-manager", title: "If it isn't the clipboard manager" },
    ],
  },
  {
    slug: "clipboard-history-after-reboot-linux",
    title: "Keep your clipboard history after a reboot on Linux",
    seoTitle: "Keep Clipboard History After Reboot on Linux",
    metaDescription:
      "Clipboard history empty after a reboot? It is often a privacy setting. What to check in Klipper, GPaste and the GNOME extension, and moving it to a new PC.",
    description:
      "An empty clipboard history after a reboot is often a privacy setting doing what it was designed to do — Windows does the same on purpose. Which setting to check in Klipper, GPaste and the GNOME Clipboard History extension, the autostart problem that looks like data loss, and how to move a history to a new machine.",
    date: "2026-11-02",
    tags: ["Clipboard", "Linux", "KDE"],
    readingMinutes: 4,
    related: ["kde-plasma-clipboard-history-not-working", "hide-clipboard-secrets-screen-sharing", "reuse-text-snippets-linux"],
    toc: [
      { id: "forgetting-is-often-the-default", title: "Forgetting is often the default" },
      { id: "make-your-clipboard-manager-keep-it", title: "Make your clipboard manager keep it" },
      { id: "or-it-isnt-running-yet", title: "Or it isn't running yet" },
      { id: "how-clipmer-keeps-your-history", title: "How Clipmer keeps your history" },
      { id: "moving-to-a-new-machine", title: "Moving to a new machine" },
    ],
  },
  {
    slug: "reuse-text-snippets-linux",
    title: "Stop retyping the same commands and replies on Linux",
    seoTitle: "Reuse Text Snippets on Linux Without Retyping",
    metaDescription:
      "Shell history, aliases, text expanders or a clipboard history? Where each stops for reusing commands and replies on Linux, and how to keep snippets for good.",
    description:
      "Shell history, aliases, editor snippets, text expanders like espanso and a clipboard history each solve part of retyping the same commands, addresses and replies. Where each one stops, and how to use a clipboard history as a snippet library that keeps the things you reuse.",
    date: "2026-11-02",
    tags: ["Productivity", "Linux", "Clipboard"],
    readingMinutes: 4,
    related: ["hide-clipboard-secrets-screen-sharing", "get-back-overwritten-clipboard-linux", "clipboard-history-after-reboot-linux"],
    toc: [
      { id: "the-tools-you-already-have-and-where-each-one-stops", title: "The tools you already have, and where each one stops" },
      { id: "using-clipboard-history-as-a-snippet-library", title: "Using clipboard history as a snippet library" },
      { id: "keeping-snippets-for-good", title: "Keeping snippets for good" },
      { id: "what-a-clipboard-history-wont-do", title: "What a clipboard history won't do" },
    ],
  },
  {
    slug: "ubuntu-setup-for-developers",
    title: "Ubuntu setup for developers: the short list",
    seoTitle: "Ubuntu Setup for Developers",
    metaDescription:
      "A fresh Ubuntu install to a working development machine: one apt command, the two tools that install under a different name, and what not to take from apt.",
    description:
      "A fresh Ubuntu install to a working development machine in about four minutes. One apt command for the whole base, the two packages that install under a different binary name, the one category you should never take from apt, and the things people set up the day after they needed them \u2014 backups and a clipboard history.",
    date: "2026-10-25",
    tags: ["Ubuntu", "Linux", "Tools"],
    readingMinutes: 4,
    related: ["linux-tools-worth-installing", "clipboard-history-ubuntu", "reuse-text-snippets-linux"],
    toc: [
      { id: "the-short-version", title: "The short version" },
      { id: "what-each-of-those-is-for", title: "What each of those is for" },
      {
        id: "the-one-thing-not-to-install-from-apt",
        title: "The one thing not to install from apt",
      },
      { id: "your-editor", title: "Your editor" },
      { id: "docker-if-you-need-it", title: "Docker, if you need it" },
      {
        id: "two-things-people-set-up-too-late",
        title: "Two things people set up too late",
      },
      { id: "what-to-skip", title: "What to skip" },
    ],
  },
  {
    slug: "linux-tools-worth-installing",
    title: "Linux tools worth installing in 2026, and the versions Ubuntu gets wrong",
    seoTitle: "Linux Tools Worth Installing in 2026",
    metaDescription:
      "Every version checked against a real Ubuntu 24.04 box: which tools apt gets right, which are years behind, and the two that install under a different name.",
    description:
      "Every \"must-have Linux tools\" list recommends the same tools and none of them tell you what apt actually installs. Ubuntu 24.04 ships fzf thirty releases behind upstream, a Flameshot that predates its own Wayland fix, and a Node.js that has been end-of-life since April 2025 \u2014 while the docker.io advice everyone still repeats is now wrong. Every version here was read from a real 24.04.4 system and compared against upstream on the same day.",
    date: "2026-08-21",
    tags: ["Linux", "Ubuntu", "Tools"],
    readingMinutes: 8,
    related: ["ubuntu-setup-for-developers", "clipboard-history-ubuntu", "copyq-alternatives"],
    toc: [
      { id: "why-every-list-like-this-is-wrong", title: "Why every list like this is wrong" },
      { id: "what-ubuntu-actually-ships", title: "What Ubuntu actually ships" },
      { id: "the-terminal-set", title: "The terminal set" },
      { id: "flameshot-predates-its-own-wayland-fix", title: "Flameshot predates its own Wayland fix" },
      { id: "keepassxc-is-six-security-releases-behind", title: "KeePassXC is six security releases behind" },
      { id: "timeshift-and-what-it-does-not-back-up", title: "Timeshift, and what it does not back up" },
      { id: "node-18-has-been-end-of-life-since-april-2025", title: "Node 18 has been end-of-life since April 2025" },
      { id: "the-docker-io-advice-everyone-repeats-is-out-of-date", title: "The docker.io advice everyone repeats is out of date" },
      { id: "clipboard-history-which-ubuntu-does-not-ship", title: "Clipboard history, which Ubuntu does not ship" },
      { id: "how-to-check-any-of-this-yourself", title: "How to check any of this yourself" },
      { id: "what-i-left-off-and-why", title: "What I left off, and why" },
    ],
  },
  {
    slug: "copyq-alternatives",
    title: "CopyQ alternatives on Linux, compared honestly",
    seoTitle: "CopyQ Alternatives on Linux (and CopyQ on Wayland)",
    metaDescription:
      "Leaving CopyQ over Wayland? Check your version first. Then GPaste, Klipper, Clipboard History, Ringboard and Clipmer compared, and when CopyQ still wins.",
    description:
      "CopyQ is not broken — it is the most capable clipboard manager on Linux and 17.0.0 shipped on 6 October 2026. People leave it over the dated Qt interface, the scripting they never use, or Wayland behaviour that is usually their distro shipping a three-year-old build. Here is what each alternative actually is, how it reads your clipboard, what it is licensed under, and when CopyQ is still the right answer.",
    date: "2026-08-08",
    updated: "2026-11-02",
    tags: ["Clipboard", "Linux", "Wayland"],
    readingMinutes: 20,
    related: ["best-clipboard-manager-wayland", "clipboard-manager-freezes-large-copy", "clipboard-history-after-reboot-linux"],
    toc: [
      { id: "why-people-actually-leave-copyq", title: "Why people actually leave CopyQ" },
      { id: "the-version-your-distro-ships-is-probably-the-problem", title: "The version your distro ships is probably the problem" },
      { id: "copyq-on-wayland-what-works-and-what-does-not", title: "CopyQ on Wayland: what works and what does not" },
      { id: "how-copyq-actually-reads-your-clipboard", title: "How CopyQ actually reads your clipboard" },
      { id: "the-alternatives-at-a-glance", title: "The alternatives at a glance" },
      { id: "gpaste", title: "GPaste" },
      { id: "pano", title: "Pano" },
      { id: "clipboard-history", title: "Clipboard History" },
      { id: "clipboard-indicator", title: "Clipboard Indicator" },
      { id: "klipper", title: "Klipper" },
      { id: "the-gtk-old-guard-diodon-parcellite-and-clipit", title: "The GTK old guard: Diodon, Parcellite and ClipIt" },
      { id: "clipmer", title: "Clipmer" },
      { id: "when-copyq-is-still-the-right-answer", title: "When CopyQ is still the right answer" },
      { id: "copyq-or-gpaste-on-gnome", title: "CopyQ or GPaste on GNOME?" },
      { id: "which-one-to-actually-try", title: "Which one to actually try" },
    ],
  },
  {
    slug: "best-clipboard-manager-wayland",
    title: "The best clipboard manager for Wayland depends on your compositor",
    seoTitle: "Wayland Clipboard Manager: GNOME, KDE, Hyprland, niri",
    metaDescription:
      "Pick by compositor: Clipboard History on GNOME, Klipper on KDE, cliphist on Hyprland, Sway and niri, and why cliphist fails on GNOME. Updated November 2026.",
    description:
      "On Wayland, which clipboard manager works is decided by your compositor, because the data-control protocols are not universally implemented. This is the per-compositor answer for GNOME, KDE Plasma, Hyprland, Sway, niri and the rest, checked against the protocol registry, the compositor source trees and the distro package indexes in August 2026 and re-checked in October and November 2026. It also covers the version traps that break the usual advice: wl-clipboard on KDE, Pano's upstream status, and how far behind Ubuntu's GPaste actually is.",
    date: "2026-08-08",
    updated: "2026-11-02",
    tags: ["Wayland", "Clipboard", "Linux"],
    readingMinutes: 14,
    related: ["clipboard-managers-on-wayland", "kde-plasma-clipboard-history-not-working", "xclip-not-working-wayland"],
    featured: true,
    toc: [
      { id: "the-short-answer", title: "The short answer" },
      { id: "why-the-answer-depends-on-your-compositor", title: "Why the answer depends on your compositor" },
      { id: "check-what-your-session-supports-first", title: "Check what your session supports first" },
      { id: "gnome-a-shell-extension-because-there-is-no-protocol", title: "GNOME: a shell extension, because there is no protocol" },
      { id: "kde-plasma-klipper-is-already-running", title: "KDE Plasma: Klipper is already running" },
      { id: "hyprland-cliphist-and-wl-clipboard", title: "Hyprland: cliphist and wl-clipboard" },
      { id: "sway-the-same-stack", title: "Sway: the same stack" },
      { id: "niri-cliphist-but-not-on-mod-v", title: "niri: cliphist, but not on Mod+V" },
      { id: "cosmic-wayfire-river-and-the-rest", title: "COSMIC, Wayfire, river and the rest" },
      { id: "where-clipmer-fits-and-where-it-does-not", title: "Where Clipmer fits, and where it does not" },
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
    related: ["hide-clipboard-secrets-screen-sharing", "clipboard-manager-saving-passwords-linux", "clear-clipboard-linux"],
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
    seoTitle: "Wayland Clipboard: How It Works, Why Managers Break",
    metaDescription:
      "How the Wayland clipboard works, why wl-paste --watch fails on GNOME, the wlr and ext data-control protocols, and which compositors implement them.",
    description:
      "Wayland deliberately forbids the one thing a clipboard manager needs to do. Here is the security model behind that, the two data-control protocols that work around it, which compositors implement which (GNOME implements neither), and how each Linux clipboard manager actually reads your clipboard.",
    date: "2026-08-01",
    updated: "2026-11-02",
    tags: ["Wayland", "Linux", "Clipboard"],
    readingMinutes: 11,
    related: ["best-clipboard-manager-wayland", "clipboard-manager-auto-paste-wayland", "xclip-not-working-wayland"],
    toc: [
      { id: "the-clipboard-is-not-a-buffer", title: "The clipboard is not a buffer" },
      { id: "what-wayland-actually-changed", title: "What Wayland actually changed" },
      { id: "the-escape-hatches", title: "The escape hatches" },
      { id: "which-compositors-support-what", title: "Which compositors support what" },
      { id: "how-to-tell-what-your-own-session-supports", title: "How to tell what your own session supports" },
      { id: "using-the-wayland-clipboard-from-the-terminal-wl-copy-and-wl-paste", title: "Using the Wayland clipboard from the terminal: wl-copy and wl-paste" },
      { id: "what-this-means-for-the-tools-you-already-know", title: "What this means for the tools you already know" },
      { id: "how-clipmer-does-it-specifically", title: "How Clipmer does it, specifically" },
      { id: "the-trade-off-nobody-advertises", title: "The trade-off nobody advertises" },
    ],
  },
  {
    slug: "clipboard-history-ubuntu",
    title: "Clipboard history on Ubuntu: the complete guide",
    seoTitle: "Clipboard History on Ubuntu 24.04 and 26.04",
    metaDescription:
      "Ubuntu has no built-in clipboard history, and Super+V opens notifications instead. Four tested ways to add one on 24.04 and 26.04, with the shortcuts.",
    description:
      "Ubuntu ships no clipboard history. Four options that work on both Ubuntu 24.04 and 26.04 LTS — Clipboard History, GPaste, CopyQ, and Clipmer — with install commands checked on each release, what happened to Pano, and what to do when an extension stops loading after the upgrade.",
    date: "2026-08-01",
    updated: "2026-11-02",
    tags: ["Ubuntu", "GNOME", "Clipboard"],
    readingMinutes: 8,
    related: ["win-v-clipboard-history-linux", "clipboard-extension-stopped-working-gnome-upgrade", "clipboard-history-linux-mint"],
    featured: true,
    toc: [
      { id: "first-check-which-session-you-are-in", title: "First, check which session you are in" },
      { id: "how-to-see-what-is-on-your-clipboard-right-now", title: "How to see what is on your clipboard right now" },
      { id: "option-1-clipboard-history-extension", title: "Option 1: Clipboard History extension" },
      { id: "option-2-gpaste", title: "Option 2: GPaste" },
      { id: "option-3-copyq", title: "Option 3: CopyQ" },
      { id: "option-4-clipmer", title: "Option 4: Clipmer" },
      { id: "which-one-should-you-actually-install", title: "Which one should you actually install" },
      { id: "how-to-open-clipboard-history-on-ubuntu-the-shortcut", title: "How to open clipboard history on Ubuntu (the shortcut)" },
      { id: "what-happened-to-pano", title: "What happened to Pano" },
      { id: "upgraded-from-24-04-check-your-extensions-still-load", title: "Upgraded from 24.04? Check your extensions still load" },
      { id: "one-thing-worth-knowing-before-you-install-any-of-these", title: "One thing worth knowing before you install any of these" },
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
  "clipboard-extension-stopped-working-gnome-upgrade": () =>
    import("@/content/blog/clipboard-extension-stopped-working-gnome-upgrade.mdx"),
  "clipboard-history-fedora": () =>
    import("@/content/blog/clipboard-history-fedora.mdx"),
  "clipboard-manager-saving-passwords-linux": () =>
    import("@/content/blog/clipboard-manager-saving-passwords-linux.mdx"),
  "clipboard-history-linux-mint": () =>
    import("@/content/blog/clipboard-history-linux-mint.mdx"),
  "xclip-not-working-wayland": () =>
    import("@/content/blog/xclip-not-working-wayland.mdx"),
  "clear-clipboard-linux": () =>
    import("@/content/blog/clear-clipboard-linux.mdx"),
  "get-back-overwritten-clipboard-linux": () =>
    import("@/content/blog/get-back-overwritten-clipboard-linux.mdx"),
  "clipboard-empty-after-closing-app-linux": () =>
    import("@/content/blog/clipboard-empty-after-closing-app-linux.mdx"),
  "win-v-clipboard-history-linux": () =>
    import("@/content/blog/win-v-clipboard-history-linux.mdx"),
  "clipboard-manager-auto-paste-wayland": () =>
    import("@/content/blog/clipboard-manager-auto-paste-wayland.mdx"),
  "clipboard-shortcut-not-working-wayland": () =>
    import("@/content/blog/clipboard-shortcut-not-working-wayland.mdx"),
  "kde-plasma-clipboard-history-not-working": () =>
    import("@/content/blog/kde-plasma-clipboard-history-not-working.mdx"),
  "hide-clipboard-secrets-screen-sharing": () =>
    import("@/content/blog/hide-clipboard-secrets-screen-sharing.mdx"),
  "clipboard-manager-freezes-large-copy": () =>
    import("@/content/blog/clipboard-manager-freezes-large-copy.mdx"),
  "clipboard-history-after-reboot-linux": () =>
    import("@/content/blog/clipboard-history-after-reboot-linux.mdx"),
  "reuse-text-snippets-linux": () =>
    import("@/content/blog/reuse-text-snippets-linux.mdx"),
  "ubuntu-setup-for-developers": () =>
    import("@/content/blog/ubuntu-setup-for-developers.mdx"),
  "linux-tools-worth-installing": () =>
    import("@/content/blog/linux-tools-worth-installing.mdx"),
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
