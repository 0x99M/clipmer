# Clipmer Pro checkout

Clipmer sells one thing, Clipmer Pro ($9, one-time), through the 0x99M Paddle
seller account it shares with Dotpane and videos.recipes. This file is the
plan and the operating notes for `/checkout`. Design reference: the "Checkout
design" canvas, boards 1–5.

## How a purchase flows

1. `/pro` → **Get Clipmer Pro** is a plain `<a href="/checkout">` (a full page
   load, so the checkout's CSP header comes with the document).
2. `/checkout` initialises Paddle.js once (`theme: 'dark'`, `displayMode:
   'inline'`, `frameTarget`, `frameInitialHeight: 450`, `frameStyle` with
   `min-width: 312px`, `locale: 'en'`, `successUrl: /thank-you`).
   - Desktop: `variant: 'one-page'` with `showAddDiscounts` and `showAddTaxId`.
   - Phone (`max-width: 639px`): `variant: 'express'` — Apple Pay and Google Pay
     first, the full form below. Paddle refuses express together with the
     discount and tax-number options (the form never loads), so those are
     desktop-only.
3. The page asks `POST /api/checkout` for a transaction. The server creates it
   with Clipmer's price and `checkout: { url: 'https://clipmer.app/checkout' }`,
   so Paddle's emails for it come back to Clipmer, not to the account default.
   If that fails (no key, key without permission, Paddle down) the page opens
   the checkout with the price id instead; that transaction uses the account's
   default payment link.
4. `?_ptxn=` links (Paddle's emails, the shared payment page) are opened by
   Paddle.js itself; the page never opens a second checkout over them.
   `/pro?_ptxn=` (the old default link) redirects to `/checkout?_ptxn=`.
5. On success Paddle redirects to `/thank-you` (a 4 s fallback does it if
   Paddle doesn't). The licence is emailed by the webhook, whichever page took
   the payment, so `/thank-you` needs no state and works when the buyer comes
   from `dotpane.com/pay`.

## The order card

Filled from Paddle.js events, never hard-coded: `checkout.loaded`, `.updated`,
`.items.updated`, `.discount.applied/.removed`, `.customer.created/.updated/
.removed` → `data.totals.*` (numbers in major units), `data.currency_code`,
`data.discount.code`, `data.customer.address.country_code`,
`data.customer.business`. Before the form loads, `Paddle.PricePreview` puts the
price in the buyer's currency. Logic: `lib/checkout.ts`, tests:
`tests/checkout.test.ts`.

States: loading (skeleton holds 450 px), discount line and new total,
reverse-charge VAT when a business adds a tax number and tax is 0,
`checkout.payment.failed` ("nothing was charged", other methods),
`checkout.error` before load (reload, back to /pro, support email) or after
(non-blocking reload), no form after 20 s → the error state, and "not on sale"
when `NEXT_PUBLIC_BUY_PRO_ENABLED` isn't `true`.

No prefill: Clipmer has no accounts, so there is no email or country to pass.
Nothing ever puts an email in a URL.

## Security and privacy

- Card details only go into Paddle's iframe (`*.paddle.com`).
- Event payloads (email, address, card last 4) are turned into display values
  and never logged, stored or sent.
- `PADDLE_API_KEY` and `PADDLE_WEBHOOK_SECRET` are server-only. The browser
  gets the client token, price id and environment (`NEXT_PUBLIC_*`).
- CSP on `/checkout` only (`checkoutCsp()` in `lib/checkout.ts`, wired in
  `next.config.ts`): scripts from `'self'` and `https://cdn.paddle.com`, frames,
  styles, images and requests from `https://*.paddle.com`, `frame-ancestors
  'none'`. Every other route has no CSP, as before.
- `POST /api/checkout` takes no input (it can only create a $9 Clipmer Pro
  transaction), accepts same-origin requests only, and is rate-limited per IP
  in memory (10 a minute).

## Webhook

Every destination in the account receives `transaction.completed` for every
product. `lib/paddle-webhook.ts` sends a licence only when an item carries
Clipmer's price (`pri_01kr0bsd5e9j0y429czw5455nk`) or product
(`pro_01kr0bq86j5gjrh2ny2e4yne3y`); anything else is logged by transaction id
and answered 200. The live ids are always in the allow-list; sandbox adds
`NEXT_PUBLIC_PADDLE_PRICE_ID` and `PADDLE_PRODUCT_ID`. A malformed
`Paddle-Signature` is now a 401, not a 500.

## For the shared payment page (dotpane.com/pay)

| Field | Value |
|---|---|
| Display name | Clipmer Pro |
| Accent colour | `#E95420` |
| Logo | `public/clipmer-mark.svg` (inline SVG below) |
| Success URL | `https://clipmer.app/thank-you` |
| Support | `mailto:support@clipmer.app` |
| Refund policy | `https://clipmer.app/refund` (14 days) |
| Match on | product `pro_01kr0bq86j5gjrh2ny2e4yne3y` |

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="3.5 1.6 17 20.4" width="25" height="30" role="img" aria-label="Clipmer"><mask id="clipmer-mark"><rect x="3.5" y="1.6" width="17" height="20.4" fill="#000"/><rect x="3.5" y="4" width="17" height="18" rx="3.2" fill="#fff"/><rect x="8.5" y="1.6" width="7" height="4.6" rx="2.3" fill="#fff"/><rect x="7" y="9.8" width="10" height="1.8" rx="0.9" fill="#000"/><circle cx="8.4" cy="14.3" r="1.15" fill="#000"/><circle cx="12" cy="14.3" r="1.15" fill="#000"/><circle cx="15.6" cy="14.3" r="1.15" fill="#000"/><rect x="7" y="17" width="6.6" height="1.8" rx="0.9" fill="#000"/></mask><rect x="3.5" y="1.6" width="17" height="20.4" fill="#E95420" mask="url(#clipmer-mark)"/></svg>
```

If the shared page shows several products' logos at once, rename the mask id
(`clipmer-mark`) so it can't collide.

## Before going live

- `PADDLE_API_KEY` needs the **transaction write** permission. The sandbox key
  in `.env.local` returns `403 forbidden` for `POST /transactions`, so locally
  the page always uses the price-id fallback. Check the live key's permissions
  in Paddle → Developer tools → Authentication; until it has them, live
  checkouts work but use the account's default payment link.
- Test on clipmer.app in a real phone browser: Apple Pay and Google Pay in the
  express frame, a discount code and a tax number on desktop, a declined test
  card, and a `?_ptxn=` link.

## Tests

`npm test` runs `node --test` on `tests/*.test.ts` (Node's built-in runner and
type stripping, no new packages). `lib/checkout.ts` and `lib/paddle-webhook.ts`
import nothing from the app, so Node loads them directly; `tests/` is excluded
from `tsconfig.json`.
