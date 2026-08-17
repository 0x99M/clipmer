/**
 * Which Wayland compositors let a clipboard manager work, and what to run on
 * each. The two blog articles carry a static version of the protocol columns;
 * this is the queryable form, extended to every compositor the registry tracks
 * and to the "so what do I install" half that a table cannot express.
 *
 * Every protocol cell below was read from the compositor support matrix at
 * wayland.app on VERIFIED_ON by parsing the table markup, not by eye. The
 * registry renders `x` for no support and an integer for the supported
 * interface version, which is easy to misread as a version column — an earlier
 * pass did exactly that and came back with "everything supports everything".
 *
 * Support moves. Re-read the registry and bump VERIFIED_ON rather than editing
 * cells from memory.
 */

export const VERIFIED_ON = "2026-08-17";

/** How a clipboard manager can reach the selection on this compositor. */
export type Route =
  /** A data-control protocol is available: ordinary tools work. */
  | "data-control"
  /** No protocol; the manager has to run inside the compositor process. */
  | "in-process"
  /** Neither — nothing can watch the clipboard on a native session. */
  | "none";

export type Kind = "desktop" | "tiling" | "mobile" | "embedded";

export type Tool = {
  name: string;
  /** How it gets at the clipboard here. */
  how: string;
  href?: string;
};

export type Compositor = {
  /** Anchor id — these URLs get pasted into forum replies, so keep them stable. */
  id: string;
  name: string;
  /** The desktop it is the compositor for, where that differs from the name. */
  desktop?: string;
  /** Version the registry tracked on VERIFIED_ON. */
  tracked: string;
  ext: boolean;
  wlr: boolean;
  kind: Kind;
  route: Route;
  /** Where a person is likely to meet it, for people who do not know what they run. */
  shipsWith: string[];
  /** One line, written to be readable on its own in a search result. */
  verdict: string;
  detail: string;
  tools: Tool[];
  /** The trap, where there is one. */
  caveat?: string;
};

/**
 * Ordered by how likely a reader is to be running it, not alphabetically: the
 * two mainstream desktops with no protocol support come first because they are
 * the ones whose users are searching for why nothing works.
 */
