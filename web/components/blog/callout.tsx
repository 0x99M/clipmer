import type { ReactNode } from "react";
import { Info, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Set-aside note. "warn" is for things that will bite the reader; "note" is
 * for context that would otherwise interrupt the argument.
 */
export function Callout({
  type = "note",
  title,
  children,
}: {
  type?: "note" | "warn";
  title?: string;
  children: ReactNode;
}) {
  const Icon = type === "warn" ? TriangleAlert : Info;
  return (
    <aside
      className={cn(
        "my-7 flex gap-3 rounded-lg border p-4",
        type === "warn"
          ? "border-orange/30 bg-orange/[0.06]"
          : "border-border bg-surface/40"
      )}
    >
      <Icon
        aria-hidden
        className={cn(
          "mt-0.5 size-4 shrink-0",
          type === "warn" ? "text-orange" : "text-muted-foreground"
        )}
      />
      <div className="min-w-0 [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&>p]:my-2 [&>p]:text-[0.9375rem] [&>p]:leading-relaxed">
        {title ? (
          <p className="!mt-0 !mb-1 font-semibold text-foreground">{title}</p>
        ) : null}
        {children}
      </div>
    </aside>
  );
}
