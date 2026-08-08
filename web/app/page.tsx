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

// Entity markup, not a rich-result play: Google's Software App rich result
// requires aggregateRating or review, and inventing either would be a policy
// violation. This tells Google what Clipmer *is*. Homepage only — price "0"
// describes the free tier and is only truthful here, not on /pro.
const appSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Clipmer",
  description:
    "A secrets-aware clipboard manager for Linux. Mask entries before a screen share, annotate them with notes, and file SSH commands, API keys, and connection strings into folders. 100% offline, no telemetry.",
  applicationCategory: "UtilitiesApplication",
  operatingSystem: "Linux",
  url: SITE,
  downloadUrl: "https://github.com/0x99M/clipmer/releases/latest",
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  license: canonical("/terms"),
};

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(appSchema) }}
      />
      <SiteNav />
      <Hero />
      <Features />
      <HowItWorks />
      <DownloadSection />
      <Footer />
    </>
  );
}
