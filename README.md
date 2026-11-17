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

- `site/` — the pages that get published. Only files under `site/` are deployed.
- `scripts/build.sh <target>` — the build used by both workflows: copies `site/` to `dist/` and writes `dist/build.json`.
- `.github/workflows/pages.yml` — preview: every push to `main` → GitHub Pages.
- `.github/workflows/release-aws-s3.yml` — release: every `v*` tag → AWS S3 bucket `krm-demo.org`, then clears the CloudFront cache.
- `.github/workflows/check-site.yml` — manual check of HTTPS, redirects and pages through CloudFront (Actions → Run workflow).

## Build info in the footer

Every build writes `build.json` (build number, tag/branch, commit, workflow run, time, target).
`site/build-info.js` reads it and fills `<span id="build-info"></span>` in the footer, e.g.
`Build #7 · v0.2.0 · a10737a · aws-s3 · deployed 3 minutes ago`. Links: build number and "deployed … ago" → the workflow run; tag/branch → the repo at that tag; hash → the commit. Hover the time for the exact date.
While the page stays open it re-checks `build.json` every minute and shows "new version deployed — reload".
Served locally without a build, it shows "Local preview (no build info)".

To get it on another page: add the span and `<script src="build-info.js"></script>`
(relative path — so not on the error page, which is served from arbitrary URLs).

## Everyday workflow

```bash
# 0. Try it locally (no commit needed)
python3 -m http.server -d site 8000        # open http://localhost:8000
# or with build info:  scripts/build.sh local && python3 -m http.server -d dist 8000

# 1. Preview: commit and push to main, then check the GitHub Pages URL
git commit -am "Rework header"
git push

# 2. Release: tag the commit you are happy with and push the tag
git tag v1.1.0
git push origin v1.1.0
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
