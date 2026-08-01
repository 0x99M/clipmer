import { Metadata } from "next";
import { LegalLayout } from "@/components/legal-layout";

export const metadata: Metadata = {
  title: "Terms of Service — Clipmer",
};

export default function TermsPage() {
  return (
    <LegalLayout title="Terms of Service">
      <p>Last updated: April 2026</p>

      <p>
        Welcome to Clipmer, operated by <strong>0x99M</strong>
        (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;). These Terms of
        Service (&quot;Terms&quot;) govern your access to and use of the
        Clipmer desktop application, the Pro license key, and the clipmer.app
        website (collectively, the &quot;Service&quot;). By downloading,
        installing, or purchasing Clipmer, you agree to these Terms.
      </p>

      <h2>Nature of the Service</h2>
      <p>
        Clipmer is a <strong>fully automated software product</strong>. The
        free version of the desktop app is provided free of charge for personal
        use. The Pro version is delivered as an automatically generated license
        key emailed to you immediately after payment.
      </p>
      <p>
        <strong>No human-driven services are involved</strong> in the
        delivery, processing, or operation of the Service beyond standard
        email-based customer support. Clipmer does not offer consulting,
        custom development, managed services, or any human-performed work as
        part of any plan.
      </p>

      <h2>Pricing</h2>
      <p>
        Clipmer Pro is sold at a single <strong>one-time price of $9.00</strong>{" "}
        for an individual personal license. There are no subscriptions, no
        recurring charges, no seat counts, and{" "}
        <strong>no custom or enterprise tiers</strong>. The price displayed on{" "}
        <a href="/pro">clipmer.app/pro</a> is the only price Clipmer charges.
      </p>
      <p>
        Payment processing is handled by <strong>Paddle</strong> as our
        Merchant of Record. You agree to Paddle&apos;s terms when completing a
        purchase.
      </p>

      <h2>License</h2>
      <p>
        Clipmer is <strong>source-available, not open source</strong>. The
        source code is published on GitHub for transparency and security audit
        and is governed by the{" "}
        <a
          href="https://github.com/0x99M/clipmer/blob/master/LICENSE"
          target="_blank"
          rel="noopener noreferrer"
        >
          Clipmer Source-Available License
        </a>
        . You may read and audit the source, and you may build it from source
        for your own personal use. Redistribution, derivative works, hosted
        services, and commercial forks require prior written permission.
      </p>
      <p>
        A Clipmer Pro license key grants <strong>one individual</strong> access
        to Pro features on any number of personal Linux devices they own.
        License keys are non-transferable and may not be shared, resold, or
        redistributed.
      </p>

      <h2>Permitted Use</h2>
      <ul>
        <li>
          Run the official Clipmer binary (free or Pro) on any number of
          personal devices you own
        </li>
        <li>
          Read and audit the source code published on GitHub
        </li>
        <li>
          Build from source for your own personal use on devices you own
        </li>
      </ul>

      <h2>Prohibited Use</h2>
      <ul>
        <li>
          Redistributing the source code, the official binary, or any modified
          version, in whole or in part
        </li>
        <li>Sharing or publicly posting license keys</li>
        <li>
          Disabling, removing, or circumventing the license validation system
          or the distinction between the free and Pro feature sets
        </li>
        <li>
          Hosting Clipmer as a service for third parties or selling derivative
          products
        </li>
        <li>Misrepresenting Clipmer as your own product</li>
      </ul>

      <h2 id="refunds">Refunds</h2>
      <p>
        Clipmer Pro purchases are refundable within{" "}
        <strong>14 days of the date of purchase</strong>. To request a
        refund, email{" "}
        <a href="mailto:support@clipmer.app">support@clipmer.app</a> from
        the address you used to purchase, including your order number from
        the Paddle receipt. Approved refunds are processed by Paddle within
        5–10 business days. See our dedicated{" "}
        <a href="/refund">Refund Policy</a> for the full process.
      </p>
      <p>
        We strongly recommend installing the free version of Clipmer first
        to confirm compatibility with your system before upgrading.
      </p>
      <p>
        We reserve the right to decline refund requests that appear abusive
        — for example, repeated buy-and-refund cycles, or license keys
        that have been shared, resold, or publicly posted.
      </p>
      <p>
        If you were charged in error or did not receive your license key,
        contact <a href="mailto:support@clipmer.app">support@clipmer.app</a>{" "}
        and we will resolve the issue regardless of the 14-day window.
      </p>

      <h2>Revocation</h2>
      <p>
        We reserve the right to revoke license keys that are shared publicly or
        used in violation of these Terms.
      </p>

      <h2>Disclaimer</h2>
      <p>
        Clipmer is provided <strong>&quot;as is&quot;</strong> without warranty
        of any kind, express or implied. We are not liable for any data loss,
        damages, or issues arising from the use of this software.
      </p>

      <h2>Changes</h2>
      <p>
        We may update these Terms from time to time. Continued use of Clipmer
        after changes constitutes acceptance of the updated Terms.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about these Terms:{" "}
        <a href="mailto:support@clipmer.app">support@clipmer.app</a>
      </p>
      <p>
        <strong>Legal Entity:</strong> Clipmer is operated by 0x99M.
      </p>
    </LegalLayout>
  );
}
