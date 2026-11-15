import { FadeUp } from "@/components/fade-up";
import { Screenshot } from "@/components/screenshot";

/**
 * The real window, after the illustrated how-it-works scenes. Everything above
 * it is drawn; this is the one place on the home page that shows the shipped
 * app, which every ranking competitor page does and we did not (SEO.md, second
 * review).
 */
export function Screenshots() {
  return (
    <section className="relative py-20 lg:py-28" id="screenshots">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <FadeUp>
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              The window that opens on{" "}
              <span className="text-orange">Ctrl+Shift+D</span>
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Screenshots of Clipmer 3.6.1. The entries are examples. Folders
              and notes are part of Pro.
            </p>
          </div>
        </FadeUp>
        <div className="grid gap-8 md:grid-cols-3 md:gap-6">
          <Screenshot shot="history" className="my-0" />
          <Screenshot shot="search" className="my-0" />
          <Screenshot shot="folders" className="my-0" />
        </div>
      </div>
    </section>
  );
}
