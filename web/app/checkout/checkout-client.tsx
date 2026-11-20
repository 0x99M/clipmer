"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { initializePaddle, getPaddleInstance, type Paddle, type PaddleEventData } from "@paddle/paddle-js";
import { AlertTriangle, Check, ChevronDown, Lock, RotateCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { SHOTS } from "@/components/screenshot";
import {
  BASE_PRICE,
  PHONE_QUERY,
  STATEMENT_NAME,
  SUCCESS_PATH,
  formatMoney,
  paddleOpensItself,
  previewPrice,
  summaryFrom,
  taxLabel,
  validTransactionId,
  type CheckoutEventData,
  type OrderSummary,
  type PricePreviewData,
} from "@/lib/checkout";
import {
  CHECKOUT_READY,
  PADDLE_CLIENT_TOKEN,
  PADDLE_ENV,
  PADDLE_PRICE_ID,
} from "@/lib/paddle-config";

// Paddle.js draws its frame into the element with this class.
const FRAME_CLASS = "clipmer-checkout-frame";
const FRAME_HEIGHT = 450;

// Everything here is true of the shipped app (see /pro and the app's code).
const FEATURES: { b: string; t: string }[] = [
  { b: "Folders", t: " for things you file on purpose, kept out of the history limit" },
  { b: "Notes", t: " on any entry, and search that reads them" },
  { b: "Encrypted backup", t: " of history, notes and folders, with a password you choose" },
  { b: "200 entries", t: " of history; the free version shows 100" },
  { b: "Minimal view", t: " for screen shares and demos" },
];

type Phase = "loading" | "ready" | "error" | "completed";

export function CheckoutClient() {
  const [phase, setPhase] = useState<Phase>("loading");
  const [summary, setSummary] = useState<OrderSummary | undefined>();
  const [price, setPrice] = useState(formatMoney(BASE_PRICE.amount, BASE_PRICE.currency));
  const [paymentFailed, setPaymentFailed] = useState(false);
  const [lateError, setLateError] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const loadedRef = useRef(false);
  const startedRef = useRef(false);

  useEffect(() => {
    if (!CHECKOUT_READY || startedRef.current) return;
    startedRef.current = true;
    let completedTimer: number | undefined;
    // Paddle can refuse settings with only a console warning and no event, so
    // a form that hasn't loaded in 20 seconds gets the error state's way back.
    const loadTimer = window.setTimeout(() => {
      if (!loadedRef.current) setPhase("error");
    }, 20_000);

    // Event payloads hold the buyer's email, address and card's last 4
    // digits. They are read into display values here and never logged,
    // stored or sent anywhere.
    const onEvent = (event: PaddleEventData) => {
      const data = event.data as CheckoutEventData | undefined;
      switch (event.name) {
        case "checkout.loaded":
          loadedRef.current = true;
          window.clearTimeout(loadTimer);
          setPhase("ready");
          setSummary((s) => summaryFrom(data) ?? s);
          return;
        case "checkout.updated":
        case "checkout.items.updated":
        case "checkout.discount.applied":
        case "checkout.discount.removed":
        case "checkout.customer.created":
        case "checkout.customer.updated":
        case "checkout.customer.removed":
          setSummary((s) => summaryFrom(data) ?? s);
          return;
        case "checkout.payment.initiated":
          setPaymentFailed(false);
          return;
        case "checkout.payment.failed":
        case "checkout.payment.error":
          setPaymentFailed(true);
          return;
        case "checkout.error":
          // Before the form loads there is nothing to pay with: offer a way
          // back. After, Paddle keeps the form usable, so only say so.
          if (loadedRef.current) setLateError(true);
          else setPhase("error");
          return;
        case "checkout.completed":
          setPaymentFailed(false);
          setPhase("completed");
          // Paddle redirects to successUrl itself; this covers the case where
          // it doesn't, without leaving the buyer on a finished form.
          completedTimer = window.setTimeout(() => {
            window.location.assign(SUCCESS_PATH);
          }, 4000);
          return;
      }
    };

    const phone = window.matchMedia(PHONE_QUERY).matches;
    const settings = {
      displayMode: "inline" as const,
      frameTarget: FRAME_CLASS,
      frameInitialHeight: FRAME_HEIGHT,
      frameStyle: "width: 100%; min-width: 312px; background-color: transparent; border: none;",
      theme: "dark" as const,
      locale: "en",
      successUrl: `${window.location.origin}${SUCCESS_PATH}`,
      // On a phone: Apple Pay and Google Pay first, then the full form below
      // them. paddle-js 1.6.2's types predate "express" (added in 1.6.4).
      // Paddle refuses express with show_add_discounts or the tax-number
      // option ("not compatible", and the form never loads), so those two are
      // desktop-only; a discount link (?_ptxn or a code) still applies.
      ...(phone
        ? { variant: "express" as "one-page" }
        : { variant: "one-page" as const, showAddDiscounts: true, showAddTaxId: true }),
    };

    const open = async (paddle: Paddle) => {
      // Paddle's own links (?_ptxn=, from its emails or the shared payment
      // page) are opened by Paddle.js itself; opening another would replace it.
      if (paddleOpensItself(window.location.search)) return;
      let transactionId: string | undefined;
      try {
        const res = await fetch("/api/checkout", { method: "POST", cache: "no-store" });
        if (res.ok) transactionId = validTransactionId((await res.json()).transactionId);
      } catch {
        // Fall through to the price-id checkout below.
      }
      if (transactionId) paddle.Checkout.open({ transactionId, settings });
      else paddle.Checkout.open({ items: [{ priceId: PADDLE_PRICE_ID!, quantity: 1 }], settings });
    };

    const preview = (paddle: Paddle) => {
      paddle
        .PricePreview({ items: [{ priceId: PADDLE_PRICE_ID!, quantity: 1 }] })
        .then((r) => {
          const formatted = previewPrice(r?.data as PricePreviewData | undefined);
          if (formatted) setPrice(formatted);
        })
        .catch(() => {
          // Keep the base price; the summary fills in once the form loads.
        });
    };

    const existing = getPaddleInstance();
    const ready: Promise<Paddle | undefined> = existing?.Initialized
      ? Promise.resolve(existing).then((p) => {
          // Back on this page after a client-side visit elsewhere: Paddle.js
          // can only be initialised once per document, so re-point its events.
          p.Update({ eventCallback: onEvent, checkout: { settings } });
          return p;
        })
      : initializePaddle({
          environment: PADDLE_ENV,
          token: PADDLE_CLIENT_TOKEN!,
          checkout: { settings },
          eventCallback: onEvent,
        });

    ready
      .then((paddle) => {
        if (!paddle) {
          setPhase("error");
          return;
        }
        preview(paddle);
        return open(paddle);
      })
      .catch(() => setPhase("error"));

    return () => {
      window.clearTimeout(loadTimer);
      if (completedTimer) window.clearTimeout(completedTimer);
    };
  }, []);

  const money = (n: number) => formatMoney(n, summary?.currency ?? BASE_PRICE.currency);
  const headline = summary ? money(summary.subtotal) : price;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6">
        <Link
          href="/"
          className="mr-auto flex items-center gap-2.5 rounded-md text-foreground transition-opacity hover:opacity-80"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/clipmer-mark.svg" alt="" width={25} height={30} className="h-[26px] w-auto" />
          <span className="text-[18px] font-semibold tracking-[-0.01em]">Clipmer</span>
        </Link>
        <a
          href="/pro"
          className="inline-flex min-h-11 items-center text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          Back to Clipmer Pro
        </a>
      </header>

      <main className="mx-auto grid max-w-6xl gap-4 px-4 pb-16 pt-2 sm:px-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:items-start lg:gap-6 lg:pt-6">
        {/* ── Order card ── */}
        <section
          aria-label="Your order"
          className="flex flex-col gap-5 rounded-2xl border border-border bg-card p-5 sm:p-7 lg:col-start-1 lg:row-start-1"
        >
          <div className="flex items-start gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/clipmer-mark.svg"
              alt=""
              width={25}
              height={30}
              className="mt-1 hidden h-10 w-auto shrink-0 sm:block"
            />
            <div className="mr-auto flex min-w-0 flex-col gap-1">
              <p className="text-xs font-medium uppercase tracking-widest text-orange">
                One-time purchase
              </p>
              <h1 className="text-balance text-2xl font-bold tracking-tight sm:text-3xl">
                Clipmer Pro
              </h1>
            </div>
            <div className="flex flex-col items-end" aria-live="polite">
              <span className="text-3xl font-bold tabular-nums tracking-tight sm:text-4xl">
                {headline}
              </span>
              <span className="text-sm text-muted-foreground">once</span>
            </div>
          </div>

          <p className="text-sm leading-relaxed text-muted-foreground">
            Pay once and keep it: no subscription, no account. One license key
            works on every Linux machine you own, and it arrives by email.
          </p>

          <button
            type="button"
            aria-expanded={detailsOpen}
            aria-controls="order-details"
            onClick={() => setDetailsOpen((o) => !o)}
            className="flex min-h-11 items-center justify-between rounded-lg border border-border px-4 text-sm font-medium lg:hidden"
          >
            {detailsOpen ? "Hide what you get" : "What you get"}
            <ChevronDown
              className={cn("size-4 transition-transform", detailsOpen && "rotate-180")}
              aria-hidden
            />
          </button>

          <div
            id="order-details"
            className={cn("flex-col gap-5", detailsOpen ? "flex" : "hidden lg:flex")}
          >
            <figure className="flex flex-col gap-2">
              <Image
                src={SHOTS.folders.src}
                alt={SHOTS.folders.alt}
                sizes="(min-width: 1024px) 460px, 92vw"
                className="h-56 w-full rounded-xl border border-border object-cover object-top"
              />
              <figcaption className="text-xs text-muted-foreground">
                A Pro folder with notes under its entries. Example entries.
              </figcaption>
            </figure>

            <ul className="flex flex-col gap-2.5 text-[15px]">
              {FEATURES.map((f) => (
                <li key={f.b} className="flex gap-3">
                  <Check className="mt-0.5 size-[18px] shrink-0 text-orange" aria-hidden />
                  <span>
                    <span className="font-semibold">{f.b}</span>
                    <span className="text-muted-foreground">{f.t}</span>
                  </span>
                </li>
              ))}
            </ul>

            <p className="text-sm leading-relaxed text-muted-foreground">
              Pro unlocks features in the same app as the free version: text
              only, x86_64 Linux. If the{" "}
              <a href="/install" className="text-orange underline decoration-orange/40 underline-offset-[3px] hover:decoration-orange">
                free version
              </a>{" "}
              runs for you, Pro will too.
            </p>

            <OrderSummaryBlock summary={summary} price={price} money={money} />
          </div>
        </section>

        {/* ── Payment ── */}
        <section
          aria-label="Payment"
          className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 sm:p-7 lg:col-start-2 lg:row-span-2 lg:row-start-1"
        >
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="mr-auto text-lg font-semibold">Payment</h2>
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <Lock className="size-3.5" aria-hidden />
              Card details go to Paddle, never to us
            </span>
          </div>

          <div aria-live="assertive" className="empty:hidden">
            {paymentFailed && (
              <div role="alert" className="flex gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm">
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-400" aria-hidden />
                <div>
                  <p className="font-medium text-foreground">The payment didn&apos;t go through</p>
                  <p className="mt-1 text-muted-foreground">
                    Nothing was charged. Try another card, or pay with PayPal,
                    Apple Pay or Google Pay in the form below.
                  </p>
                </div>
              </div>
            )}
            {lateError && !paymentFailed && (
              <div role="alert" className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-background/60 p-4 text-sm">
                <p className="mr-auto text-muted-foreground">
                  Something went wrong in the payment form.
                </p>
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-border px-4 font-medium hover:bg-secondary"
                >
                  <RotateCw className="size-4" aria-hidden />
                  Reload the form
                </button>
              </div>
            )}
          </div>

          {!CHECKOUT_READY ? (
            <Message title="Clipmer Pro isn't on sale yet">
              Nothing can be charged here. The free version has everything
              except the Pro features, and it&apos;s on the{" "}
              <a href="/install" className="text-orange underline underline-offset-[3px]">install page</a>.
            </Message>
          ) : phase === "error" ? (
            <Message title="The payment form didn't load">
              Nothing was charged. Reload the page to try again, or go back to{" "}
              <a href="/pro" className="text-orange underline underline-offset-[3px]">Clipmer Pro</a>.
              If it keeps happening, email{" "}
              <a href="mailto:support@clipmer.app" className="text-orange underline underline-offset-[3px]">
                support@clipmer.app
              </a>
              .
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="mt-4 inline-flex min-h-11 items-center gap-1.5 rounded-lg bg-orange px-5 font-medium text-white hover:bg-orange-hover"
              >
                <RotateCw className="size-4" aria-hidden />
                Reload the checkout
              </button>
            </Message>
          ) : (
            // Holds the form's height while it loads, then lets Paddle size
            // its frame (the phone's express form starts much shorter).
            <div className="relative" style={phase === "loading" ? { minHeight: FRAME_HEIGHT } : undefined}>
              <div className={FRAME_CLASS} />
              {phase === "loading" && <FrameSkeleton />}
              {phase === "completed" && (
                <p role="status" className="mt-3 text-center text-sm text-muted-foreground">
                  Payment received. Taking you to the next step&hellip;
                </p>
              )}
              <noscript>
                <p className="text-sm text-muted-foreground">
                  Paddle&apos;s payment form needs JavaScript. Turn it on and reload this page.
                </p>
              </noscript>
            </div>
          )}

          <p className="text-xs leading-relaxed text-muted-foreground">
            Payments are handled by Paddle, our merchant of record. By paying
            you agree to the{" "}
            <a href="/terms" className="underline underline-offset-[3px] hover:text-foreground">Terms</a>,
            the{" "}
            <a href="/privacy" className="underline underline-offset-[3px] hover:text-foreground">Privacy Policy</a>{" "}
            and the{" "}
            <a href="/refund" className="underline underline-offset-[3px] hover:text-foreground">Refund Policy</a>.
          </p>
        </section>
        {/* ── Reassurance: under the order card on desktop, after the form on a phone ── */}
        <section aria-label="Good to know" className="px-1 lg:col-start-1 lg:row-start-2 lg:px-0">
          <ul className="grid grid-cols-1 gap-3 text-sm text-muted-foreground sm:grid-cols-2">
            <li>
              <span className="font-medium text-foreground">Refunds for 14 days</span>
              <br />
              see the{" "}
              <a href="/refund" className="underline underline-offset-[3px] hover:text-foreground">
                refund policy
              </a>
            </li>
            <li>
              <span className="font-medium text-foreground">Paddle is the merchant of record</span>
              <br />
              it handles the payment, tax and receipt
            </li>
            <li>
              <span className="font-medium text-foreground">Your statement will say</span>
              <br />
              <span className="font-mono text-[13px] text-foreground">{STATEMENT_NAME}</span>
            </li>
            <li>
              <span className="font-medium text-foreground">Your license key</span>
              <br />
              by email, usually within a minute
            </li>
          </ul>
        </section>
      </main>
    </div>
  );
}

