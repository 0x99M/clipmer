"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Check, ChevronDown, Minus, Search, X } from "lucide-react";
import {
  COMPOSITORS,
  DESKTOP_HINTS,
  ROUTE_LABELS,
  getCompositor,
  type Compositor,
  type Route,
} from "@/lib/wayland-support";
import { cn } from "@/lib/utils";

type Filter = Route | "all";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "data-control", label: ROUTE_LABELS["data-control"] },
  { value: "in-process", label: ROUTE_LABELS["in-process"] },
  { value: "none", label: ROUTE_LABELS.none },
];

/** Support is never signalled by colour alone — the word carries it. */
function ProtocolCell({ supported, label }: { supported: boolean; label: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border px-2 py-1 text-xs font-medium",
        supported
          ? "border-green-500/30 bg-green-500/10 text-green-400"
          : "border-border bg-surface/40 text-muted-foreground"
      )}
    >
      {supported ? (
        <Check className="size-3.5 shrink-0" aria-hidden />
      ) : (
        <Minus className="size-3.5 shrink-0" aria-hidden />
      )}
      <span className="font-mono">{label}</span>
      <span className="sr-only">{supported ? "supported" : "not supported"}</span>
    </span>
  );
}

function matches(c: Compositor, q: string) {
  if (!q) return true;
  const needle = q.toLowerCase();
  return (
    c.name.toLowerCase().includes(needle) ||
    (c.desktop?.toLowerCase().includes(needle) ?? false) ||
    c.shipsWith.some((s) => s.toLowerCase().includes(needle))
  );
}

export function SupportMatrix() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const inputRef = useRef<HTMLInputElement>(null);

  // These anchors are the reason the page is worth linking to — someone answers
  // "why doesn't cliphist work on GNOME" with /…#mutter, and the row it points
  // at has to be expanded when the reader lands on it.
  //
  // Done by mutating the element rather than through state: <details> keeps its
  // own open flag, so driving it from React would mean mirroring browser state
  // we do not otherwise need, and setting that state from an effect costs a
  // second render pass of the whole list.
  useEffect(() => {
    const id = decodeURIComponent(window.location.hash.slice(1));
    if (!id) return;
    const el = document.getElementById(id);
    if (!(el instanceof HTMLDetailsElement)) return;
    el.open = true;
    el.scrollIntoView({ block: "start" });
  }, []);

  const results = useMemo(
    () =>
      COMPOSITORS.filter(
        (c) => matches(c, query) && (filter === "all" || c.route === filter)
      ),
    [query, filter]
  );

  return (
    <div>
      {/* ── Controls ─────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-card/50 p-4 sm:p-5">
        <label htmlFor="compositor-search" className="sr-only">
          Search compositors, desktops and distributions
        </label>
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <input
            id="compositor-search"
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search — Hyprland, KDE, Ubuntu, Linux Mint…"
            className="w-full rounded-lg border border-border bg-background py-2.5 pl-9 pr-9 text-sm text-foreground placeholder:text-muted-foreground focus:border-orange focus:outline-none focus:ring-1 focus:ring-orange"
          />
          {query ? (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                inputRef.current?.focus();
              }}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-surface/60 hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          ) : null}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setFilter(f.value)}
              aria-pressed={filter === f.value}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                filter === f.value
                  ? "border-orange/40 bg-orange/15 text-orange"
                  : "border-border text-muted-foreground hover:bg-surface/50 hover:text-foreground"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="mt-4 border-t border-border/60 pt-3">
          <p className="text-xs text-muted-foreground">
            Not sure what you are running? Pick your system:
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {DESKTOP_HINTS.map((hint) => (
              <button
                key={hint.label}
                type="button"
                // Searches the compositor's name rather than the label, for two
                // reasons: "Ubuntu" also appears in Sway's and Fedora's rows,
                // and putting "Mutter" in the box is how someone learns what
                // their desktop actually runs. The verdict is already in the
                // collapsed summary, so no second interaction is needed.
                onClick={() => {
                  setFilter("all");
                  setQuery(getCompositor(hint.compositor)?.name ?? hint.label);
                }}
                className="rounded-md border border-border/70 px-2 py-1 text-xs text-muted-foreground transition-colors hover:border-orange/40 hover:text-orange"
              >
                {hint.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Results ──────────────────────────────────────────────────── */}
      <p className="mt-5 text-sm text-muted-foreground" aria-live="polite">
        {results.length} of {COMPOSITORS.length} compositors
      </p>

      {results.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-border p-8 text-center">
          <p className="text-sm text-muted-foreground">
            Nothing matches that. The registry tracks {COMPOSITORS.length}{" "}
            compositors — if yours is not among them, it is not tracked upstream
            and you will have to test it with the commands below.
          </p>
        </div>
      ) : null}

      <div className="mt-4 space-y-3">
        {results.map((c) => (
          <details
            key={c.id}
            id={c.id}
            className="group scroll-mt-20 overflow-hidden rounded-xl border border-border bg-card/50 transition-colors open:border-border hover:border-border/80"
          >
            <summary className="flex cursor-pointer list-none items-start gap-3 p-4 sm:p-5 [&::-webkit-details-marker]:hidden">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <h3 className="text-base font-semibold text-foreground">
                    {c.name}
                  </h3>
                  {c.desktop && c.desktop !== c.name ? (
                    <span className="text-sm text-muted-foreground">
                      {c.desktop}
                    </span>
                  ) : null}
                  <span className="font-mono text-xs text-muted-foreground/70">
                    {c.tracked}
                  </span>
                </div>

                <p className="mt-1.5 text-sm leading-relaxed text-foreground/80">
                  {c.verdict}
                </p>

                <div className="mt-3 flex flex-wrap gap-2">
                  <ProtocolCell supported={c.ext} label="ext-data-control-v1" />
                  <ProtocolCell supported={c.wlr} label="wlr-data-control" />
                </div>
              </div>

              <ChevronDown
                className="mt-1 size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
                aria-hidden
              />
            </summary>

            <div className="border-t border-border/60 px-4 pb-5 pt-4 sm:px-5">
              <p className="text-sm leading-relaxed text-foreground/75">
                {c.detail}
              </p>

              {c.caveat ? (
                <div className="mt-4 rounded-lg border border-orange/25 bg-orange/[0.07] p-3.5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-orange">
                    Watch out
                  </p>
                  <p className="mt-1.5 text-sm leading-relaxed text-foreground/80">
                    {c.caveat}
                  </p>
                </div>
              ) : null}

              {c.tools.length > 0 ? (
                <div className="mt-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    What to run
                  </p>
                  <ul className="mt-2 space-y-1.5">
                    {c.tools.map((t) => (
                      <li
                        key={t.name}
                        className="flex flex-wrap items-baseline gap-x-2 text-sm"
                      >
                        {t.href ? (
                          t.href.startsWith("/") ? (
                            <Link
                              href={t.href}
                              className="font-medium text-orange transition-opacity hover:opacity-80"
                            >
                              {t.name}
                            </Link>
                          ) : (
                            <a
                              href={t.href}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-medium text-foreground underline decoration-border underline-offset-4 transition-colors hover:decoration-orange"
                            >
                              {t.name}
                            </a>
                          )
                        ) : (
                          <span className="font-medium text-foreground">
                            {t.name}
                          </span>
                        )}
                        <span className="text-muted-foreground">— {t.how}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span>
                  Ships with: {c.shipsWith.join(", ")}
                </span>
                <a
                  href={`#${c.id}`}
                  className="transition-colors hover:text-orange"
                >
                  Link to this row
                </a>
              </div>
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}
