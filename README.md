# krm-demo-org-site

Sources of https://krm-demo.org.

> **⚠️ This repository is wired to publish automatically. Read this before pushing.**
>
> | You do | What happens | Where |
> |---|---|---|
> | push to `main` | **preview** is rebuilt (~1 min) | https://krm-demo.github.io/krm-demo-org-site/ |
> | push a tag `v*` (e.g. `v1.2.0`) | **AWS S3** (krm-demo.org) is updated (~2 min) | https://krm-demo.org |
>
> Nothing reaches krm-demo.org without a `v*` tag.

## Layout

- `site/` — the hand-written pages and assets: `index.html`, `error.html`, `site.css` (layout and the skins), `site.js` (skin switcher),
  `build-site-info.js` (footer), `home.js` (category chips and search on the home page). No CSS framework is used.
- Home page sections: **Current Exhibition** (new or featured), **The Collection** (everything, with a search box),
  **Guestbook** (placeholder). The first two are generated from the profiles below by `scripts/build-home.py`.
- `docs/*.md` — the articles. Each one also needs a profile `docs/<name>.json` (see "Article profiles"). The build turns each one into a page; the pages are not committed.
  - Translations are named `<name>.<lang>.md` (`chebyshev.en.md`, `chebyshev.ru.md`); each page links to the others.
  - A heading that starts with a number gets the same id in every language (`## 3. …` → `s3`, `### 1.4 …` → `s1-4`).
    Link to it as `[§1.4](chebyshev.en.md#s1-4)`: on the site that opens the section, on GitHub the file.
  - Math in `$...$` / `$$...$$` is rendered with KaTeX during the build; a formula that does not parse fails the build.
  - Proofs and long listings go in `<details markdown="1"><summary>Proof</summary> … </details>`; code blocks are highlighted.
  - `docs/figures/*.svg` are drawn by `scripts/make-figures.py` (needs NumPy and SciPy; run by hand, results committed).
  - The full list of what an article may contain is at the top of `scripts/md-to-html.py`.
- `scripts/build.sh <target>` — the build used by both workflows: copies `site/` to `dist/`, generates the article pages,
  copies KaTeX's stylesheet and fonts to `dist/vendor/katex/`, and writes `dist/build-site.json`.
- `scripts/build-home.py` — fills the home page (`<!-- build-home:… -->` markers in `site/index.html`) from the profiles
  and writes `dist/catalog.json` with all of them.
- `site/fonts/` — JetBrains Mono (SIL Open Font License, `JetBrainsMono-OFL.txt`), extra bold and medium italic, cut down
  to basic Latin (~11 KB each), for the wordmark `[(krm-demo)]` in the header. Its colours are `--wordmark-name` and
  `--wordmark-bracket` in each skin of `site.css`.
