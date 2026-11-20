import type { Metadata } from "next";
import { CheckoutClient } from "./checkout-client";

// Clipmer Pro's checkout: our order card beside Paddle's inline frame
// (CHECKOUT.md). Not in the sitemap and not indexed: /pro is the page that
// ranks, and this one only makes sense on the way to paying.
//
// This route alone gets a Content-Security-Policy that allows Paddle.js and
// Paddle's frames (next.config.ts); every other route is unchanged. Links here
// are plain <a> elements, not next/link, so the document (and its CSP) always
// comes from this route.

export const metadata: Metadata = {
  title: "Checkout — Clipmer Pro",
  description: "Buy Clipmer Pro: $9 once, a license key by email, sold through Paddle.",
  robots: { index: false, follow: false },
};

export default function CheckoutPage() {
  return <CheckoutClient />;
}
