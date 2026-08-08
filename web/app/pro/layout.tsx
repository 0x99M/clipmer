import type { Metadata } from "next";
import { ALTERNATE_TYPES, OG_BASE, canonical } from "@/lib/seo";

// page.tsx is a client component — it needs useRef/useEffect for the Paddle
// checkout — and `metadata` is server-only, so /pro had no title, description
// or canonical of its own and inherited the homepage's verbatim. Google saw a
// byte-identical title and a canonical pointing at "/", i.e. not a page.
//
// A layout is the smaller of the two fixes: splitting page.tsx into a server
// wrapper plus a client child works equally well, but this keeps the live
// checkout path untouched.

const TITLE = "Clipmer Pro — $9 One-Time License, No Subscription";
const DESCRIPTION =
  "Unlock folders, inline notes, 200 entries of history, and search across notes. One payment of $9 — no subscription, no account, and it keeps working offline.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: {
    canonical: canonical("/pro"),
    types: ALTERNATE_TYPES,
  },
  openGraph: {
    ...OG_BASE,
    url: canonical("/pro"),
    title: TITLE,
    description: DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
};

export default function ProLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
