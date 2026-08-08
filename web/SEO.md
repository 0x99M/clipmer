# Search: baseline and what we measure

Recorded 8 August 2026, before the Phase 0/1 fixes were deployed. The point of
writing this down is that search work pays out in months, and without a fixed
baseline and a fixed metric it is impossible to tell six months later whether
anything worked.

## Baseline — 8 August 2026

From Search Console, property `sc-domain:clipmer.app`:

| | |
|---|---|
| Indexed pages | 3 |
| Not indexed | 7 (1 redirect, 6 crawled-not-indexed) |
| Sitemap last read by Google | 26 May 2026 |
| URLs Google knew about | 6 (the live sitemap had 12) |
| Core Web Vitals | "No data", both form factors |
| Meaningful impressions | ~0 |
| Backlinks | effectively none |

## The metric

**Search Console → Performance → Queries: impressions and clicks**, against
this query set:

- `wayland clipboard history`
- `clipboard history ubuntu 24.04`
- `copyq alternatives`
- `best clipboard manager wayland`
- `clipmer` / `clipmer pro` (brand baseline)

**Not** the indexed-page count. Four of the six not-indexed URLs are legal
pages, where not being indexed is the correct outcome — driving that number to
zero would mean indexing `/contact` and `/refund`, which is anti-work. Indexing
two blog posts is worth more than indexing four legal pages.

**First real review: mid-October 2026.** Earlier than that there is nothing
meaningful to see; crawl and indexing respond over weeks to months, and this
domain has no backlink profile to accelerate it.

## No analytics

`app/privacy/page.tsx` states the site "does not use cookies or third-party
analytics", and that page is part of the Paddle merchant-of-record posture.
Adding Google Analytics, Plausible or anything similar would contradict a
published legal page and needs a legal review, not a technical decision.

Search Console needs no script and no cookie, and is the only tool that reports
actual query data. That is the whole stack.

## Guard

`npm run check:metadata [origin]` walks the sitemap and fails on the defects
that already shipped once: a canonical pointing somewhere else, a missing
`og:image`, an over-length title or description, `SoftwareApplication` markup
off the homepage, or an indexable route missing from `sitemap.ts`.

Run it after a deploy:

```bash
npm run check:metadata https://clipmer.app
```

## Things deliberately not done

- **FAQPage markup on `/pro`.** FAQ rich results were deprecated in May 2026 and
  no longer render. `QAPage` is not a substitute.
- **`aggregateRating` on the app schema.** Google's Software App rich result
  requires it, and there are no real third-party reviews to draw from.
  Fabricating one is a policy violation.
- **`potentialAction` / `SearchAction`.** The sitelinks search box was retired
  globally in November 2024.
- **Core Web Vitals work.** "No data" on both form factors is a CrUX sample-size
  floor — a traffic problem, not a performance fault. Measured: CLS 0, all
  routes prerendered, TTFB 0.36–0.51s. The one real exception was `/pro`'s hero,
  fixed in `ec2b2e6`.
- **Targeting `linux clipboard manager`.** Held by It's FOSS, Tecmint and
  OMG!Ubuntu. Out of reach well beyond 12 months on a domain with no links.
