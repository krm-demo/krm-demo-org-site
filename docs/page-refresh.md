# How krm-demo.org notices a new version — and how it could get faster

*As of 2026-11-17. Production behaves as described here from release v0.3.0 on.*

Both environments are plain static files. An open page learns about a new build by polling a small JSON file, so a visitor sees a new version within about a minute or two, with no backend to run. For content that changes every few minutes or hours, that is enough. Push (SSE, WebSockets) only pays off for live, dashboard-like pages.

## Production and staging at a glance

|  | Production — [krm-demo.org](https://krm-demo.org/) | Staging — [GitHub Pages preview](https://krm-demo.github.io/krm-demo-org-site/) |
| --- | --- | --- |
| Published by | Pushing a `v*` tag → workflow `release-aws-s3.yml` | Pushing to `main` → workflow `pages.yml` |
| How it goes live | S3 sync, then CloudFront invalidation of `/*`; the workflow waits until it completes | GitHub Pages deploy, about 25 s per run |
| Caching | Pages: `max-age=300`; `build-site.json`: `max-age=10` | Fixed `max-age=600` on every file, no custom headers possible ([GitHub Support](https://backiee.wasmer.app/http_webapps_stackexchange_com/posts/119294/revisions)) |
| Footer shows | GitHub mark, version (tag + run number), publish time | The same, plus `gh-pages` |
| New-build check | `build-site.json` every 60–70 s, paused while the tab is hidden | Same |
| Delay an open page sees | Up to ~80 s after the release finishes (poll + 10 s edge cache) | Up to ~70 s after the deploy finishes |

The page always asks for `build-site.json` with `cache: 'no-store'`, so the browser never answers from its own cache. On staging that is enough, because a new deploy replaces what the GitHub Pages servers hand out. On production, CloudFront may keep a copy for 10 seconds.

## The footer

The footer is filled by `build-site-info.js` from `build-site.json`, which every build writes (build number, tag or branch, commit, workflow run, time, target).

- **Version** = release tag (on `main`: the latest `v*` tag before it) + workflow run number: `v0.3.0.3` in production, `v0.3.0.47` on the preview. It links to the workflow run that built it; the GitHub mark before it links to the sources (the tag, or `main`).
- **Production:** `v0.3.0.3 · published 2026-Nov-18 (Wed) 01:20 EST, 3 minutes ago`.
- **Staging:** `v0.3.0.47 · gh-pages · published 2026-Nov-18 (Wed) 01:20 EST, 3 minutes ago`.
- The commit hash is not shown; `build-site.json` keeps it with the rest of the build information.
- **Time** is in the visitor's time zone, in the format of `krm-demo/core-utils` (`yyyy-MM-dd (EEE) HH:mm`) but with a three-letter month: `2026-Nov-17 (Tue) 23:05`. The words around it ("published", "5 minutes ago") are dimmer and in italics. Hover it for the exact UTC time.
- **"How long ago"** follows the calendar: `42 seconds ago`, `12 minutes ago`, `3 hours ago`, `yesterday`, `day before yesterday`, `this Thursday`, `last Wednesday`, `two weeks ago`, `last month`, `4 months ago`, `last year`.
- **Never wraps:** six variants, from the full line down to `v0.3.0 · yesterday`. The longest one that fits is shown, and the choice is re-checked when the width changes.
- **Links** have no underline; they change colour on hover. Shared styles are in `site.css`.
- **New build:** when a newer build appears while the page is open, the footer adds "new version published — reload", shortened to `↻` on narrow screens.

## How it could get faster

Each step cuts the delay between a change and what a visitor sees. Steps 0–2 need nothing beyond S3 + CloudFront or GitHub Pages; steps 3–5 need a service that can push.

| Step | Kind of change | Behaviour of the web page | Comfort for the user | Amount of change and cost | Typical delay | On staging (GitHub Pages) |
| --- | --- | --- | --- | --- | --- | --- |
| 0. Today | Poll `build-site.json` every 60–70 s | Footer adds a reload link; the visitor clicks it | Fair: nothing changes until the visitor reloads | None | ~10–80 s | Same |
| 1. Silent content refresh | The Phase 2 generator writes a content version; the page swaps only the changed section (plain `fetch`, or htmx `hx-trigger="every 30s"`) | Updated section appears in place; scroll position kept; reload link only for code changes | Good: fresh without any action | Part of the Phase 2 generator plus a small script; CloudFront request charges, pennies at this traffic | ~15–60 s | Same; a good place to try the generator before a release |
| 2. Faster polling | Poll every 5–10 s with ETag, so unchanged answers are empty `304`s | As step 1, quicker | Good; feels near-live for slow-moving data | Config only; requests grow with visitors × frequency | ~5–20 s | Works; GitHub Pages has a soft bandwidth limit, so keep heavy polling for production |
| 3. Managed push signal | AWS AppSync Events (or Pusher, Ably): the workflow publishes "changed"; pages subscribe and refetch through CloudFront | Updates land about a second after publishing; no polling | Very good: feels live | New AWS service, auth, an IAM permission for the deploy role, ~50 lines of client code; pay per message and connection-minute | ~1 s | Works with a separate channel and its own credential (the AWS role trusts `v*` tags only) |
| 4. Own SSE stream | A server holds connections open and streams events (Lambda response streaming, or a small container) | As step 3; data can come in the event itself | Very good | Compute you run and pay for monthly; reconnects and missed events to handle | < 1 s | Not on Pages: the stream must come from another host |
| 5. Live dashboard | Two-way WebSockets with server-side state | Every value updates in place; visitors can also send actions | Best for trains, alerts, trading-style screens | Largest: stateful backend, scaling, monitoring; highest running cost | ~100 ms | Not on Pages; only the page itself can live there |

CloudFront itself never pushes; it makes steps 0–2 cheap by answering polls from the edge. A service worker (instant load from cache, update in the background) and Web Push (alerts while the tab is closed) can be added to any step.

## Recommended next steps

- With Phase 2 (pages generated from recent GitHub activity): step 1, ideally Thymeleaf-rendered fragments swapped by htmx.
- Only if near-instant updates become a requirement: step 3 (AppSync Events), which keeps the site serverless.
- Steps 4–5 are for a real-time product, not a content site.
