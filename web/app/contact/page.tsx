import { Metadata } from "next";
import { ALTERNATE_TYPES, OG_BASE, canonical } from "@/lib/seo";
import { LegalLayout } from "@/components/legal-layout";

const title = "Contact — Clipmer";
const description =
  "How to reach Clipmer: support@clipmer.app for help, licenses and purchases, GitHub issues for bugs. We answer every email within a week.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: canonical("/contact"), types: ALTERNATE_TYPES },
  // Without these the page inherits the homepage's og:title/description and
  // emits no og:url. Spread OG_BASE back in or og:image goes with it.
  openGraph: { ...OG_BASE, url: canonical("/contact"), title, description },
  twitter: { card: "summary_large_image", title, description },
};

export default function ContactPage() {
  return (
    <LegalLayout title="Contact">
      <p>
        We&apos;re a small team and respond to all emails within{" "}
        <strong>one week</strong>.
      </p>

      <h2>Support</h2>
      <p>
        For help with Clipmer, license activation, or bug reports:{" "}
        <a href="mailto:support@clipmer.app">support@clipmer.app</a>
      </p>

      <h2>Purchases</h2>
      <p>
        For questions about your Pro license or purchase:{" "}
        <a href="mailto:support@clipmer.app">support@clipmer.app</a>
      </p>
      <p>
        Refunds are available within 14 days of purchase — see our{" "}
        <a href="/refund">refund policy</a> for the request process.
      </p>

      <h2>Bug Reports</h2>
      <p>
        Found a bug? Open an issue on{" "}
        <a
          href="https://github.com/0x99M/clipmer/issues"
          target="_blank"
          rel="noopener noreferrer"
        >
          GitHub
        </a>
        .
      </p>
    </LegalLayout>
  );
}
