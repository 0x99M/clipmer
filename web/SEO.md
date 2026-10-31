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
- `clipboard history ubuntu 26.04` — added 15 September 2026, when that guide was
  extended to 26.04. Additive only, so the original set stays comparable.
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

## First review — 31 October 2026

Search Console export, web search, last 3 months (29 July – 28 October 2026).

| | Clicks | Impressions | CTR | Avg position |
|---|---:|---:|---:|---:|
| Total | 111 | 8,561 | 1.30% | 9.1 |
| August | 11 | 1,286 | 0.86% | 20.2 |
| September | 38 | 3,323 | 1.14% | 7.4 |
| October (to the 28th) | 62 | 3,952 | 1.57% | 6.9 |

Rankings arrived around 1 September, when average position jumped from ~20 to
~8 and has held. Since then the limit is click-through, not visibility.

| Page | Clicks | Impressions | CTR | Position |
|---|---:|---:|---:|---:|
| `/blog/clipboard-history-ubuntu` | 62 | 3,452 | 1.80% | 7.5 |
| `/blog/best-clipboard-manager-wayland` | 26 | 3,600 | 0.72% | 8.6 |
| `/blog/copyq-alternatives` | 14 | 1,068 | 1.31% | 11.4 |
| `/` | 6 | 89 | 6.74% | 20.0 |
| `/blog/clipboard-managers-on-wayland` | 1 | 304 | 0.33% | 8.0 |

The tracked query set: `clipboard history ubuntu 26.04` (as "ubuntu 26.04
clipboard history") 3 clicks from 18 impressions at position 1.9;
`clipboard history ubuntu 24.04` 6 impressions at 9.3; `copyq alternatives` 4 at
13.5; `wayland clipboard history` 3 at 10. `best clipboard manager wayland` does
not appear, but `wayland clipboard manager` does: 124 impressions at 7.2. The
brand terms do not appear at all.

Things the export shows that the metric above does not:

- **Only 14% of impressions are attributed to a listed query** (1,191 of 8,561).
  The rest are queries too rare for Google to report, so work aimed at topics
  pays more than work aimed at single phrases.
- **Around 40 of the 175 listed queries are conversation turns** — "it's not
  working", "у меня убунту 26", "24 lts", "plasma", a pasted `lsb_release -a`.
  That is AI Mode citing these pages mid-conversation, and part of why CTR is
  low at a good position.
- **`/wayland-clipboard-support` and `/blog/linux-tools-worth-installing` had no
  impressions because they are not indexed.** The indexed-pages report shows 12
  of the sitemap's 17 URLs, flat from 11 August to the end of its data on 23
  October: nothing published after the first week was indexed. Both pages return
  200 with a self-canonical and no noindex, serve their full text in the server
  HTML (2,079 and 2,244 words), and are linked from the homepage, the blog index
  and the top posts. So this is Google declining them, not a defect. The other
  three unindexed URLs are `/privacy` and `/contact`, which is fine, and
  `/blog/ubuntu-setup-for-developers`, published 25 October, after the data ends.
  The "why not indexed" reason for the two decides the fix: "Discovered" means
  crawl priority, "Crawled" means Google judged the page — for the matrix most
  likely as overlapping the Wayland post, which carries the same per-compositor
  table.

Changed in response, on 31 October:

- Snippets rewritten against the actual queries: the Wayland post's title now
  carries the exact phrase "Wayland Clipboard Manager"; the explainer's title
  targets "wayland clipboard" (162 impressions, 0 clicks) instead of "wayland
  clipboard history" (3); the Ubuntu guide's description answers "does Ubuntu
  have clipboard history" and the Super+V question; the CopyQ description leads
  with Wayland, its largest query.
- A niri section in the Wayland post (niri queries: 50 impressions, 0 clicks).
- The `wl-paste --watch` error is now quoted in both its wordings. Ubuntu ships
  wl-clipboard 2.2.1, which says "the wlroots data-control protocol"; the site
  only quoted 2.3.0's wording, so the people searching their exact error (seen
  in the export) could not match it.
- The Ubuntu guide answers the Super+V question in its second paragraph
  (~107 impressions of "how to open / shortcut" queries, 0 clicks).

**Next review: mid-December 2026.** Compare per-page CTR against the table above,
and the niri and error-string queries against zero.

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
