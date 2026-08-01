"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { Check, X, Zap, Shield, Lock } from "lucide-react";
import { initializePaddle, type Paddle } from "@paddle/paddle-js";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Footer } from "@/components/sections/footer";

const PADDLE_CLIENT_TOKEN = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN;
const PADDLE_PRICE_ID = process.env.NEXT_PUBLIC_PADDLE_PRICE_ID;
const PADDLE_ENV = (process.env.NEXT_PUBLIC_PADDLE_ENV || "sandbox") as
  | "sandbox"
  | "production";
// Master switch for the Buy Pro button. Default off → "Coming soon".
// Set NEXT_PUBLIC_BUY_PRO_ENABLED=true to go live (requires the Paddle
// credentials above).
const BUY_PRO_ENABLED = process.env.NEXT_PUBLIC_BUY_PRO_ENABLED === "true";

const features = [
  { name: "Clipboard history", free: "100 entries", pro: "200 entries" },
  { name: "Folders", free: false, pro: true },
  { name: "Inline notes", free: false, pro: true },
  { name: "Smart search", free: "Content only", pro: "Content + notes" },
  { name: "Auto-paste (Wayland)", free: true, pro: true },
  { name: "Dark & light themes", free: true, pro: true },
  { name: "Accent color", free: true, pro: true },
  { name: "Adjustable font size", free: true, pro: true },
  { name: "Minimal view", free: false, pro: true },
  { name: "Custom shortcut", free: true, pro: true },
  { name: "Keyboard navigation", free: true, pro: true },
  { name: "Start on login", free: true, pro: true },
  { name: "Hide entries (screen-share safe)", free: true, pro: true },
  { name: "100% offline", free: true, pro: true },
];

const highlights = [
  { icon: Zap, label: "Pay once, yours forever" },
  { icon: Shield, label: "100% offline, no telemetry" },
  { icon: Lock, label: "Works on every Linux machine you own" },
];

function CellValue({ value }: { value: boolean | string }) {
  if (value === true) return <Check className="size-4 text-green-500 mx-auto" />;
  if (value === false) return <X className="size-4 text-muted-foreground/20 mx-auto" />;
  return <span className="text-xs text-muted-foreground">{value}</span>;
}

