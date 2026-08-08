import type { Metadata } from "next";
import { Ubuntu, Ubuntu_Mono } from "next/font/google";
import { ALTERNATE_TYPES, OG_BASE, SITE } from "@/lib/seo";
import "./globals.css";

const ubuntu = Ubuntu({
  variable: "--font-ubuntu",
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
});

const ubuntuMono = Ubuntu_Mono({
  variable: "--font-ubuntu-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "Clipmer — Secrets-Aware Clipboard Manager for Linux",
  description:
    "A clipboard manager for Linux that masks secrets. Hide entries before a screen share, add notes, and file SSH commands and API keys into folders.",
  keywords: [
    "clipboard manager linux",
    "clipboard manager for developers",
    "hide clipboard during screen share",
    "api key clipboard manager",
    "ssh snippet manager linux",
    "devops clipboard tool",
    "offline clipboard history",
    "ubuntu clipboard manager",
    "wayland clipboard manager",
  ],
  authors: [{ name: "Clipmer" }],
  // Deliberately no `canonical` here. It is inherited by every page that does
  // not set its own, which is how six routes ended up declaring themselves to
  // be the homepage. Canonicals belong on the page. See lib/seo.ts.
  alternates: {
    types: ALTERNATE_TYPES,
  },
  openGraph: {
    ...OG_BASE,
    title: "Clipmer — Secrets-Aware Clipboard Manager for Linux",
    description:
      "Your clipboard is full of production secrets. Mask entries before you present, annotate them with notes, and keep SSH commands, API keys, and connection strings in their own folders. 100% offline, no telemetry.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Clipmer — Secrets-Aware Clipboard Manager for Linux",
    description:
      "Your clipboard is full of production secrets. Mask entries before you present, annotate them with notes, and keep SSH commands, API keys, and connection strings in their own folders. 100% offline, no telemetry.",
  },
  metadataBase: new URL(SITE),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${ubuntu.variable} ${ubuntuMono.variable} dark antialiased`}
    >
      {/* The SoftwareApplication block lives on the homepage, not here: it was
          being emitted on all 12 routes, so /privacy and every blog post also
          declared themselves to be a free Linux application. See app/page.tsx. */}
      <body className="min-h-screen bg-background text-foreground">{children}</body>
    </html>
  );
}