export const COMPOSITORS: Compositor[] = [
  {
    id: "mutter",
    name: "Mutter",
    desktop: "GNOME",
    tracked: "49.2",
    ext: false,
    wlr: false,
    kind: "desktop",
    route: "in-process",
    shipsWith: ["Ubuntu", "Fedora Workstation", "Debian (GNOME)", "RHEL", "Zorin OS"],
    verdict: "No protocol support — a GNOME Shell extension is the only native route.",
    detail:
      "Mutter implements neither data-control protocol, so every tool built on wl-paste --watch fails here regardless of how well it works elsewhere. A GNOME Shell extension sidesteps the question by running as JavaScript inside Mutter's own process, where it can reach the internal selection API directly. The trade-off is that a GNOME version bump can break every extension at once.",
    tools: [
      { name: "Clipboard History", how: "GNOME Shell extension", href: "https://extensions.gnome.org/extension/4839/clipboard-history/" },
      { name: "GPaste", how: "GNOME Shell extension plus a daemon", href: "https://github.com/Keruspe/GPaste" },
      { name: "Clipmer", how: "Electron under XWayland", href: "/install" },
      { name: "CopyQ", how: "XWayland, with caveats", href: "https://github.com/hluk/CopyQ" },
    ],
    caveat:
      "cliphist, clipman and clipse all fail on GNOME. wl-paste --watch exits with \"Watch mode requires a compositor that supports the data-control protocol\" — that message means the protocol is absent, not that the tool is misconfigured.",
  },
  {
    id: "muffin",
    name: "Muffin",
    desktop: "Cinnamon",
    tracked: "6.6.0",
    ext: false,
    wlr: false,
    kind: "desktop",
    route: "in-process",
    shipsWith: ["Linux Mint", "LMDE"],
    verdict: "No protocol support, and no extension ecosystem to fall back on.",
    detail:
      "Muffin is Mutter's fork and inherits the same gap without inheriting GNOME's extension route, which makes Cinnamon the least served of the mainstream desktops on a Wayland session. Cinnamon's Wayland session is still marked experimental and Mint defaults to X11, so in practice most Cinnamon users are on X11 — where every X11 clipboard manager works normally.",
    tools: [
      { name: "Any X11 manager", how: "On the default X11 session, unrestricted" },
      { name: "Clipmer", how: "Electron under XWayland", href: "/install" },
      { name: "CopyQ", how: "XWayland, with caveats", href: "https://github.com/hluk/CopyQ" },
    ],
    caveat:
      "Check which session you are actually in before concluding anything — on Cinnamon it is usually X11, and none of the Wayland restrictions apply there.",
  },
  {
    id: "kwin",
    name: "KWin",
    desktop: "KDE Plasma",
    tracked: "6.6",
    ext: true,
    wlr: false,
    kind: "desktop",
    route: "data-control",
    shipsWith: ["Kubuntu", "Fedora KDE", "openSUSE", "SteamOS (desktop mode)"],
    verdict: "Works — Klipper is already running, and external tools need wl-clipboard 2.3.0 or newer.",
    detail:
      "KDE skipped the wlroots protocol and implemented the standardised ext-data-control-v1 instead, so KWin is the clearest case of \"supports one, not the other\". Klipper ships with Plasma and needs no protocol at all. External tools work too, subject to the version gate below.",
    tools: [
      { name: "Klipper", how: "Built into Plasma" },
      { name: "cliphist", how: "wl-clipboard, via ext-data-control-v1", href: "https://github.com/sentriz/cliphist" },
      { name: "Clipmer", how: "Electron under XWayland", href: "/install" },
    ],
    caveat:
      "wl-clipboard only learned ext-data-control-v1 in 2.3.0, released 22 March 2026. Because KWin implements no other data-control protocol, anything older than that cannot watch the clipboard on KDE at all — cliphist and every pipeline built on it included. Check with wl-copy --version before assuming the tool is at fault.",
  },
  {
    id: "hyprland",
    name: "Hyprland",
    tracked: "0.52.1",
    ext: true,
    wlr: true,
    kind: "tiling",
    route: "data-control",
    shipsWith: ["Arch", "NixOS", "Fedora (COPR)"],
    verdict: "Works — both protocols, so any data-control tool is fine.",
    detail:
      "Hyprland implements ext-data-control-v1 and wlr-data-control, which means it works with both current tools and older ones written against the wlroots protocol. This is the configuration most clipboard-manager documentation assumes.",
    tools: [
      { name: "cliphist", how: "wl-clipboard, via data-control", href: "https://github.com/sentriz/cliphist" },
      { name: "clipse", how: "Terminal UI over data-control", href: "https://github.com/savedra1/clipse" },
      { name: "Clipmer", how: "Electron under XWayland", href: "/install" },
    ],
  },
  {
    id: "sway",
    name: "Sway",
    tracked: "1.11",
    ext: true,
    wlr: true,
    kind: "tiling",
    route: "data-control",
    shipsWith: ["Debian", "Ubuntu", "Arch", "Fedora"],
    verdict: "Works — both protocols.",
    detail:
      "Sway is the wlroots compositor the original wlr-data-control protocol was designed against, and it has since added the standardised successor as well. Everything in the usual Wayland clipboard stack works here.",
    tools: [
      { name: "cliphist", how: "wl-clipboard, via data-control", href: "https://github.com/sentriz/cliphist" },
      { name: "clipman", how: "wl-clipboard, via data-control", href: "https://github.com/yory8/clipman" },
      { name: "Clipmer", how: "Electron under XWayland", href: "/install" },
    ],
  },
  {
    id: "niri",
    name: "niri",
    tracked: "25.11",
    ext: true,
    wlr: true,
    kind: "tiling",
    route: "data-control",
    shipsWith: ["Arch", "NixOS", "Fedora (COPR)"],
    verdict: "Works — both protocols.",
    detail:
      "niri implements both data-control protocols, so the standard scrolling-WM clipboard stack works without special handling.",
    tools: [
      { name: "cliphist", how: "wl-clipboard, via data-control", href: "https://github.com/sentriz/cliphist" },
      { name: "clipse", how: "Terminal UI over data-control", href: "https://github.com/savedra1/clipse" },
    ],
  },
  {
    id: "cosmic",
    name: "COSMIC",
    desktop: "COSMIC",
    tracked: "1.0.0~beta.8",
    ext: true,
    wlr: true,
    kind: "desktop",
    route: "data-control",
    shipsWith: ["Pop!_OS", "Fedora COSMIC", "Redox"],
    verdict: "Works — both protocols.",
    detail:
      "System76's compositor implements both data-control protocols, which puts COSMIC in a better position for clipboard managers than either GNOME or Cinnamon out of the box.",
    tools: [
      { name: "cliphist", how: "wl-clipboard, via data-control", href: "https://github.com/sentriz/cliphist" },
      { name: "Clipmer", how: "Electron under XWayland", href: "/install" },
    ],
  },
  {
    id: "labwc",
    name: "labwc",
    tracked: "0.9.2",
    ext: true,
    wlr: true,
    kind: "desktop",
    route: "data-control",
    shipsWith: ["Debian", "Arch", "Alpine"],
    verdict: "Works — both protocols.",
    detail:
      "labwc is a wlroots-based stacking compositor in the Openbox tradition and implements both data-control protocols.",
    tools: [
      { name: "cliphist", how: "wl-clipboard, via data-control", href: "https://github.com/sentriz/cliphist" },
    ],
  },
  {
    id: "wayfire",
    name: "Wayfire",
    tracked: "0.9.0",
    ext: false,
    wlr: true,
    kind: "desktop",
    route: "data-control",
    shipsWith: ["Debian", "Arch", "Alpine"],
    verdict: "Works, but only with tools that speak the older wlroots protocol.",
    detail:
      "Wayfire is the mirror image of KWin: it implements wlr-data-control and not the standardised successor. A tool written strictly against ext-data-control-v1 will find nothing here, while anything built on the wlroots protocol works fine.",
    tools: [
      { name: "cliphist", how: "wl-clipboard, via wlr-data-control", href: "https://github.com/sentriz/cliphist" },
    ],
    caveat:
      "wlr-data-control now carries a deprecation notice in the registry directing new work at ext-data-control-v1. Nothing breaks today, but this is the side of the split that will need migrating.",
  },
  {
    id: "river",
    name: "river",
    tracked: "0.3.13",
    ext: false,
    wlr: true,
    kind: "tiling",
    route: "data-control",
    shipsWith: ["Arch", "NixOS", "Alpine"],
    verdict: "Works, but only with tools that speak the older wlroots protocol.",
    detail:
      "river implements wlr-data-control only. The common tools all still bind it, so in practice the usual stack works.",
    tools: [
      { name: "cliphist", how: "wl-clipboard, via wlr-data-control", href: "https://github.com/sentriz/cliphist" },
      { name: "clipman", how: "wl-clipboard, via wlr-data-control", href: "https://github.com/yory8/clipman" },
    ],
  },
  {
    id: "phoc",
    name: "phoc",
    desktop: "Phosh",
    tracked: "0.52",
    ext: false,
    wlr: true,
    kind: "mobile",
    route: "data-control",
    shipsWith: ["Librem 5", "PinePhone", "postmarketOS"],
    verdict: "Works, but only with tools that speak the older wlroots protocol.",
    detail:
      "phoc is the compositor behind the Phosh mobile shell and implements wlr-data-control only. Clipboard managers are an unusual thing to want on a phone, but the protocol is there.",
    tools: [
      { name: "wl-clipboard", how: "Directly, via wlr-data-control", href: "https://github.com/bugaevc/wl-clipboard" },
    ],
  },
  {
    id: "mir",
    name: "Mir",
    tracked: "2.26",
    ext: true,
    wlr: false,
    kind: "embedded",
    route: "data-control",
    shipsWith: ["Ubuntu Frame", "Miriway", "Ubuntu Touch"],
    verdict: "Works with tools that speak ext-data-control-v1.",
    detail:
      "Canonical's compositor library implements the standardised protocol and not the wlroots one, so it has the same version considerations as KDE.",
    tools: [
      { name: "wl-clipboard 2.3.0+", how: "Directly, via ext-data-control-v1", href: "https://github.com/bugaevc/wl-clipboard" },
    ],
    caveat:
      "As with KWin, wl-clipboard older than 2.3.0 does not speak ext-data-control-v1 and will find no clipboard here.",
  },
  {
    id: "treeland",
    name: "Treeland",
    desktop: "Deepin",
    tracked: "0.8.0",
    ext: true,
    wlr: true,
    kind: "desktop",
    route: "data-control",
    shipsWith: ["Deepin"],
    verdict: "Works — both protocols.",
    detail:
      "Deepin's compositor implements both data-control protocols.",
    tools: [
      { name: "wl-clipboard", how: "Directly, via data-control", href: "https://github.com/bugaevc/wl-clipboard" },
    ],
  },
  {
    id: "jay",
    name: "Jay",
    tracked: "1.12.0",
    ext: true,
    wlr: true,
    kind: "tiling",
    route: "data-control",
    shipsWith: ["Arch (AUR)", "Built from source"],
    verdict: "Works — both protocols.",
    detail:
      "An independent compositor written in Rust, implementing both data-control protocols.",
    tools: [
      { name: "wl-clipboard", how: "Directly, via data-control", href: "https://github.com/bugaevc/wl-clipboard" },
    ],
  },
  {
    id: "gamescope",
    name: "GameScope",
    tracked: "3.15.14",
    ext: false,
    wlr: false,
    kind: "embedded",
    route: "none",
    shipsWith: ["Steam Deck (game mode)", "Steam"],
    verdict: "No data-control support — but this is a game session, not a desktop.",
    detail:
      "GameScope is a micro-compositor for running games under a fixed resolution and refresh rate. Clipboard history is not a use case it serves, and on a Steam Deck the desktop mode you would actually want it in runs KWin instead.",
    tools: [],
  },
  {
    id: "cage",
    name: "Cage",
    tracked: "0.2.0",
    ext: false,
    wlr: false,
    kind: "embedded",
    route: "none",
    shipsWith: ["Kiosk deployments", "Digital signage"],
    verdict: "No data-control support — a single-application kiosk shell.",
    detail:
      "Cage runs exactly one application fullscreen. There is no second client to hold a clipboard history, which is why the protocol is absent rather than an oversight.",
    tools: [],
  },
  {
    id: "louvre",
    name: "Louvre",
    tracked: "2.14.1",
    ext: false,
    wlr: false,
    kind: "embedded",
    route: "none",
    shipsWith: ["Built from source"],
    verdict: "No data-control support.",
    detail:
      "Louvre is a C++ library for building compositors rather than a compositor people run as a desktop. Whether clipboard managers work depends on what a downstream author implements on top of it.",
    tools: [],
  },
  {
    id: "weston",
    name: "Weston",
    tracked: "14.0.2",
    ext: false,
    wlr: false,
    kind: "embedded",
    route: "none",
    shipsWith: ["Reference implementation", "Embedded systems"],
    verdict: "No data-control support — the reference compositor implements the core protocol only.",
    detail:
      "Weston exists to demonstrate the protocol, and the core protocol deliberately withholds clipboard access from unfocused clients. No clipboard manager can watch the selection on a Weston session.",
    tools: [],
  },
];

