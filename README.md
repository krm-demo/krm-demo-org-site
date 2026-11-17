# krm-demo-org-site

Sources of http://krm-demo.org.

> **⚠️ This repository is wired to publish automatically. Read this before pushing.**
>
> | You do | What happens | Where |
> |---|---|---|
> | push to `main` | **preview** is rebuilt (~1 min) | https://krm-demo.github.io/krm-demo-org-site/ |
> | push a tag `v*` (e.g. `v1.2.0`) | **AWS S3** (krm-demo.org) is updated (~1 min) | http://krm-demo.org |
>
> Nothing reaches krm-demo.org without a `v*` tag.

## Layout

- `site/` — the pages that get published. Only files under `site/` are deployed.
- `.github/workflows/pages.yml` — preview: every push to `main` → GitHub Pages.
- `.github/workflows/release-aws-s3.yml` — release: every `v*` tag → AWS S3 bucket `krm-demo.org`.

## Everyday workflow

```bash
# 0. Try it locally (no commit needed)
python3 -m http.server -d site 8000        # open http://localhost:8000

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
- **Caching:** files are uploaded with `max-age=300`; a change can take up to 5 minutes to show in a browser (hard refresh helps).
- **HTTP only:** krm-demo.org has no CloudFront/HTTPS yet; `https://krm-demo.org` does not work.

## How it is configured (outside this repo)

These settings are not visible in the code — if something stops working, check them.

**GitHub**
- Settings → Pages → Source = **GitHub Actions** (no `gh-pages` branch is used).

**AWS (account 560574854768)**
- S3 bucket `krm-demo.org` (us-west-2): static website hosting, index `index.html`, error `error.html`, public-read bucket policy.
- Route 53 zone `krm-demo.org`: A record (alias) → `s3-website-us-west-2.amazonaws.com`.
- IAM OIDC provider `token.actions.githubusercontent.com` (audience `sts.amazonaws.com`) — lets GitHub Actions log in to AWS without stored keys.
- IAM role `krm-demo-org-site-deploy`:
  - trust: only `repo:krm-demo@149853618/krm-demo-org-site@1460801082:ref:refs/tags/v*`
    (GitHub puts the owner and repo **numeric IDs** into this claim; renaming or recreating the repo changes it and breaks the release)
  - permissions (inline policy `deploy-to-krm-demo-org-bucket`): `s3:ListBucket` on the bucket, `s3:PutObject` / `s3:DeleteObject` on its objects. Nothing else.
- If the release fails at **Configure AWS credentials**: CloudTrail (us-west-2) → event `AssumeRoleWithWebIdentity` shows the exact subject GitHub sent; compare it with the role's trust policy.
