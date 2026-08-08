import { Metadata } from "next";
import { ALTERNATE_TYPES, canonical } from "@/lib/seo";
import { LegalLayout } from "@/components/legal-layout";

export const metadata: Metadata = {
  title: "Privacy Policy — Clipmer",
  alternates: { canonical: canonical("/privacy"), types: ALTERNATE_TYPES },
};

export default function PrivacyPage() {
  return (
    <LegalLayout title="Privacy Policy">
      <p>Last updated: April 2026</p>

      <p>
        Clipmer is operated by <strong>0x99M</strong> (&quot;we&quot;,
        &quot;our&quot;, or &quot;us&quot;). This Privacy Policy explains what
        we do — and don&apos;t — collect when you use the Clipmer desktop
        application, the clipmer.app website, and the Pro license process.
      </p>

      <h2>The Desktop App</h2>
      <p>
        <strong>Clipmer operates entirely offline.</strong> The desktop
        application does not transmit any clipboard data, usage data, telemetry,
        or personal information to any server. Your clipboard history is stored
        locally on your device at <code>~/.config/clipmer/</code> and is never
        accessed by us.
      </p>
      <p>
        The app does not contain analytics, tracking pixels, or any form of
        remote data collection.
      </p>

      <h2>The Website</h2>
      <p>
        The Clipmer website (clipmer.app) does not use cookies or third-party
        analytics. We do not track your browsing behavior.
      </p>

      <h2>Purchases</h2>
      <p>
        When you purchase a Clipmer Pro license, the transaction is processed by{" "}
        <strong>Paddle</strong> (paddle.com), our payment provider. Paddle
        collects your payment information and email address as the Merchant of
        Record. We receive only your email address for the purpose of delivering
        your license key.
      </p>
      <p>We do not store credit card numbers or payment details.</p>

      <h2>Email</h2>
      <p>
        We send exactly one email when you purchase a license: your license
        key. If you lose your license email and we re-issue your key via
        support, we send one additional email. We do not send marketing
        emails, newsletters, or promotional content.
      </p>

      <h2>Data Deletion</h2>
      <p>
        To delete your local clipboard data, uninstall Clipmer or delete the{" "}
        <code>~/.config/clipmer/</code> directory. We don&apos;t store any
        customer data on our end — there&apos;s nothing for us to delete.
      </p>

      <h2>Contact</h2>
      <p>
        For privacy-related questions:{" "}
        <a href="mailto:support@clipmer.app">support@clipmer.app</a>
      </p>
      <p>
        <strong>Legal Entity:</strong> Clipmer is operated by 0x99M.
      </p>
    </LegalLayout>
  );
}