/**
 * For readers who do not know what their compositor is — which is most of the
 * people the "why doesn't my clipboard manager work" search brings here.
 */
export const DESKTOP_HINTS: { label: string; compositor: string }[] = [
  { label: "Ubuntu", compositor: "mutter" },
  { label: "Fedora Workstation", compositor: "mutter" },
  { label: "Debian (GNOME)", compositor: "mutter" },
  { label: "Linux Mint", compositor: "muffin" },
  { label: "Kubuntu / KDE Plasma", compositor: "kwin" },
  { label: "Pop!_OS", compositor: "cosmic" },
  { label: "Steam Deck (desktop mode)", compositor: "kwin" },
  { label: "Deepin", compositor: "treeland" },
  { label: "Phosh (Librem 5, PinePhone)", compositor: "phoc" },
];

/** The three commands that settle it on the reader's own machine. */
export const CHECKS: { command: string; explains: string }[] = [
  {
    command: "echo $XDG_SESSION_TYPE",
    explains:
      "Which session you are in. If this prints x11, none of the Wayland restrictions apply and any X11 clipboard manager works.",
  },
  {
    command: "wayland-info | grep -i data_control",
    explains:
      "Which data-control protocols your compositor advertises. Nothing printed means no third-party clipboard manager can watch your clipboard. Ships in the wayland-utils package on Debian and Ubuntu.",
  },
  {
    command: 'wl-paste --watch echo "copied at $(date +%T)"',
    explains:
      "The definitive test. If this prints on every copy, cliphist and everything like it will work. If it exits complaining that watch mode requires data-control, your compositor has neither protocol.",
  },
];

