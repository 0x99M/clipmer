import type { Metadata } from "next";
import { ALTERNATE_TYPES, OG_BASE, SITE, canonical } from "@/lib/seo";
import { SiteNav } from "@/components/site-nav";
import { Hero } from "@/components/sections/hero";
import { Features } from "@/components/sections/features";
import { HowItWorks } from "@/components/sections/how-it-works";
import { DownloadSection } from "@/components/sections/download";
import { Footer } from "@/components/sections/footer";

// Title and description are inherited from the root layout, which already
// carries the homepage's copy. Only the page-specific bits are set here.
export const metadata: Metadata = {
  alternates: {
    canonical: canonical(),
    types: ALTERNATE_TYPES,
  },
  openGraph: {
    ...OG_BASE,
    url: SITE,
    title: "Clipmer — Secrets-Aware Clipboard Manager for Linux",
    description:
      "Your clipboard is full of production secrets. Mask entries before you present, annotate them with notes, and keep SSH commands, API keys, and connection strings in their own folders. 100% offline, no telemetry.",
  },
};

export default function Home() {
  return (
    <>
      <SiteNav />
      <Hero />
      <Features />
      <HowItWorks />
      <DownloadSection />
      <Footer />
    </>
  );
}
