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
  title: "Clipmer — Offline Clipboard Manager for Linux",
  description:
    "A fast, offline clipboard history manager for Linux. Search every copy, organize the ones you need into folders, paste with one keystroke. No telemetry. Your data never leaves your machine.",
  keywords: [
    "clipboard manager linux",
    "offline clipboard history",
    "ubuntu clipboard manager",
    "wayland clipboard manager",
    "gnome clipboard history",
    "linux clipboard search",
    "clipboard history manager",
  ],
  authors: [{ name: "Clipmer" }],
  alternates: {
    canonical: "https://clipmer.app",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://clipmer.app",
    siteName: "Clipmer",
    title: "Clipmer — Offline Clipboard Manager for Linux",
    description:
      "Never lose a copied item again. Search every copy, organize what matters into folders, paste with one keystroke. 100% offline, no telemetry.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Clipmer — Offline Clipboard Manager for Linux",
    description:
      "Never lose a copied item again. Search every copy, organize what matters into folders, paste with one keystroke. 100% offline, no telemetry.",
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
                "An offline clipboard history manager for Linux. Search every copy, organize what matters into folders, paste with one keystroke. 100% offline, no telemetry.",
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
