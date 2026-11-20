import { NextRequest, NextResponse } from "next/server";
import { getPaddleApiBase } from "@/lib/paddle";
import { PADDLE_ENV, PADDLE_PRICE_ID } from "@/lib/paddle-config";
import {
  allowedOrigin,
  checkoutUrlFor,
  transactionRequest,
  validTransactionId,
} from "@/lib/checkout";

// Creates Clipmer Pro's transaction on the server, so it carries Clipmer's own
// checkout link (`checkout.url`). Paddle's emails for it (abandoned checkout,
// payment-method updates) then come back to clipmer.app/checkout instead of the
// account's default payment link, which is shared with other products.
//
// The request takes no input: the price is fixed here, so this can only ever
// create a $9 Clipmer Pro transaction. Any failure answers 503 and the page
// falls back to opening the checkout with the price id, which Paddle.js turns
// into a transaction itself (that one uses the default payment link).

const WINDOW_MS = 60_000;
const PER_WINDOW = 10;
const hits = new Map<string, { n: number; since: number }>();

function limited(ip: string): boolean {
  const now = Date.now();
  if (hits.size > 5_000) hits.clear();
  const h = hits.get(ip);
  if (!h || now - h.since > WINDOW_MS) {
    hits.set(ip, { n: 1, since: now });
    return false;
  }
  h.n += 1;
  return h.n > PER_WINDOW;
}

export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (!allowedOrigin(origin, host)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
  if (limited(ip)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const apiKey = process.env.PADDLE_API_KEY;
  if (!apiKey || !PADDLE_PRICE_ID) {
    return NextResponse.json({ error: "Unavailable" }, { status: 503 });
  }

  try {
    const res = await fetch(`${getPaddleApiBase()}/transactions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(transactionRequest(PADDLE_PRICE_ID, checkoutUrlFor(PADDLE_ENV, origin))),
      cache: "no-store",
    });
    if (!res.ok) {
      // Status and Paddle's error code only (e.g. a key without the
      // transaction.write permission): the detail can echo request data.
      const code = await res
        .json()
        .then((j: { error?: { code?: unknown } }) =>
          typeof j?.error?.code === "string" ? j.error.code.replace(/[^a-z0-9_]/gi, "") : "")
        .catch(() => "");
      console.error(`[checkout] POST /transactions → ${res.status}${code ? ` (${code})` : ""}`);
      return NextResponse.json({ error: "Unavailable" }, { status: 503 });
    }
    const json = (await res.json()) as { data?: { id?: unknown } };
    const transactionId = validTransactionId(json.data?.id);
    if (!transactionId) {
      console.error("[checkout] POST /transactions returned no transaction id");
      return NextResponse.json({ error: "Unavailable" }, { status: 503 });
    }
    return NextResponse.json(
      { transactionId },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    console.error("[checkout] POST /transactions threw:", err instanceof Error ? err.message : "unknown");
    return NextResponse.json({ error: "Unavailable" }, { status: 503 });
  }
}
