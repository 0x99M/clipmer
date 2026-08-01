import type { Metadata } from "next";
import { Ubuntu, Ubuntu_Mono } from "next/font/google";
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
    "Mask entries before a screen share, annotate them with notes, and file SSH commands, API keys, and connection strings into folders. A clipboard workbench for Linux engineers. 100% offline — nothing leaves your machine.",
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
  alternates: {
    canonical: "https://clipmer.app",
    types: {
      "application/rss+xml": "https://clipmer.app/blog/rss.xml",
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://clipmer.app",
    siteName: "Clipmer",
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
  metadataBase: new URL("https://clipmer.app"),
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
      <body className="min-h-screen bg-background text-foreground">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              name: "Clipmer",
              description:
                "A secrets-aware clipboard manager for Linux. Mask entries before a screen share, annotate them with notes, and file SSH commands, API keys, and connection strings into folders. 100% offline, no telemetry.",
              applicationCategory: "UtilitiesApplication",
              operatingSystem: "Linux",
              url: "https://clipmer.app",
              downloadUrl:
                "https://github.com/0x99M/clipmer/releases/latest",
              offers: {
                "@type": "Offer",
                price: "0",
                priceCurrency: "USD",
              },
              license: "https://clipmer.app/terms",
            }),
          }}
        />
        {children}
      </body>
    </html>
  );
}
