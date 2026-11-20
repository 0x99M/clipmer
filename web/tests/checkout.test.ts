// node --test tests/ — the checkout page's pure logic.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  allowedOrigin,
  checkoutCsp,
  checkoutUrlFor,
  countryName,
  formatMoney,
  paddleOpensItself,
  previewPrice,
  summaryFrom,
  taxLabel,
  transactionRequest,
  validTransactionId,
  CHECKOUT_URL,
  LIVE_PRICE_ID,
} from "../lib/checkout.ts";

// Shaped like a Paddle.js checkout.updated event; all example data.
const base = {
  currency_code: "EUR",
  totals: { subtotal: 8.5, discount: 0, tax: 1.62, total: 10.12 },
  customer: { email: "buyer@example.com", address: { country_code: "DE" }, business: null },
  discount: null,
};

test("summary reads totals, currency and country", () => {
  const s = summaryFrom(base);
  assert.deepEqual(s, {
    currency: "EUR",
    subtotal: 8.5,
    discount: 0,
    tax: 1.62,
    total: 10.12,
    discountCode: undefined,
    country: "DE",
    reverseCharge: false,
    businessName: undefined,
  });
  assert.equal(taxLabel(s!), "Tax · Germany");
});

test("summary carries an applied discount code and amount", () => {
  const s = summaryFrom({
    ...base,
    totals: { subtotal: 8.5, discount: 1.7, tax: 1.29, total: 8.09 },
    discount: { code: "EXAMPLE20", id: "dsc_01example" },
  });
  assert.equal(s?.discountCode, "EXAMPLE20");
  assert.equal(s?.discount, 1.7);
  assert.equal(s?.total, 8.09);
});

test("a business tax number with zero tax is reverse charge", () => {
  const s = summaryFrom({
    ...base,
    totals: { subtotal: 8.5, discount: 0, tax: 0, total: 8.5 },
    customer: {
      address: { country_code: "DE" },
      business: { name: "Example GmbH", tax_identifier: "DE000000000" },
    },
  });
  assert.equal(s?.reverseCharge, true);
  assert.equal(s?.businessName, "Example GmbH");
  assert.equal(taxLabel(s!), "VAT · reverse charge");
});

test("zero tax without a tax number is not reverse charge", () => {
  const s = summaryFrom({ ...base, currency_code: "USD", totals: { subtotal: 9, discount: 0, tax: 0, total: 9 }, customer: { address: { country_code: "US" } } });
  assert.equal(s?.reverseCharge, false);
  assert.equal(taxLabel(s!), "Tax · United States");
});

test("a fully discounted order is not called reverse charge", () => {
  const s = summaryFrom({
    ...base,
    totals: { subtotal: 8.5, discount: 8.5, tax: 0, total: 0 },
    customer: { business: { name: "Example Ltd", tax_identifier: "GB000000000" } },
  });
  assert.equal(s?.reverseCharge, false);
});

test("events without totals or currency leave the summary alone", () => {
  assert.equal(summaryFrom(undefined), undefined);
  assert.equal(summaryFrom({ currency_code: "USD" }), undefined);
  assert.equal(summaryFrom({ totals: { total: 9 } }), undefined);
});

test("summary does not keep the email", () => {
  const s = summaryFrom(base);
  assert.doesNotMatch(JSON.stringify(s), /example\.com/);
});

test("tax label before Paddle knows the country", () => {
  assert.equal(taxLabel({ country: undefined, reverseCharge: false }), "Tax");
});

test("money and country formatting", () => {
  assert.equal(formatMoney(9, "USD"), "$9.00");
  assert.equal(formatMoney(8.5, "EUR"), "€8.50");
  assert.equal(formatMoney(9, "NOT_A_CURRENCY"), "9.00 NOT_A_CURRENCY");
  assert.equal(countryName("gb"), "United Kingdom");
});

test("Paddle's own links are left for Paddle.js to open", () => {
  assert.equal(paddleOpensItself("?_ptxn=txn_01example"), true);
  assert.equal(paddleOpensItself("?utm_source=x"), false);
  assert.equal(paddleOpensItself(""), false);
});

test("only well-formed transaction ids are opened", () => {
  assert.equal(validTransactionId("txn_01kr0exampleexample01"), "txn_01kr0exampleexample01");
  for (const bad of [undefined, null, 42, "", "txn_", "pri_01kr0exampleexample01", "txn_01<script>"]) {
    assert.equal(validTransactionId(bad), undefined, String(bad));
  }
});

test("price preview reads the formatted pre-tax line total", () => {
  assert.equal(previewPrice({ currencyCode: "EUR", details: { lineItems: [{ formattedTotals: { subtotal: "€8.50", total: "€10.12" } }] } }), "€8.50");
  assert.equal(previewPrice({ details: { lineItems: [] } }), undefined);
  assert.equal(previewPrice(undefined), undefined);
});

test("server-created transactions carry Clipmer's own checkout link", () => {
  const body = transactionRequest(LIVE_PRICE_ID, CHECKOUT_URL);
  assert.deepEqual(body.items, [{ price_id: LIVE_PRICE_ID, quantity: 1 }]);
  assert.deepEqual(body.checkout, { url: "https://clipmer.app/checkout" });
});

test("production always links to clipmer.app; sandbox comes back to the origin", () => {
  assert.equal(checkoutUrlFor("production", "http://localhost:3000"), "https://clipmer.app/checkout");
  assert.equal(checkoutUrlFor("production", null), "https://clipmer.app/checkout");
  assert.equal(checkoutUrlFor("sandbox", "http://localhost:3000"), "http://localhost:3000/checkout");
});

test("the transaction endpoint accepts its own origin only", () => {
  assert.equal(allowedOrigin("https://clipmer.app", "clipmer.app"), true);
  assert.equal(allowedOrigin("http://localhost:3000", "localhost:3000"), true);
  assert.equal(allowedOrigin("https://dotpane.com", "clipmer.app"), false);
  assert.equal(allowedOrigin("http://clipmer.app", "clipmer.app"), false);
  assert.equal(allowedOrigin(null, "clipmer.app"), false);
  assert.equal(allowedOrigin("not a url", "clipmer.app"), false);
});

test("the checkout CSP allows Paddle's script and frames, and nothing else third-party", () => {
  const csp = checkoutCsp();
  const directive = (name: string) => csp.split("; ").find((d) => d.startsWith(name + " ")) ?? "";
  assert.equal(directive("script-src"), "script-src 'self' 'unsafe-inline' https://cdn.paddle.com");
  assert.equal(directive("frame-src"), "frame-src https://*.paddle.com");
  assert.match(directive("frame-ancestors"), /'none'/);
  const hosts = csp.match(/https:\/\/[^\s;]+/g) ?? [];
  assert.ok(hosts.every((h) => /^https:\/\/(cdn|\*)\.paddle\.com$/.test(h)), hosts.join(" "));
  assert.doesNotMatch(csp, /unsafe-eval/);
  assert.match(checkoutCsp(true), /unsafe-eval/);
});