function OrderSummaryBlock({
  summary,
  price,
  money,
}: {
  summary: OrderSummary | undefined;
  price: string;
  money: (n: number) => string;
}) {
  return (
    <div
      aria-label="Order summary"
      aria-live="polite"
      className="flex flex-col gap-2.5 rounded-xl bg-background/60 p-4 text-sm"
    >
      <Row label="Clipmer Pro" value={summary ? money(summary.subtotal) : price} />
      {summary && summary.discount > 0 && (
        <Row
          label={summary.discountCode ? `Discount · ${summary.discountCode}` : "Discount"}
          value={`−${money(summary.discount)}`}
          accent
        />
      )}
      <Row
        label={summary ? taxLabel(summary) : "Tax"}
        value={summary ? money(summary.tax) : "From your country"}
        muted={!summary}
      />
      <div className="h-px bg-border" />
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-semibold">Total</span>
        <span className="text-xl font-bold tabular-nums tracking-tight">
          {summary ? (
            <>
              {money(summary.total)}{" "}
              <span className="text-xs font-medium text-muted-foreground">{summary.currency}</span>
            </>
          ) : (
            <span className="text-sm font-normal text-muted-foreground">Shown when the form loads</span>
          )}
        </span>
      </div>
      {summary?.reverseCharge && (
        <p className="text-xs text-muted-foreground">
          VAT is reverse-charged: you account for it, not Paddle
          {summary.businessName ? ` (invoiced to ${summary.businessName})` : ""}.
        </p>
      )}
    </div>
  );
}

