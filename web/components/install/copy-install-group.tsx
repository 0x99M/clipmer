"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";
import { ASSETS } from "@/lib/release";
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
    command: `mkdir -p ~/Applications && curl -L -o ~/Applications/Clipmer.AppImage ${ASSETS.appImage.url} && chmod +x ~/Applications/Clipmer.AppImage`,
  },
] as const;

export function CopyInstallGroup({
  className,
  /** "inline" sits beside a button in a CTA row; "stacked" puts the label above. */
  layout = "stacked",
}: {
  className?: string;
  layout?: "inline" | "stacked";
}) {
  const [copied, setCopied] = useState<string | null>(null);
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

  const inline = layout === "inline";

  return (
    <div
      className={cn(
        inline ? "flex justify-center" : "flex flex-col items-center gap-2",
        className
      )}
    >
      {inline ? null : (
        <span className="text-xs text-muted-foreground">
          Or copy the install command
        </span>
      )}
      <div
        role="group"
        aria-label="Copy install command"
        className={cn(
          "inline-flex items-center gap-1 rounded-lg border border-border bg-surface/40 p-1",
          inline && "h-12 px-2"
        )}
      >
        {/* Without a button beside them, three format names could read as a
            download picker. Inline, the label says what the click actually
            does. Hidden on small screens, where the row stacks and space is
            tight — the copy icons and the accessible names still carry it. */}
        {inline ? (
          <span className="hidden pr-1 pl-1 text-xs whitespace-nowrap text-muted-foreground sm:inline">
            Copy install
          </span>
        ) : null}
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
