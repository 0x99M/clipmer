"use client";

import { Check, Download } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FadeUp } from "@/components/fade-up";
import { cn } from "@/lib/utils";
import { TESTED_ON } from "@/lib/tested-on";
import { ASSETS, VERSION } from "@/lib/release";

export function DownloadSection() {
  return (
    <section className="relative py-24 lg:py-32" id="download">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-orange/[0.02] to-transparent" />

      <div className="relative mx-auto max-w-3xl px-6 text-center">
        <FadeUp>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            Download Clipmer.{" "}
            <span className="text-orange">Free, forever.</span>
          </h2>
        </FadeUp>

        <FadeUp delay={0.1}>
          <p className="mt-4 text-muted-foreground text-lg">
            Free version has everything most people need. Pro unlocks the rest.
            Both run entirely offline — your clipboard stays on your machine.
          </p>
        </FadeUp>

        <FadeUp delay={0.2}>
          <div className="mt-4 flex justify-center">
            <Badge
              variant="outline"
              className="border-orange/30 bg-orange/10 text-orange font-mono"
            >
              v{VERSION}
            </Badge>
          </div>
        </FadeUp>

        <FadeUp delay={0.3}>
          <div className="mt-8 flex flex-col flex-wrap gap-4 sm:flex-row sm:justify-center">
            <a
              href={ASSETS.deb.url}
              className={cn(
                buttonVariants({ size: "lg" }),
                "h-14 gap-2 px-8 text-base bg-orange text-white hover:bg-orange-hover"
              )}
            >
              <Download className="size-5" />
              Download .deb Package
            </a>
            <a
              href={ASSETS.rpm.url}
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "h-14 gap-2 px-8 text-base border-border hover:bg-surface"
              )}
            >
              <Download className="size-5" />
              Download .rpm Package
            </a>
            <a
              href={ASSETS.appImage.url}
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "h-14 gap-2 px-8 text-base border-border hover:bg-surface"
              )}
            >
              <Download className="size-5" />
              Download AppImage
            </a>
          </div>
        </FadeUp>

        <FadeUp delay={0.35}>
          <p className="mt-5 text-sm text-muted-foreground">
            Not sure which one?{" "}
            <a href="/install" className="text-orange hover:underline">
              Follow the install guide &rarr;
            </a>{" "}
            &mdash; one command per distribution.
          </p>
        </FadeUp>

        <FadeUp delay={0.4}>
          <p className="mt-6 text-sm text-muted-foreground">
            Ubuntu 20.04+ / Fedora 30+ &middot; GNOME &middot; X11 or Wayland
          </p>
        </FadeUp>

        <FadeUp delay={0.45}>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <span className="text-sm text-muted-foreground">Tested on:</span>
            {TESTED_ON.map((os) => (
              <Badge
                key={`${os.name}-${os.version}`}
                variant="outline"
                className="gap-1 border-orange/30 bg-orange/10 text-orange"
              >
                <Check />
                {os.name} {os.version}
              </Badge>
            ))}
          </div>
        </FadeUp>

        <FadeUp delay={0.5}>
          <p className="mt-4 text-sm text-muted-foreground">
            Want more features?{" "}
            <a href="/pro" className="text-orange hover:underline">
              See Clipmer Pro &rarr;
            </a>
          </p>
        </FadeUp>
      </div>
    </section>
  );
}