function Row({
  label,
  value,
  accent,
  muted,
}: {
  label: string;
  value: string;
  accent?: boolean;
  muted?: boolean;
}) {
  return (
    <div className="flex justify-between gap-3">
      <span className={accent ? "font-medium text-orange" : "text-muted-foreground"}>{label}</span>
      <span
        className={cn(
          "tabular-nums",
          accent && "font-medium text-orange",
          muted && "text-muted-foreground"
        )}
      >
        {value}
      </span>
    </div>
  );
}

function Message({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-background/40 p-6 text-center"
      style={{ minHeight: FRAME_HEIGHT }}
    >
      <p className="text-base font-semibold">{title}</p>
      <div className="flex max-w-sm flex-col items-center text-sm leading-relaxed text-muted-foreground">
        <p>{children}</p>
      </div>
    </div>
  );
}

function FrameSkeleton() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 flex flex-col gap-3 rounded-xl p-1 motion-safe:animate-pulse"
    >
      <span className="h-11 rounded-[10px] bg-secondary" />
      <span className="h-11 rounded-[10px] bg-secondary" />
      <div className="grid grid-cols-2 gap-3">
        <span className="h-11 rounded-[10px] bg-secondary" />
        <span className="h-11 rounded-[10px] bg-secondary" />
      </div>
      <span className="h-11 w-2/3 rounded-[10px] bg-secondary" />
      <span className="mt-auto h-12 rounded-xl bg-secondary/80" />
    </div>
  );
}
