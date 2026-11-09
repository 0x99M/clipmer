# Title tests

The log of every search-title change and how it was read. The method is the
`seo-title-testing` skill (`~/.claude/skills/seo-title-testing/`): pick pages that
rank 3-10 with a CTR well under their position's benchmark, change one title at a
time, read it on clicks over equal windows at a similar position. `SEO.md` holds the
strategy and the periodic reviews; this file holds one entry per test.

Titles are `seoTitle` in `lib/posts.ts` (the H1 is `title` beside it). The blog
template appends ` — Clipmer`, and `npm run check:metadata` fails a title over 63
characters including that suffix.

How to read a test: in Search Console, filter Page = the exact URL, set a date range
covering both sides of the change, export, then

```bash
python3 -I ~/.claude/skills/seo-title-testing/scripts/gsc_compare.py <export.zip> --changed YYYY-MM-DD
```

`--changed` is the day Google picked the new title up, not the day it was deployed.
The script skips 3 settle days after it, and Search Console lags about 2 days, so a
14-day read is possible about 19 days after `--changed`, a 28-day read about 33.

## In flight

These three changes went out in two commits, before this log existed:
`6f96f1c` (31 October, live on Railway about 06:10 UTC) and `fad8723` (2 November,
live about 17:20 UTC, deployed together with the 3.6.0 release commits). They were
not clean title tests, because the same commits also changed other things:

- **Meta descriptions:** the Wayland guide's on 31 October and again on 2 November,
  the CopyQ post's on 31 October, and the explainer's on 2 November.
- **Content:**
  - the Wayland guide gained a niri section (31 October), and its answer table
    moved to the top (2 November);
  - the CopyQ post was brought up to CopyQ 17.0.0 and gained a CopyQ-on-Wayland
    section (2 November);
  - the explainer gained a wl-copy/wl-paste section (2 November).
- **Internal links:** curated "Keep reading" lists and links from the hubs
  (2 November).

Read them anyway, but credit any change to "snippet + content", not to the title
alone.

**Google had not picked up the 2 November titles by 9 November.** A signed-out
search that day still showed the earlier titles (details under each entry). Those
titles appear nowhere on the live site, so this is a stale crawl, not Google
rewriting the title. Each test therefore starts when Google recrawls the page,
not on 2 November. Before reading a test, open URL Inspection for the page,
request indexing, and note its "Last crawl" date. Use that date as `--changed`,
and work out the read dates from it.

The baselines below are three-month totals from the 31 October export (29 July to 28
October), there for scale. The real before/after numbers come from `gsc_compare.py`
on a page-filtered export, which builds its own equal windows. Queries in a
site-wide export are not tied to a page, so the queries below are matched to pages
by topic.

### `/blog/best-clipboard-manager-wayland`: compositor names in the title, deployed 2 November 2026

- **Why this page:** position 8.6, 3,600 impressions, CTR 0.72% against a ~1.8%
  benchmark for that position. The site's biggest loss: about 39 clicks over the
  quarter. Its main query, `wayland clipboard manager`, had 124 impressions,
  2 clicks (1.6%) and position 7.2. `best clipboard manager wayland` does not
  appear in the export.
- **What Google showed (9 November, signed out):**
  - `wayland clipboard manager`: position 7 (5 on 3 November). The result's title
    was "Best Wayland Clipboard Manager for Each Compositor", the 31 October
    title, with no site name. That is neither the live title nor the H1.
  - `best clipboard manager wayland`: this page was not in the first ~28 results
    (4th on 3 November). Only `/blog/clipboard-manager-auto-paste-wayland` showed,
    at about 26.
  - `wayland clipboard`: no Clipmer page in the first ~28 results.
  - One spot check is noisy, so confirm the drop in Search Console before acting
    on it.
