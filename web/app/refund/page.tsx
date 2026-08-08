import { Metadata } from "next";
import { ALTERNATE_TYPES, canonical } from "@/lib/seo";
import { LegalLayout } from "@/components/legal-layout";

export const metadata: Metadata = {
  title: "Refund Policy — Clipmer",
  alternates: { canonical: canonical("/refund"), types: ALTERNATE_TYPES },
};

export default function RefundPage() {
  return (
    <LegalLayout title="Refund Policy">
      <p>Last updated: April 2026</p>

      <p>
        This Refund Policy applies to all purchases of Clipmer Pro license
        keys. Clipmer is operated by <strong>0x99M</strong> (&quot;we&quot;,
        &quot;our&quot;, or &quot;us&quot;), with payments processed by
        Paddle as our Merchant of Record.
      </p>

      <h2>Refund Window</h2>
      <p>
        If you are not satisfied with Clipmer Pro, you may request a refund
        within <strong>14 days of the date of purchase</strong>.
      </p>

      <h2>How to Request a Refund</h2>
      <ol>
        <li>
          Email <a href="mailto:support@clipmer.app">support@clipmer.app</a>{" "}
          from the address you used to purchase.
        </li>
        <li>
          Include your <strong>order number</strong> (you can find it on the
          Paddle receipt emailed to you at the time of purchase) and a brief
          note about why you&apos;re requesting a refund.
        </li>
        <li>
          We typically respond within <strong>7 days</strong>.
        </li>
      </ol>
      <p>
        Approved refunds are processed by Paddle and returned to your
        original payment method within <strong>5–10 business days</strong>.
        The exact timing depends on your bank or card issuer.
      </p>

      <h2>Try the Free Version First</h2>
      <p>
        Clipmer ships a fully functional free version on the same codebase
        as Pro. We strongly recommend installing the free version and
        confirming Clipmer works on your system <em>before</em> upgrading,
        so you can avoid the refund process entirely. The free version is
        available at{" "}
        <a
          href="https://github.com/0x99M/clipmer/releases/latest"
          target="_blank"
          rel="noopener noreferrer"
        >
          GitHub Releases
        </a>
        .
      </p>

      <h2>Cancellation</h2>
      <p>
        Clipmer Pro is a <strong>one-time payment</strong>, not a
        subscription. There is no recurring charge to cancel — your license
        key works forever once you&apos;ve purchased.
      </p>

      <h2>Abuse</h2>
      <p>
        Refunds are intended for genuine cases where Clipmer Pro did not
        meet your expectations. We reserve the right to decline refund
        requests that appear abusive — for example, repeated buy-and-refund
        cycles using the same payment method or email address, or evidence
        that a license key has been shared, resold, or publicly posted.
      </p>

      <h2>Billing Errors and Failed Delivery</h2>
      <p>
        If you were charged in error, charged more than once for the same
        order, or did not receive your license key, contact{" "}
        <a href="mailto:support@clipmer.app">support@clipmer.app</a> and we
        will resolve the issue regardless of the 14-day window.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about this Refund Policy:{" "}
        <a href="mailto:support@clipmer.app">support@clipmer.app</a>
      </p>
      <p>
        <strong>Legal Entity:</strong> Clipmer is operated by 0x99M.
      </p>

      <h2>Changes to This Policy</h2>
      <p>
        We may update this Refund Policy from time to time. Updates will be
        posted on this page with a new &quot;Last updated&quot; date.
      </p>
    </LegalLayout>
  );
}
