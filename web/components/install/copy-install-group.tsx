"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, Check, Copy } from "lucide-react";
import { ASSETS, SUPPORTED_ARCH, VERSION } from "@/lib/release";
import { cn } from "@/lib/utils";

/**
 * The three install commands as a button group. Fastest possible path for the
 * audience this page is aimed at: no navigation, no picking a file out of a
 * releases list, just paste into a terminal.
 *
 * Kept identical to the commands on /install — curl rather than wget, because
 * Fedora does not ship wget by default and curl shows a progress meter without
 * being asked.
 */
const OPTIONS = [
  {
    id: "deb",
    label: ".deb",
    hint: "Ubuntu · Debian",
    command: `curl -LO ${ASSETS.deb.url} && sudo apt install ./${ASSETS.deb.file}`,
  },
  {
    id: "rpm",
    label: ".rpm",
    hint: "Fedora · RHEL",
    command: `curl -LO ${ASSETS.rpm.url} && sudo dnf install ./${ASSETS.rpm.file}`,
  },
  {
    id: "appimage",
    label: "AppImage",
    hint: "Any distro",
    command: `mkdir -p ~/Applications && curl -L -o ~/Applications/Clipmer.AppImage.part ${ASSETS.appImage.url} && chmod +x ~/Applications/Clipmer.AppImage.part && mv -f ~/Applications/Clipmer.AppImage.part ~/Applications/Clipmer.AppImage`,
  },
] as const;

type OptionId = (typeof OPTIONS)[number]["id"];

export function CopyInstallGroup({
  className,
  /** "terminal" is the hero CTA: one visible command plus a format picker.
   *  "stacked" is the compact three-button group with a label above. */
  layout = "stacked",
}: {
  className?: string;
  layout?: "terminal" | "stacked";
}) {
  const [copied, setCopied] = useState<string | null>(null);
  const [selected, setSelected] = useState<OptionId>("deb");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  async function copy(id: string, command: string) {
    try {
      await navigator.clipboard.writeText(command);
    } catch {
      // Needs a secure context and can be blocked outright. Say nothing rather
      // than claim a copy that did not happen.
      return;
    }
    setCopied(id);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(null), 2000);
  }

  if (layout === "terminal") {
    const option = OPTIONS.find((o) => o.id === selected) ?? OPTIONS[0];
    const isCopied = copied === option.id;
    return (
      <div className={cn("flex w-full flex-col items-center gap-4", className)}>
        <div
          role="group"
          aria-label="Package format"
          className="inline-flex gap-0.5 rounded-lg border border-white/[0.06] bg-surface/55 p-[3px]"
        >
          {OPTIONS.map((o) => (
            <button
              key={o.id}
              type="button"
              aria-pressed={o.id === selected}
              onClick={() => setSelected(o.id)}
              className={cn(
                "inline-flex flex-col items-center rounded-md px-3 py-1.5 text-[13px] leading-tight font-medium transition-colors",
                o.id === selected
                  ? "bg-surface text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {o.label}
              <span
                className={cn(
                  "text-[10px] font-normal",
                  o.id === selected ? "text-muted-foreground" : "text-muted-foreground/70"
                )}
              >
                {o.hint}
              </span>
            </button>
          ))}
        </div>

        {/* The command is shown in full rather than hidden behind a button: the
            audience for a clipboard-privacy tool wants to read what it pastes
            into a root shell. It scrolls sideways instead of wrapping. */}
        <div className="flex w-full max-w-[640px] flex-col overflow-hidden rounded-xl border border-orange/35 bg-gradient-to-b from-[#181818] to-[#131313] shadow-[0_0_0_4px_rgba(233,84,32,0.06),0_18px_40px_-16px_rgba(233,84,32,0.35)] sm:flex-row">
          <div className="flex h-14 min-w-0 items-center gap-2.5 px-4 font-mono text-[15px] sm:flex-1">
            <span aria-hidden className="shrink-0 font-bold text-orange">
              $
            </span>
            <code
              title={option.command}
              className="min-w-0 overflow-x-auto whitespace-nowrap text-foreground select-all [mask-image:linear-gradient(90deg,#000_82%,transparent)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {option.command}
            </code>
          </div>
          <button
            type="button"
            onClick={() => copy(option.id, option.command)}
            // The visible text changes to "Copied", so the accessible name has
            // to say which command it was.
            aria-label={
              isCopied
                ? `${option.label} install command copied`
                : `Copy ${option.label} install command for ${option.hint}`
            }
            className={cn(
              "group/btn relative inline-flex h-12 shrink-0 items-center justify-center gap-2 overflow-hidden px-6 text-[15px] font-bold transition-colors sm:h-auto",
              isCopied
                ? "bg-[#2a2a2a] text-orange"
                : "bg-orange text-white hover:bg-orange-hover"
            )}
          >
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 ease-out group-hover/btn:translate-x-full motion-reduce:transition-none"
            />
            {isCopied ? (
              <Check className="relative size-4" />
            ) : (
              <Copy className="relative size-4" />
            )}
            <span className="relative">{isCopied ? "Copied" : "Copy"}</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-x-3.5 gap-y-1.5 text-[13px] text-muted-foreground/70">
          <span>
            Paste into a terminal &middot; {SUPPORTED_ARCH} &middot; v{VERSION}
          </span>
          <a
            href="#download"
            className="inline-flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-foreground"
          >
            or download the package
            <ArrowRight aria-hidden className="size-3.5" />
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      <span className="text-xs text-muted-foreground">
        Or copy the install command
      </span>
      <div
        role="group"
        aria-label="Copy install command"
        className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface/40 p-1"
      >
        {OPTIONS.map((o) => {
          const isCopied = copied === o.id;
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => copy(o.id, o.command)}
              title={`${o.label} — ${o.hint}`}
              // The visible text changes to "Copied", so the accessible name has
              // to say which command it was.
              aria-label={
                isCopied
                  ? `${o.label} install command copied`
                  : `Copy ${o.label} install command for ${o.hint}`
              }
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                isCopied
                  ? "bg-orange/15 text-orange"
                  : "text-muted-foreground hover:bg-surface hover:text-foreground"
              )}
            >
              {isCopied ? (
                <Check className="size-3.5" />
              ) : (
                <Copy className="size-3.5 opacity-60" />
              )}
              {isCopied ? "Copied" : o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
