"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * A shell command with a copy button. The whole point of the install page is
 * that nobody has to retype anything, so the command is selectable text and the
 * button is a convenience rather than the only way to get it.
 */
export function CommandBlock({
  command,
  label,
  className,
}: {
  command: string;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear on unmount so a pending reset cannot fire against a gone component.
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(command);
    } catch {
      // Clipboard API needs a secure context and can be blocked outright. The
      // command is still selectable, so fail quietly rather than alarm anyone.
      return;
    }
    setCopied(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className={cn("group/cmd relative", className)}>
      {label ? (
        <div className="mb-1.5 text-xs text-muted-foreground">{label}</div>
      ) : null}
      <div className="flex items-stretch overflow-hidden rounded-lg border border-border bg-[#151515]">
        <pre className="min-w-0 flex-1 overflow-x-auto px-4 py-3 font-mono text-[13px] leading-relaxed text-foreground/90">
          <code>{command}</code>
        </pre>
        <button
          type="button"
          onClick={copy}
          // The visible label changes, so the accessible name has to track it.
          aria-label={copied ? "Copied" : "Copy command"}
          className={cn(
            "flex shrink-0 items-center gap-1.5 border-l border-border px-3 text-xs font-medium transition-colors",
            copied
              ? "bg-orange/15 text-orange"
              : "text-muted-foreground hover:bg-surface/60 hover:text-foreground"
          )}
        >
          {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
          <span className="hidden sm:inline">{copied ? "Copied" : "Copy"}</span>
        </button>
      </div>
    </div>
  );
}