export const SOURCES: { label: string; href: string; backs: string }[] = [
  {
    label: "ext-data-control-v1 — Wayland protocol registry",
    href: "https://wayland.app/protocols/ext-data-control-v1",
    backs: "Every ext-data-control-v1 column and the tracked compositor versions.",
  },
  {
    label: "wlr-data-control-unstable-v1 — Wayland protocol registry",
    href: "https://wayland.app/protocols/wlr-data-control-unstable-v1",
    backs: "Every wlr-data-control column, and the deprecation notice on it.",
  },
  {
    label: "wl-clipboard v2.3.0 release notes",
    href: "https://github.com/bugaevc/wl-clipboard/releases/tag/v2.3.0",
    backs: "That ext-data-control-v1 support arrived in wl-clipboard 2.3.0 on 22 March 2026.",
  },
  {
    label: "mutter#524 — request for wlr-data-control support",
    href: "https://gitlab.gnome.org/GNOME/mutter/-/work_items/524",
    backs: "That GNOME's position on data-control is settled rather than pending.",
  },
];

export const ROUTE_LABELS: Record<Route, string> = {
  "data-control": "Standard tools work",
  "in-process": "Needs a compositor-specific tool",
  none: "Nothing can watch the clipboard",
};

export function getCompositor(id: string): Compositor | undefined {
  return COMPOSITORS.find((c) => c.id === id);
}
