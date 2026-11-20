// node --test tests/ — the webhook's logic, with fake dependencies.
import { test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import {
  handlePaddleWebhook,
  isClipmerTransaction,
  maskEmail,
  verifyPaddleSignature,
  type WebhookDeps,
} from "../lib/paddle-webhook.ts";

const SECRET = "pdl_ntfset_EXAMPLE_NOT_A_REAL_SECRET";
const CLIPMER_PRICE = "pri_01kr0bsd5e9j0y429czw5455nk";
const CLIPMER_PRODUCT = "pro_01kr0bq86j5gjrh2ny2e4yne3y";
const DOTPANE_PRICE = "pri_01example0dotpane0monthly";
const DOTPANE_PRODUCT = "pro_01example0dotpane0product";
const IDS = { priceIds: [CLIPMER_PRICE], productIds: [CLIPMER_PRODUCT] };

function sign(body: string, secret = SECRET, ts = "1763600000"): string {
  const h1 = crypto.createHmac("sha256", secret).update(`${ts}:${body}`).digest("hex");
  return `ts=${ts};h1=${h1}`;
}

// The shape Paddle sends: items[].price.{id,product_id} plus details.line_items[].
function completed(priceId: string, productId: string, id = "txn_01exampleexample0001"): string {
  return JSON.stringify({
    event_id: "evt_01exampleexample",
    event_type: "transaction.completed",
    data: {
      id,
      customer_id: "ctm_01exampleexample",
      items: [{ price_id: priceId, price: { id: priceId, product_id: productId }, quantity: 1 }],
      details: { line_items: [{ price_id: priceId, product: { id: productId }, quantity: 1 }] },
    },
  });
}

function fakeDeps() {
  const sent: { to: string; licenseKey: string }[] = [];
  const logs: string[] = [];
  const errors: string[] = [];
  let emailLookups = 0;
  const deps: WebhookDeps = {
    secret: SECRET,
    ids: IDS,
    privateKey: "EXAMPLE_PRIVATE_KEY",
    resolveEmail: async () => {
      emailLookups += 1;
      return "buyer@example.com";
    },
    generateLicenseKey: (email) => `LICENSE_FOR_${email}`,
    sendLicenseEmail: async (args) => {
      sent.push(args);
      return { ok: true, messageId: "msg_example" };
    },
    log: (m) => logs.push(m),
    error: (m) => errors.push(m),
  };
  return { deps, sent, logs, errors, lookups: () => emailLookups };
}

test("a Clipmer transaction.completed sends one licence", async () => {
  const f = fakeDeps();
  const body = completed(CLIPMER_PRICE, CLIPMER_PRODUCT);
  const res = await handlePaddleWebhook(body, sign(body), f.deps);
  assert.equal(res.status, 200);
  assert.deepEqual(f.sent, [{ to: "buyer@example.com", licenseKey: "LICENSE_FOR_buyer@example.com" }]);
});

test("transaction.completed for another product's price is ignored, logged and answered 200", async () => {
  const f = fakeDeps();
  const body = completed(DOTPANE_PRICE, DOTPANE_PRODUCT, "txn_01dotpanedotpane0001");
  const res = await handlePaddleWebhook(body, sign(body), f.deps);
  assert.equal(res.status, 200);
  assert.equal(res.body.ignored, true);
  assert.equal(f.sent.length, 0, "no licence email");
  assert.equal(f.lookups(), 0, "the customer is never looked up");
  assert.equal(f.logs.length, 1);
  assert.match(f.logs[0], /txn_01dotpanedotpane0001/);
  assert.doesNotMatch(f.logs[0], /example\.com|ctm_/, "logs the id, not the payload");
});

test("a transaction with no items at all is ignored", async () => {
  const f = fakeDeps();
  const body = JSON.stringify({ event_type: "transaction.completed", data: { id: "txn_01emptyemptyempty01" } });
  const res = await handlePaddleWebhook(body, sign(body), f.deps);
  assert.equal(res.status, 200);
  assert.equal(f.sent.length, 0);
});

test("other event types are acknowledged without action", async () => {
  const f = fakeDeps();
  const body = JSON.stringify({ event_type: "subscription.created", data: { id: "sub_01example" } });
  const res = await handlePaddleWebhook(body, sign(body), f.deps);
  assert.equal(res.status, 200);
  assert.equal(f.sent.length, 0);
});

test("a bad or missing signature is 401, and a malformed h1 does not throw", async () => {
  const f = fakeDeps();
  const body = completed(CLIPMER_PRICE, CLIPMER_PRODUCT);
  for (const header of [null, "", sign(body, "wrong-secret"), "ts=1;h1=abc", "ts=1;h1=zz", "garbage"]) {
    const res = await handlePaddleWebhook(body, header, f.deps);
    assert.equal(res.status, 401, `header ${String(header)}`);
  }
  assert.equal(f.sent.length, 0);
});

test("a signature over a different body is rejected", () => {
  const body = completed(CLIPMER_PRICE, CLIPMER_PRODUCT);
  assert.equal(verifyPaddleSignature(body, sign(body), SECRET), true);
  assert.equal(verifyPaddleSignature(body + " ", sign(body), SECRET), false);
  assert.equal(verifyPaddleSignature(body, sign(body), undefined), false);
});

test("isClipmerTransaction matches on price or product, in either list", () => {
  assert.equal(isClipmerTransaction({ items: [{ price: { id: CLIPMER_PRICE } }] }, IDS), true);
  assert.equal(isClipmerTransaction({ items: [{ price_id: CLIPMER_PRICE }] }, IDS), true);
  assert.equal(isClipmerTransaction({ items: [{ price: { id: "pri_other", product_id: CLIPMER_PRODUCT } }] }, IDS), true);
  assert.equal(isClipmerTransaction({ details: { line_items: [{ product: { id: CLIPMER_PRODUCT } }] } }, IDS), true);
  assert.equal(
    isClipmerTransaction({ items: [{ price: { id: DOTPANE_PRICE, product_id: DOTPANE_PRODUCT } }] }, IDS),
    false
  );
  assert.equal(isClipmerTransaction(null, IDS), false);
  assert.equal(isClipmerTransaction({ items: "nope" }, IDS), false);
  // An empty id in the config must never match an item with no id.
  assert.equal(isClipmerTransaction({ items: [{ price_id: "" }] }, { priceIds: [""], productIds: [""] }), false);
});

test("an email failure is a 500 so Paddle retries", async () => {
  const f = fakeDeps();
  f.deps.sendLicenseEmail = async () => ({ ok: false, error: "smtp down" });
  const body = completed(CLIPMER_PRICE, CLIPMER_PRODUCT);
  const res = await handlePaddleWebhook(body, sign(body), f.deps);
  assert.equal(res.status, 500);
});

test("logs never carry the buyer's full email", async () => {
  const f = fakeDeps();
  const body = completed(CLIPMER_PRICE, CLIPMER_PRODUCT);
  await handlePaddleWebhook(body, sign(body), f.deps);
  f.deps.sendLicenseEmail = async () => ({ ok: false, error: "smtp down" });
  await handlePaddleWebhook(body, sign(body), f.deps);
  for (const line of [...f.logs, ...f.errors]) assert.doesNotMatch(line, /buyer@example\.com/, line);
  assert.match(f.logs.join("\n"), /b\*\*\*@example\.com/);
  assert.equal(maskEmail("buyer@example.com"), "b***@example.com");
  assert.equal(maskEmail("nope"), "***");
});