- `site/icons/`, `site/favicon.ico`, `site/manifest.json` — the site icon `[(-)]` in every skin and size (the size is in each file name).
  Drawn by `scripts/make-favicons.py` (needs `rsvg-convert` and ImageMagick; run by hand, results committed).
  `site.js` swaps the tab icon, the touch icon and `theme-color` (the phone's address bar) when the skin changes.
- Cookies (all for a year, no tracking): `skin`, `lang` (en / ru; without it, the browser's language) and `cats-off`
  (the category chips switched off, so a new category shows up switched on).
- Language: the EN / RU switch in the header. The home page (`<html data-i18n>`) switches in place: Russian texts sit
  in `data-ru-text` / `data-ru-placeholder` / `data-ru-label` attributes (written by hand in `index.html`, generated from
  the profiles by `build-home.py`); articles only in English stay English. On an article the switch opens the
  translation, or is greyed out when there is none. The footer (`build-site-info.js`) speaks both languages.
- `scripts/install-build-deps.sh` — installs what the build needs (Python: `markdown`, `pygments`; Node: `katex`). Run it once before a local build.
- `site/build-site-info.js` also shares its date wording as `window.krmTime` (`relative`, `natural`); `home.js` uses it for the
  "3 hours ago" under the category and date of each entry in Something New.
- `site/visit-badge.js` — the "Opened this week: N" line on article pages. It reads `stats.json`, which is **not** built here:
  an hourly function in AWS writes it into the site bucket from the CloudFront access logs.
- `infra/visit-counter.yaml` — the CloudFormation template for that counter (log bucket, log delivery, function, schedule).
  Deployed as stack `krm-demo-org-visit-counter` in `us-east-1`. To update it after editing the template:
  `aws cloudformation deploy --region us-east-1 --stack-name krm-demo-org-visit-counter --template-file infra/visit-counter.yaml --capabilities CAPABILITY_IAM`
- `site/projects/<name>/` — scripts, styles and pictures of an interactive project page `site/<name>.<lang>.html` (hand-written, listed through
  its profile `docs/<name>.json` like an article). None at the moment: "Balances Equilibrium" (cash sweep math) moved to the GitHub Pages of
  krm-demo/ai-plans-instr (`plans-math/`); its profile `docs/swept-amount-math.json` only links there (`"link"`, with
  `"linkLabel"` for the badge), and `site/swept-amount-math*.html` redirect to it.
- `drafts/` — material being prepared; not part of the site.
- `.github/workflows/pages.yml` — preview: every push to `main` → GitHub Pages.
- `.github/workflows/release-aws-s3.yml` — release: every `v*` tag → AWS S3 bucket `krm-demo.org`, then clears the CloudFront cache.
- `.github/workflows/check-site.yml` — manual check of HTTPS, redirects and pages through CloudFront (Actions → Run workflow).

## Build info in the footer

Every build writes `build-site.json` (build number, tag/branch, commit, workflow run, time, target).
`site/build-site-info.js` reads it and fills `<span id="build-info"></span>` in the footer, e.g.
The version is written by `scripts/build.sh`: for a release, the tag plus the run number of the release workflow; for the preview, the latest `v*` tag marked `-preview.` plus the run number of the preview workflow. The two workflows count their runs separately.

- krm-demo.org (`aws-s3`): `<GitHub mark> v0.3.0.3 · published 2026-Nov-18 (Wed) 01:20 EST, 3 minutes ago` (release run #3 of tag v0.3.0).
- Preview (`gh-pages`): `<GitHub mark> v0.3.0-preview.47 · gh-pages · published …` (preview run #47, latest tag v0.3.0).
- Links: the GitHub mark → the sources (the tag, or `main`); the version → the workflow run that built it.
- The commit hash is not shown; it stays in `build-site.json` with everything else.

Hover the time for the exact UTC time.

- The time is in the visitor's time zone, in the "natural" format of `krm-demo/core-utils` (`yyyy-MM-dd (EEE) HH:mm`).
- "How long ago" follows the calendar: `42 seconds ago`, `12 minutes ago`, `3 hours ago`, `yesterday`, `day before yesterday`,
  `this Thursday`, `last Wednesday`, `two weeks ago`, `last month`, `4 months ago`, `last year`, `3 years ago`.
- The line never wraps. It has six variants, from the full line down to `v0.2.0 · yesterday`. The longest one that fits the width is shown, and the choice is re-checked when the width changes.

While the page stays open it re-checks `build-site.json` about every minute (60–70 s, jittered) and adds "new version published — reload" (shortened to `↻` on narrow screens), plus a small notice in the corner of the window.
It doesn't poll while the tab is hidden, and checks at once when the tab becomes visible again.
The release uploads `build-site.json` with `Cache-Control: max-age=10` (other files: 300 s), so CloudFront never hides a new version for long.
Served locally without a build, it shows "Local preview (no build info)".

To get it on another page: add the span and `<script src="build-site-info.js"></script>`
(relative path — so not on the error page, which is served from arbitrary URLs).

## Skins

The switch in the header chooses the look: Light, Dark, Scientific or Pulp. The choice is stored in the cookie `skin` for a year;
without it the page follows the system's light or dark setting. A skin is one block of CSS variables in `site/site.css`
(`html[data-skin="…"]`); to add one, add a block, a swatch rule next to the others, and its name in `site/site.js`.

## Everyday workflow

```bash
# 0. Try it locally (no commit needed)
scripts/install-build-deps.sh              # once: Python and Node packages for the article pages
scripts/build.sh local && python3 -m http.server -d dist 8000     # open http://localhost:8000

# 1. Preview: commit and push to main, then check the GitHub Pages URL
git commit -am "Rework header"
git push

# 2. Release: tag the commit you are happy with and push the tag
git tag v1.1.0
git push origin v1.1.0
```

Or, where only commits can be pushed (a phone, a cloud session): write the new version into the file `RELEASE`
and push to `main`. The workflow `release-request.yml` tags that commit, and the tag starts the release as usual.
It needs the repository secret `RELEASE_TAG_TOKEN`, a personal access token with **Contents: read and write**
(a tag pushed with the built-in `GITHUB_TOKEN` would not start the release workflow). It never moves an existing tag.

```bash
echo v1.1.0 > RELEASE && git commit -am "Release v1.1.0" && git push
```

Progress and logs of both: the repo's **Actions** tab.

### Rolling back

Re-release an older tag: **Actions → Release to AWS S3 (krm-demo.org) → Run workflow**, pick the old tag in
"Use workflow from". Or tag the old commit with a new version (`git tag v1.1.1 <old-sha> && git push origin v1.1.1`).

### Tag notes

- Use a **new** tag for every release (`v1.0.0`, `v1.0.1`, ...). The workflow listens to the pattern `v*`,
  so no fixed tag name is needed, and every release stays visible in the tag list.
- Moving an existing tag (`git tag -f v1.0.0 <sha> && git push -f origin v1.0.0`) also triggers a release,
  but loses the history of what was live when. Prefer a new tag.
- A tag can point to a commit on any branch, not only `main`.

## Things to keep in mind

- **Deletes are mirrored.** The S3 sync uses `--delete`: a file removed from `site/` disappears from krm-demo.org at the next release.
- **Use relative links** (`css/style.css`, not `/css/style.css`). The preview lives under `/krm-demo-org-site/`,
  so root-relative links work on krm-demo.org but break on the preview.
- **Error pages:** S3 serves `error.html`; GitHub Pages only knows `404.html`, so `pages.yml` copies `error.html` to `404.html`.
- **Caching:** the release clears CloudFront's cache, so a release is live as soon as the workflow is green. Browsers may keep
  their own copy up to 5 minutes (`max-age=300`) — a hard refresh helps.
- **HTTPS everywhere:** `http://` redirects to `https://`, and `www.krm-demo.org` redirects to `krm-demo.org`.

## How it is configured (outside this repo)

These settings are not visible in the code — if something stops working, check them.

**GitHub**
- Settings → Pages → Source = **GitHub Actions** (no `gh-pages` branch is used).

**AWS (account 560574854768)**
```
browser ──https──▶ CloudFront E3QPJMC44SZLZV ──http──▶ S3 website bucket krm-demo.org
           (cert from ACM, www→apex redirect)          (index.html / error.html)
```
- S3 bucket `krm-demo.org` (us-west-2): static website hosting, index `index.html`, error `error.html`, public-read bucket policy.
  It is the **origin** for CloudFront; its own address `http://krm-demo.org.s3-website-us-west-2.amazonaws.com` still works.
- CloudFront distribution `E3QPJMC44SZLZV` (`d32q0v8m1f1zsx.cloudfront.net`): aliases `krm-demo.org`, `www.krm-demo.org`;
  viewer HTTP → HTTPS redirect; cache policy *CachingOptimized* (respects the files' `max-age`); price class 100 (NA + EU edges).
- CloudFront function `krm-demo-org-www-redirect` (viewer request): 301 from `www.krm-demo.org/...` to `https://krm-demo.org/...`.
- ACM certificate (must be in **us-east-1** for CloudFront) for `krm-demo.org` + `www.krm-demo.org`, validated by DNS;
  the two `_….krm-demo.org` CNAME records in Route 53 keep it auto-renewing — **do not delete them**.
- Route 53 zone `krm-demo.org`: A + AAAA alias records for `krm-demo.org` and `www.krm-demo.org` → the CloudFront distribution.
  (Before HTTPS, the apex A alias pointed at `s3-website-us-west-2.amazonaws.com` — setting it back is the emergency rollback.)
- IAM OIDC provider `token.actions.githubusercontent.com` (audience `sts.amazonaws.com`) — lets GitHub Actions log in to AWS without stored keys.
- IAM role `krm-demo-org-site-deploy`:
  - trust: only `repo:krm-demo@149853618/krm-demo-org-site@1460801082:ref:refs/tags/v*`
    (GitHub puts the owner and repo **numeric IDs** into this claim; renaming or recreating the repo changes it and breaks the release)
  - permissions (inline policy `deploy-to-krm-demo-org-bucket`): `s3:ListBucket` on the bucket, `s3:PutObject` / `s3:DeleteObject` on its objects,
    `cloudfront:CreateInvalidation` / `cloudfront:GetInvalidation` on distribution `E3QPJMC44SZLZV`. Nothing else.
- If the release fails at **Configure AWS credentials**: CloudTrail (us-west-2) → event `AssumeRoleWithWebIdentity` shows the exact subject GitHub sent; compare it with the role's trust policy.

## Who visits: where to look

- **On the site:** the "Opened this week" line on each article and the counts in The Collection, from
  [`stats.json`](https://krm-demo.org/stats.json) (rewritten every hour). These skip anything that calls itself a robot,
  but not robots in disguise — see the article [Who drops by while nobody's home?](docs/visitors.en.md).
- **CloudFront reports** (AWS login; last 60 days; times in UTC; robots included):
  [CloudFront console](https://console.aws.amazon.com/cloudfront/v4/home) → *Reports & analytics* →
  **Popular objects** (top 50 files with hits, misses, errors), **Top referrers** (sites that link here),
  **Viewers** (devices, browsers, OS, countries), **Usage**, **Cache statistics**.
  How each report is counted: [View CloudFront reports in the console](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/reports.html).
- **CloudWatch metrics** (requests, bytes, error rates, near real time): CloudFront console → *Telemetry* / *Monitoring* → distribution `E3QPJMC44SZLZV`.
- **Raw request logs:** S3 bucket [`krm-demo-org-cf-logs-560574854768`](https://s3.console.aws.amazon.com/s3/buckets/krm-demo-org-cf-logs-560574854768)
  (us-east-1), `AWSLogs/…/CloudFront/*.gz`, one JSON line per request, nine fields, no IP address, kept 90 days.
  Field meanings: [Standard logging reference](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/standard-logs-reference.html).

## Article profiles

Every article or project has one profile, `docs/<id>.json`, next to its Markdown (one profile per article, shared by its translations).
Projects have a profile and a `link` instead of Markdown. A bad profile stops the build.

```json
{
  "id": "fft",                       // = file name; the pages are fft.<lang>.html (or fft.html with one language)
  "kind": "article",                 // article | project
  "category": "math",                // one of docs/categories.json
  "languages": ["en", "ru"],
  "link": "https://…",               // projects only: where the entry opens
  "linkLabel": "GitHub Pages",       // the badge of a linked entry (default "GitHub")
  "featured": true,                  // optional: keep in Current Exhibition however old
  "title": { "en": { "full": "…", "medium": "…", "short": "…" }, "ru": { … } },
  "summary": { "en": "…", "ru": "…" },
  "icon": { "large": "icons/fft.svg", "small": "icons/fft.svg" },   // SVG in docs/icons/, stroke="currentColor"
  "createdAt": "2026-11-18T15:43:15-05:00",
  "updatedAt": "2026-11-18T17:37:16-05:00",
  "stats": { "lastSeenAt": null, "visitors": null, "uniqueVisitors": null }
}
```

- `title.full` is shown in Current Exhibition, `title.medium` in The Collection; `short` is for tight places (tabs, chips).
- `icon.large` is drawn about 120×68, `icon.small` about 56×32; both may point to the same file until a simpler small drawing is worth making.
- Current Exhibition = `featured` plus everything updated in the last 45 days, newest first, at most 4 (constants in `scripts/build-home.py`).
- Publish dates: each article page shows, in small type under the navigation, when it first reached the preview and krm-demo.org (first commit of its files, first `v*` tag containing it; `scripts/publish_dates.py`); The Collection shows the same dates per entry. Both builds therefore check out the full history with tags.
- `docs/categories.json` lists the category chips in order; each has `title.en`/`title.ru` and an `icon` (not used yet).
  Chips for empty categories are shown greyed out. The square button in the top right corner (Bootstrap Icons "check-all", MIT) switches all of them; the chips flow around it.
- `stats` is reserved. The live numbers are in `stats.json` (hourly, from the CloudFront logs) and are not committed:
  writing counters into git every hour would fill the history with noise and rebuild the preview each time.
  The Collection shows `total` from `stats.json` where it exists. `lastSeenAt` and `uniqueVisitors` need a change to the
  counter function (and, for unique visitors, a field in the logs that tells visitors apart), so they stay `null` for now.
