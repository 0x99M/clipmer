import { cn } from "@/lib/utils";

export type SupportRow = {
  name: string;
  cells: string[];
  /** Renders the row in the accent color — used for Clipmer's own row. */
  highlight?: boolean;
};

/**
 * Comparison tables as a component rather than markdown: remark-gfm is not
 * installed, and a real component gets horizontal overflow on narrow screens
 * instead of forcing the page body to scroll.
 */
export function SupportTable({
  headers,
  rows,
  caption,
}: {
  headers: string[];
  rows: SupportRow[];
  caption?: string;
}) {
  return (
    <figure className="my-8">
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[34rem] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-surface/50">
              <th scope="col" className="px-4 py-3 font-semibold text-foreground">
                {headers[0]}
              </th>
              {headers.slice(1).map((h) => (
                <th
                  key={h}
                  scope="col"
                  className="px-4 py-3 font-semibold text-foreground"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.name}
                className="border-b border-border/60 last:border-0"
              >
                <th
                  scope="row"
                  className={cn(
                    "px-4 py-3 font-medium",
                    row.highlight ? "text-orange" : "text-foreground/90"
                  )}
                >
                  {row.name}
                </th>
                {row.cells.map((cell, i) => (
                  <td
                    key={i}
                    className="px-4 py-3 align-top text-foreground/70"
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {caption ? (
        <figcaption className="mt-3 text-sm text-muted-foreground">
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}
