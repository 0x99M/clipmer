// The Paddle webhook's logic, apart from Next so it is unit-tested
// (tests/paddle-webhook.test.ts). app/api/paddle-webhook/route.ts wires in the
// real dependencies. Imports node:crypto only, so `node --test` loads it as is.
//
// The 0x99M seller account sells Clipmer, Dotpane and videos.recipes, and every
// notification destination receives `transaction.completed` for all of them.
// Only a transaction carrying Clipmer's own price or product gets a licence;
// everything else is logged by id and answered 200, so Paddle stops retrying.

import crypto from "node:crypto";

export interface ClipmerIds {
  priceIds: readonly string[];
  productIds: readonly string[];
}

/** Paddle-Signature: `ts=<unix>;h1=<hex hmac-sha256 of "ts:body">`. */
export function verifyPaddleSignature(
  rawBody: string,
  header: string | null,
  secret: string | undefined
): boolean {
  if (!header || !secret) return false;
  const parts: Record<string, string> = {};
  for (const part of header.split(";")) {
    const i = part.indexOf("=");
    if (i > 0) parts[part.slice(0, i).trim()] = part.slice(i + 1).trim();
  }
  const ts = parts["ts"];
  const h1 = parts["h1"];
  if (!ts || !h1 || !/^[0-9a-f]+$/i.test(h1)) return false;
  const computed = crypto.createHmac("sha256", secret).update(`${ts}:${rawBody}`).digest();
  const given = Buffer.from(h1, "hex");
  // timingSafeEqual throws on unequal lengths, which used to turn a malformed
  // header into a 500 instead of a 401.
  return given.length === computed.length && crypto.timingSafeEqual(given, computed);
}

type Item = {
  price_id?: string;
  price?: { id?: string; product_id?: string } | null;
  product_id?: string;
  product?: { id?: string } | null;
};

/** Whether any item on the transaction is Clipmer's price or product. */
export function isClipmerTransaction(data: unknown, ids: ClipmerIds): boolean {
  const d = (data ?? {}) as { items?: Item[]; details?: { line_items?: Item[] } };
  const items: Item[] = [
    ...(Array.isArray(d.items) ? d.items : []),
    ...(Array.isArray(d.details?.line_items) ? d.details.line_items : []),
  ];
  const prices = new Set(ids.priceIds.filter(Boolean));
  const products = new Set(ids.productIds.filter(Boolean));
  return items.some((item) => {
    if (!item || typeof item !== "object") return false;
    const priceIds = [item.price_id, item.price?.id];
    const productIds = [item.product_id, item.price?.product_id, item.product?.id];
    return (
      priceIds.some((id) => typeof id === "string" && prices.has(id)) ||
      productIds.some((id) => typeof id === "string" && products.has(id))
    );
  });
}

/** "b***@example.com": enough to match a support email, not the address itself. */
export function maskEmail(email: string): string {
  const at = email.lastIndexOf("@");
  if (at < 1) return "***";
  return `${email[0]}***${email.slice(at)}`;
}

export interface WebhookDeps {
  secret: string | undefined;
  ids: ClipmerIds;
  privateKey: string | undefined;
  resolveEmail: (data: Record<string, unknown>) => Promise<string | null>;
  generateLicenseKey: (email: string, privateKey: string) => string;
  sendLicenseEmail: (args: {
    to: string;
    licenseKey: string;
  }) => Promise<{ ok: boolean; messageId?: string; error?: unknown }>;
  log: (message: string) => void;
  error: (message: string, detail?: unknown) => void;
}

export interface WebhookResult {
  status: number;
  body: Record<string, unknown>;
}

export async function handlePaddleWebhook(
  rawBody: string,
  signature: string | null,
  deps: WebhookDeps
): Promise<WebhookResult> {
  if (!verifyPaddleSignature(rawBody, signature, deps.secret)) {
    return { status: 401, body: { error: "Unauthorized" } };
  }

  let event: { event_type?: string; data?: Record<string, unknown> };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return { status: 400, body: { error: "Invalid JSON" } };
  }

  if (event.event_type !== "transaction.completed") {
    return { status: 200, body: { ok: true } };
  }

  const data = event.data ?? {};
  const transactionId = typeof data.id === "string" ? data.id : "<unknown>";

  if (!isClipmerTransaction(data, deps.ids)) {
    // Another product in the shared account. Its id is enough to find it in
    // Paddle; the payload itself (email, address) is never logged.
    deps.log(`[webhook] Ignored ${transactionId}: no Clipmer price or product on it`);
    return { status: 200, body: { ok: true, ignored: true } };
  }

  const email = await deps.resolveEmail(data);
  if (!email) {
    deps.error(
      `[webhook] No customer email on transaction ${transactionId} (customer_id: ${
        typeof data.customer_id === "string" ? data.customer_id : "<none>"
      })`
    );
    return { status: 400, body: { error: "No email found" } };
  }

  if (!deps.privateKey) {
    deps.error("[webhook] LICENSE_PRIVATE_KEY not set");
    return { status: 500, body: { error: "Server misconfigured" } };
  }

  const licenseKey = deps.generateLicenseKey(email, deps.privateKey);
  const result = await deps.sendLicenseEmail({ to: email, licenseKey });

  if (!result.ok) {
    deps.error(
      `[webhook] License email failed (tx: ${transactionId}, email: ${maskEmail(email)}):`,
      result.error
    );
    return { status: 500, body: { error: "Email send failed" } };
  }

  deps.log(
    `[webhook] License emailed to ${maskEmail(email)} (message: ${result.messageId ?? "<unknown>"}, tx: ${transactionId})`
  );
  return { status: 200, body: { ok: true } };
}
