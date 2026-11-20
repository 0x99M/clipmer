// Clipmer's Paddle settings, read from the environment. The NEXT_PUBLIC_ ones
// are inlined into the browser bundle at build time; they are public by design
// (a client-side token can only open checkouts and preview prices). The API key
// and webhook secret are read in server code only, never here.

import { LIVE_PRICE_ID, LIVE_PRODUCT_ID } from "@/lib/checkout";
import type { ClipmerIds } from "@/lib/paddle-webhook";

export type PaddleEnv = "sandbox" | "production";

export const PADDLE_ENV: PaddleEnv =
  process.env.NEXT_PUBLIC_PADDLE_ENV === "production" ? "production" : "sandbox";

/** The "Clipmer website" client-side token (live_… in production, test_… in sandbox). */
export const PADDLE_CLIENT_TOKEN = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN;

/** Clipmer Pro's price. Live is pri_01kr0bsd5e9j0y429czw5455nk. */
export const PADDLE_PRICE_ID =
  process.env.NEXT_PUBLIC_PADDLE_PRICE_ID || (PADDLE_ENV === "production" ? LIVE_PRICE_ID : undefined);

/** The master switch on /pro and /checkout. Off → "Coming soon", no Paddle.js. */
export const BUY_PRO_ENABLED = process.env.NEXT_PUBLIC_BUY_PRO_ENABLED === "true";

export const CHECKOUT_READY = Boolean(BUY_PRO_ENABLED && PADDLE_CLIENT_TOKEN && PADDLE_PRICE_ID);

/**
 * The ids that make a transaction Clipmer's. The live ids are always included,
 * so a missing or sandbox env var can never make the webhook ignore a real sale;
 * PADDLE_PRODUCT_ID adds the sandbox product when testing there.
 */
export function clipmerIds(): ClipmerIds {
  return {
    priceIds: [LIVE_PRICE_ID, process.env.NEXT_PUBLIC_PADDLE_PRICE_ID ?? ""].filter(Boolean),
    productIds: [LIVE_PRODUCT_ID, process.env.PADDLE_PRODUCT_ID ?? ""].filter(Boolean),
  };
}
