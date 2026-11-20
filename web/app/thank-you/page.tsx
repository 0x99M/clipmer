import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, Mail, KeyRound, Settings2, FolderPlus } from "lucide-react";
import { Footer } from "@/components/sections/footer";
import { STATEMENT_NAME } from "@/lib/checkout";

// Where Paddle sends a buyer after paying, from Clipmer's /checkout or from
// the shared payment page (dotpane.com/pay) that Paddle's emails use. Nothing
// here depends on how the buyer got here: the licence is sent by the webhook
// (app/api/paddle-webhook) whichever page took the payment.

export const metadata: Metadata = {
  title: "Thank you — Clipmer Pro",
  description: "Your Clipmer Pro purchase is confirmed. Check your email for the license key.",
  robots: { index: false, follow: false },
};

const steps = [
  {
    icon: Mail,
    title: "Check your inbox",
    desc: "Your license key comes from support@clipmer.app to the email you used at checkout, usually within a minute — check spam if you don't see it. Paddle sends the receipt separately.",
  },
  {
    icon: Settings2,
    title: "Open Clipmer → Settings → License",
    desc: "Launch Clipmer on your machine. Press the settings icon in the top-right of the popup, then switch to the License tab.",
  },
  {
    icon: KeyRound,
    title: "Paste the key and click Activate",
    desc: "Copy the license key from the email, paste it into the input field, and hit Activate. Everything unlocks instantly.",
  },
];

export default function ThankYouPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <main className="flex-1 mx-auto w-full max-w-2xl px-4 sm:px-6 py-20 sm:py-28">
        {/* Success banner */}
        <div className="flex flex-col items-center text-center mb-14">
          <div className="mb-6 inline-flex size-16 items-center justify-center rounded-full bg-green-500/10">
            <CheckCircle2 className="size-8 text-green-500" />
          </div>
          <p className="text-sm font-medium text-orange mb-3 tracking-wide uppercase">
            Purchase complete
          </p>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-4 leading-[1.1]">
            Thanks for buying{" "}
            <span className="text-orange">Clipmer Pro</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-md leading-relaxed">
            Your license key is on its way. Here&apos;s how to activate it.
          </p>
        </div>

        {/* Steps */}
        <ol className="space-y-6 mb-14">
          {steps.map((step, i) => (
            <li
              key={step.title}
              className="flex gap-4 rounded-xl border border-border bg-card p-5"
            >
              <div className="flex flex-col items-center gap-2 shrink-0">
                <div className="flex size-8 items-center justify-center rounded-md bg-orange/10 text-orange text-sm font-semibold">
                  {i + 1}
                </div>
                <step.icon className="size-4 text-muted-foreground/60" />
              </div>
              <div>
                <h3 className="font-semibold mb-1.5">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {step.desc}
                </p>
              </div>
            </li>
          ))}
        </ol>

        {/* First thing to try */}
        <section className="mb-10 rounded-xl border border-orange/30 bg-orange/[0.06] p-6">
          <div className="mb-3 flex items-center gap-2.5">
            <FolderPlus className="size-5 text-orange" aria-hidden />
            <h2 className="font-semibold">The first thing to try: a folder</h2>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Copy something you paste every week &mdash; a command, an address,
            a reply. In Clipmer, open that entry&apos;s <strong className="text-foreground">&#8943;</strong>{" "}
            menu, choose <strong className="text-foreground">Add to folder</strong>, then{" "}
            <strong className="text-foreground">New folder&hellip;</strong>. Entries in a
            folder stay until you delete them, however much you copy after.
          </p>
          <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
            Don&apos;t have Clipmer on this machine yet?{" "}
            <Link href="/install" className="text-orange hover:underline">
              Install it
            </Link>
            ; the same key works on every Linux machine you own.
          </p>
        </section>

        {/* Statement */}
        <p className="mb-10 text-sm text-muted-foreground leading-relaxed">
          Paddle is our merchant of record, so your card statement will say{" "}
          <span className="font-mono text-foreground">{STATEMENT_NAME}</span>. Refunds
          are available for 14 days: see the{" "}
          <Link href="/refund" className="text-orange hover:underline">
            refund policy
          </Link>
          .
        </p>

        {/* Troubleshooting */}
        <div className="rounded-xl border border-border bg-card/50 p-6 mb-10">
          <h2 className="font-semibold mb-3">Didn&apos;t receive the email?</h2>
          <p className="text-sm text-muted-foreground leading-relaxed mb-4">
            Sometimes emails take a few minutes to arrive. If it&apos;s been
            more than 10 minutes and you&apos;ve checked spam, email{" "}
            <a
              href="mailto:support@clipmer.app"
              className="text-orange hover:underline"
            >
              support@clipmer.app
            </a>{" "}
            from your purchase address and we&apos;ll re-issue your key
            &mdash; typically within 7 days.
          </p>
          <a
            href="mailto:support@clipmer.app"
            className="inline-flex items-center gap-1.5 text-sm text-orange hover:underline"
          >
            Contact support
            <span aria-hidden>&rarr;</span>
          </a>
        </div>

        {/* Back */}
        <div className="text-center">
          <Link
            href="/"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            &larr; Back to Clipmer
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}