function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.6, delay, ease: [0.21, 0.47, 0.32, 0.98] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export default function ProPage() {
  const paddleRef = useRef<Paddle | null>(null);
  const paddleReady = BUY_PRO_ENABLED && PADDLE_CLIENT_TOKEN && PADDLE_PRICE_ID;

  useEffect(() => {
    if (!paddleReady) return;
    initializePaddle({
      environment: PADDLE_ENV,
      token: PADDLE_CLIENT_TOKEN!,
      checkout: {
        settings: {
          theme: "dark",
          variant: "one-page",
        },
      },
    }).then((p) => {
      if (p) paddleRef.current = p;
    });
  }, [paddleReady]);

  const openCheckout = () => {
    if (!paddleRef.current || !PADDLE_PRICE_ID) return;
    paddleRef.current.Checkout.open({
      items: [{ priceId: PADDLE_PRICE_ID, quantity: 1 }],
      settings: {
        theme: "dark",
        variant: "one-page",
        successUrl: `${window.location.origin}/thank-you`,
      },
    });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Ambient glow — single, slow, subtle */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <motion.div
          className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[800px] h-[600px] rounded-full bg-orange/[0.04] blur-[150px]"
          animate={{ opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <main className="relative z-10 mx-auto max-w-5xl px-4 sm:px-6 py-16 sm:py-24">
        {/* ── Hero: two-column ── */}
        <Reveal>
          <div className="grid gap-10 lg:grid-cols-2 lg:gap-12 lg:items-center mb-14">
            {/* Left column: copy */}
            <div className="text-center lg:text-left">
              <p className="text-sm font-medium text-orange mb-4 tracking-wide uppercase">
                Clipmer Pro
              </p>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-5 leading-[1.1]">
                Pay once.
                <br />
                <span className="text-orange">Yours forever.</span>
              </h1>
              <p className="text-lg text-muted-foreground max-w-md mx-auto lg:mx-0 leading-relaxed mb-8">
                No subscription. No renewal emails. No seat count. Unlock
                everything for less than a coffee.
              </p>

              {/* Inline highlights */}
              <ul className="flex flex-col gap-3 max-w-sm mx-auto lg:mx-0">
                {highlights.map((h, i) => (
                  <motion.li
                    key={h.label}
                    initial={{ opacity: 0, x: -8 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.2 + i * 0.08 }}
                    className="flex items-center gap-2.5 text-sm text-muted-foreground"
                  >
                    <h.icon className="size-4 text-orange shrink-0" />
                    {h.label}
                  </motion.li>
                ))}
              </ul>
            </div>

            {/* Right column: pricing card */}
            <div className="w-full max-w-sm mx-auto lg:ml-auto lg:mr-0">
              <motion.div
                whileHover={{ y: -2, boxShadow: "0 20px 60px -15px rgba(233,84,32,0.15)" }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="rounded-2xl border border-border bg-card p-8 text-center transition-colors hover:border-orange/40"
              >
                <p className="text-xs font-medium text-orange uppercase tracking-widest mb-4">
                  Pro License &middot; One-time
                </p>

                <div className="flex items-baseline justify-center gap-1 mb-1">
                  <span className="text-5xl font-bold tracking-tight">$9.00</span>
                </div>
                <p className="text-sm text-muted-foreground mb-8">
                  Less than one coffee. Forever.
                </p>

                {paddleReady ? (
                  <button
                    onClick={openCheckout}
                    className={cn(
                      buttonVariants({ size: "lg" }),
                      "w-full h-12 text-base bg-orange text-white hover:bg-orange-hover cursor-pointer transition-colors"
                    )}
                  >
                    Get Clipmer Pro
                  </button>
                ) : (
                  <button
                    disabled
                    className={cn(
                      buttonVariants({ size: "lg" }),
                      "relative w-full h-12 text-base bg-orange/30 text-white/80 cursor-not-allowed transition-colors"
                    )}
                  >
                    Get Clipmer Pro
                    <span className="absolute -top-2 -right-2 rounded-md bg-orange text-white text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 shadow-md">
                      Coming soon
                    </span>
                  </button>
                )}

                <p className="text-xs text-muted-foreground/60 mt-4">
                  {paddleReady
                    ? "Instant delivery · One-time payment"
                    : "Available soon · One-time payment"}
                </p>
              </motion.div>

              {/* Card footer links */}
              <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm">
                <Link
                  href="/#download"
                  className="group inline-flex items-center gap-1 text-orange underline underline-offset-4 decoration-orange/30 hover:decoration-orange transition-colors"
                >
                  Download free version
                  <span className="transition-transform group-hover:translate-x-0.5">&rarr;</span>
                </Link>
                <a
                  href="#lost-key"
                  className="group inline-flex items-center gap-1 text-orange underline underline-offset-4 decoration-orange/30 hover:decoration-orange transition-colors"
                >
                  Lost your key?
                  <span className="transition-transform group-hover:translate-x-0.5">&rarr;</span>
                </a>
              </div>
            </div>
          </div>
        </Reveal>

        {/* ── Section divider ── */}
        <Reveal delay={0.1}>
          <div className="flex items-center gap-4 mb-16 max-w-xs mx-auto">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground/50 uppercase tracking-widest">Compare</span>
            <div className="flex-1 h-px bg-border" />
          </div>
        </Reveal>

        {/* ── Feature comparison ── */}
        <Reveal delay={0.1}>
          <div className="mb-24">
            <div className="rounded-xl border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-card">
                    <th className="text-left py-3 px-5 font-medium text-muted-foreground text-xs uppercase tracking-wider">
                      Feature
                    </th>
                    <th className="text-center py-3 px-4 font-medium text-muted-foreground text-xs uppercase tracking-wider w-32">
                      Free
                    </th>
                    <th className="text-center py-3 px-4 font-medium text-orange text-xs uppercase tracking-wider w-32">
                      Pro
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {features.map((f, i) => (
                    <motion.tr
                      key={f.name}
                      initial={{ opacity: 0 }}
                      whileInView={{ opacity: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.03, duration: 0.4 }}
                      className={cn(
                        "border-t border-border/40",
                        i % 2 === 0 ? "bg-transparent" : "bg-card/30"
                      )}
                    >
                      <td className="py-3 px-5 text-foreground/90">{f.name}</td>
                      <td className="py-3 px-4 text-center">
                        <CellValue value={f.free} />
                      </td>
                      <td className="py-3 px-4 text-center">
                        <CellValue value={f.pro} />
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Reveal>

        {/* ── Lost your license key? ── */}
        <Reveal delay={0.1}>
          <div
            id="lost-key"
            className="mx-auto max-w-md rounded-xl border border-border bg-card p-6 mb-24 scroll-mt-20"
          >
            <h3 className="font-semibold mb-2">Lost your license key?</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Email{" "}
              <a
                href="mailto:support@clipmer.app"
                className="text-orange underline underline-offset-4 decoration-orange/30 hover:decoration-orange transition-colors"
              >
                support@clipmer.app
              </a>{" "}
              from the address you used to purchase. We&apos;ll verify your
              order in Paddle and re-issue your key &mdash; typically within
              7 days.
            </p>
          </div>
        </Reveal>

        {/* ── FAQ ── */}
        <Reveal delay={0.1}>
          <div className="mx-auto max-w-2xl">
            <h2 className="text-xl font-bold text-center mb-10 text-muted-foreground">
              Questions
            </h2>
            <div className="divide-y divide-border">
              {[
                {
                  q: "Why is the source on GitHub then?",
                  a: "Because your clipboard handles passwords, tokens, and private snippets — you should be able to verify there's no telemetry or hidden network call. The source is published for transparency and security audit under the PolyForm Strict License 1.0.0. It's source-available, not open source: redistribution and derivative works aren't permitted. Your $9 pays for the pre-built binary, the Pro feature unlocks, and ongoing development.",
                },
                {
                  q: "Is this a subscription?",
                  a: "No. One payment of $9.00 and the license works forever. No recurring charges, no renewal emails, no seat counts.",
                },
                {
                  q: "Can I use it on multiple computers?",
                  a: "Yes. One license key works on every Linux machine you personally own — laptop, desktop, workstation.",
                },
                {
                  q: "Does Clipmer phone home or send my data anywhere?",
                  a: "No. The app is 100% offline — no telemetry, no analytics, no license server ping. Your clipboard history never leaves your machine. License validation happens locally using a public key baked into the app.",
                },
                {
                  q: "What if Clipmer doesn't work for me?",
                  a: "You can request a refund within 14 days of purchase. Either way, try the free version first — it runs on the same codebase as Pro, so if the free app works, Pro will too.",
                },
                {
                  q: "Will you keep maintaining it?",
                  a: "Yes. The Pro revenue is what funds ongoing work on Clipmer. Every purchase directly supports bug fixes, new features, and keeping up with Wayland/GNOME changes.",
                },
              ].map((item, i) => (
                <motion.div
                  key={item.q}
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.06, duration: 0.5 }}
                  className="py-5"
                >
                  <h3 className="font-medium mb-1.5">{item.q}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {item.a}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </Reveal>
      </main>

      <Footer />
    </div>
  );
}
