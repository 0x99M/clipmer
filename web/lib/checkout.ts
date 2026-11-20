// What the /checkout page decides, as pure functions so they are unit-tested
// (tests/checkout.test.ts). Runs in the browser and on the server, and is
// loaded by `node --test` directly: no imports, no process.env, and only
// TypeScript that Node can strip (no enums).
//
// Event data is read here and turned into display values on the spot. It holds
// the buyer's email, address and card's last 4 digits, so nothing in this file
// keeps, logs or sends it anywhere.

/** What the buyer's card statement shows, for every product in the 0x99M account. */
export const STATEMENT_NAME = "PADDLE.NET* 0X99M";

/** Clipmer's own checkout. Paddle's emails for transactions Clipmer creates link here. */
export const CHECKOUT_PATH = "/checkout";
export const SITE_ORIGIN = "https://clipmer.app";
export const CHECKOUT_URL = `${SITE_ORIGIN}${CHECKOUT_PATH}`;
export const SUCCESS_PATH = "/thank-you";

/** Live catalogue ids ("Clipmer Pro", $9 one-time). Sandbox ids come from env. */
export const LIVE_PRODUCT_ID = "pro_01kr0bq86j5gjrh2ny2e4yne3y";
export const LIVE_PRICE_ID = "pri_01kr0bsd5e9j0y429czw5455nk";

/** The price shown before Paddle reports one: the catalogue's base price. */
export const BASE_PRICE = { amount: 9, currency: "USD" } as const;

/** Paddle opens links it made itself (`?_ptxn=`); the page must not open another. */
export function paddleOpensItself(search: string): boolean {
  return new URLSearchParams(search).has("_ptxn");
}

/** A transaction id the server returned, or undefined for anything else. */
export function validTransactionId(id: unknown): string | undefined {
  return typeof id === "string" && /^txn_[a-z0-9]{10,64}$/.test(id) ? id : undefined;
}

/** The parts of Paddle.js checkout event data the order summary reads. */
export interface CheckoutEventData {
  currency_code?: string;
  totals?: { subtotal?: number; discount?: number; tax?: number; total?: number };
  discount?: { code?: string; id?: string } | null;
  customer?: {
    address?: { country_code?: string } | null;
    business?: { name?: string; tax_identifier?: string } | null;
  } | null;
}

export interface OrderSummary {
  currency: string;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  /** The code the buyer entered, when a discount is applied. */
  discountCode?: string;
  /** ISO 3166-1 alpha-2, once Paddle knows where the buyer is. */
  country?: string;
  /** A business added a tax number and Paddle charges no tax: reverse charge. */
  reverseCharge: boolean;
  /** The business name Paddle has for a reverse-charged order. */
  businessName?: string;
}

const num = (v: unknown): number => (typeof v === "number" && Number.isFinite(v) ? v : 0);

/**
 * The order summary from a checkout event. Paddle.js reports totals as numbers
 * in major units (9 for $9.00), unlike the REST API's minor-unit strings.
 * Returns undefined when the event has no totals, so the card keeps what it had.
 */
export function summaryFrom(data: CheckoutEventData | undefined | null): OrderSummary | undefined {
  const t = data?.totals;
  if (!data || !t || typeof data.currency_code !== "string") return undefined;
  const subtotal = num(t.subtotal);
  const discount = num(t.discount);
  const tax = num(t.tax);
  const business = data.customer?.business ?? undefined;
  const taxNumber = typeof business?.tax_identifier === "string" && business.tax_identifier.trim() !== "";
  const country = data.customer?.address?.country_code || undefined;
  const code = data.discount?.code || undefined;
  return {
    currency: data.currency_code,
    subtotal,
    discount,
    tax,
    total: num(t.total),
    discountCode: discount > 0 || code ? code : undefined,
    country,
    reverseCharge: taxNumber && tax === 0 && subtotal - discount > 0,
    businessName: taxNumber ? business?.name || undefined : undefined,
  };
}

/** "$9.00", "€8.50": the amount in the buyer's currency. */
export function formatMoney(amount: number, currency: string, locale = "en"): string {
  try {
    return new Intl.NumberFormat(locale, { style: "currency", currency }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

/** "Germany" for "DE"; the code itself when the runtime has no name for it. */
export function countryName(code: string, locale = "en"): string {
  try {
    return new Intl.DisplayNames([locale], { type: "region" }).of(code.toUpperCase()) ?? code;
  } catch {
    return code;
  }
}

/** The tax line's label in the order summary. */
export function taxLabel(s: Pick<OrderSummary, "country" | "reverseCharge">): string {
  if (s.reverseCharge) return "VAT · reverse charge";
  return s.country ? `Tax · ${countryName(s.country)}` : "Tax";
}

/** The parts of a Paddle.PricePreview response the order card reads. */
export interface PricePreviewData {
  currencyCode?: string;
  details?: {
    lineItems?: {
      formattedTotals?: { subtotal?: string; total?: string };
    }[];
  };
}

/** The pre-tax price in the buyer's currency, as Paddle formats it, or undefined. */
export function previewPrice(data: PricePreviewData | undefined | null): string | undefined {
  const formatted = data?.details?.lineItems?.[0]?.formattedTotals?.subtotal;
  return typeof formatted === "string" && formatted.trim() !== "" ? formatted : undefined;
}

/**
 * The body for POST /transactions: Clipmer's one price, and its own checkout
 * link so Paddle's emails for this transaction never fall back to the account's
 * default payment link (which is shared with other products).
 */
export function transactionRequest(priceId: string, checkoutUrl: string) {
  return {
    items: [{ price_id: priceId, quantity: 1 }],
    collection_mode: "automatic",
    checkout: { url: checkoutUrl },
  };
}

/** The checkout link for a new transaction: always clipmer.app in production. */
export function checkoutUrlFor(env: string | undefined, requestOrigin: string | null): string {
  // Live Paddle accepts only approved domains, and only clipmer.app is
  // Clipmer's. Sandbox accepts any, so local testing comes back to localhost.
  if (env === "production" || !requestOrigin) return CHECKOUT_URL;
  return `${requestOrigin.replace(/\/$/, "")}${CHECKOUT_PATH}`;
}

/** Same-origin requests only: the transaction endpoint is for this page's script. */
export function allowedOrigin(origin: string | null, host: string | null): boolean {
  if (!origin || !host) return false;
  try {
    const o = new URL(origin);
    return o.host === host && (o.protocol === "https:" || o.hostname === "localhost");
  } catch {
    return false;
  }
}

/** The phone layout uses Paddle's express variant: wallets first, then the form. */
export const PHONE_QUERY = "(max-width: 639px)";

/**
 * The Content-Security-Policy for /checkout alone (next.config.ts): Paddle.js
 * from its CDN, Paddle's frames, and the requests, styles and images Paddle.js
 * makes from its own hosts. 'unsafe-inline' is for Next's inline bootstrap
 * scripts; dev adds 'unsafe-eval' for React's error overlays.
 */
export function checkoutCsp(dev = false): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline' https://cdn.paddle.com${dev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline' https://*.paddle.com",
    "img-src 'self' data: blob: https://*.paddle.com",
    "font-src 'self' data: https://*.paddle.com",
    "connect-src 'self' https://*.paddle.com",
    "frame-src https://*.paddle.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ].join("; ");
}