- **Titles:**
  1. "Best Clipboard Manager for Wayland" (the original title).
  2. 31 October (`6f96f1c`): "Best Wayland Clipboard Manager for Each Compositor".
  3. 2 November (`fad8723`): "Wayland Clipboard Manager: GNOME, KDE, Hyprland,
     niri". This is 63 characters with the suffix, exactly at the limit.
- **H1:** "The best clipboard manager for Wayland depends on your compositor".
  Unchanged since the page was published, so it no longer matches the title.
  Google was not showing it on 9 November. Check again once the new title is
  showing.
- **Read:**
  - The title changed twice, so end the baseline before the first change:
    `--changed <last crawl> --before-end 2026-10-30`.
  - If the last crawl turns out to be 2 November, the 14-day read is possible
    from 21 November and the 28-day read from 5 December. A later crawl moves
    both dates by the same number of days.
- **Result:**

### `/blog/clipboard-managers-on-wayland`: "wayland clipboard" as the lead phrase, deployed 2 November 2026

- **Why this page:** position 8.0, 304 impressions, CTR 0.33% (~2.0% benchmark).
  The query it is meant to win, `wayland clipboard`, had 162 impressions at
  position 8.6 and 0 clicks. The original title did not lead with that phrase.
- **What Google showed (9 November, signed out):** this page did not appear in
  the first ~28 results for `wayland clipboard` or `wayland clipboard manager`,
  so its displayed title was not seen.
- **Titles:**
  1. "Wayland Clipboard History: Why It's Hard" (the original title).
  2. 31 October (`6f96f1c`): "Wayland Clipboard: Why Clipboard Managers Break".
  3. 2 November (`fad8723`): "Wayland Clipboard: How It Works, Why Managers
     Break".
- **H1:** "Clipboard managers on Wayland: why it's hard and what actually works".
  Unchanged; it differs from the title.
- **Read:** this is a quiet page, so use 4 weeks.
  `--changed <last crawl> --before-end 2026-10-30`. If the last crawl turns out
  to be 2 November, the read is possible from 5 December.
- **Result:**

### `/blog/copyq-alternatives`: CopyQ-on-Wayland angle, deployed 2 November 2026

- **Why this page:** position 11.4, just outside the 3-10 range the method
  targets, 1,068 impressions, CTR 1.31%. The largest CopyQ query in the export is
  `copyq wayland` (35 impressions, position 9.9, 0 clicks). The old title did not
  mention it.
- **What Google showed (9 November, signed out):**
  - `copyq wayland`: position 7 (8 counting a Reddit result), with the title
    "CopyQ Alternatives on Linux, Compared - Clipmer". That is the title from
    before 2 November.
  - `copyq alternatives`: this page was not in the first ~28 results (4th on
    3 November).
- **Titles:** "CopyQ Alternatives on Linux, Compared" → (2 November, `fad8723`)
  "CopyQ Alternatives on Linux (and CopyQ on Wayland)".
- **H1:** "CopyQ alternatives on Linux, compared honestly". Unchanged; it does not
  mention Wayland.
- **Read:**
  - The meta description changed on 31 October, so end the baseline before that:
    `--changed <last crawl> --before-end 2026-10-30`.
  - If the last crawl turns out to be 2 November, the read is possible from
    5 December.
  - If the page's position moves by more than a point, the script warns that the
    comparison isn't fair, and the result goes down as "no read".
- **Result:**

## Candidates

- **31 October export:** `gsc_ctr.py` flags only the Wayland guide and the
  explainer, and both are already in flight. The closest misses are not tests yet:
  - `/blog/clipboard-history-ubuntu`: CTR 1.80% at position 7.5, about 20% under
    the benchmark.
  - Its query `ubuntu clipboard history`: 1.22% at position 8.4, about 34% under.
  - The threshold is 40% under.

## Rules for new entries

- Use `~/.claude/skills/seo-title-testing/templates/test-entry.md`.
- Log the entry before the deploy, request indexing in URL Inspection after it.
- Use the "Last crawl" date from URL Inspection as `--changed`, not the deploy date.
- Don't touch a page under test until its read date.
