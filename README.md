# krm-demo-org-site

Sources of http://krm-demo.org.

## Layout

- `site/` — the pages that get published (`index.html`, `error.html`, and anything added later).
- `.github/workflows/deploy.yml` — builds and publishes the site.

## How publishing works

Every push to `main` (or a manual run from the Actions tab) runs the **Deploy krm-demo.org** workflow:

1. **Build** — copies `site/` to `dist/` (placeholder for a future static site generator).
2. **Authenticate** — gets short-lived AWS credentials through GitHub OIDC by assuming the IAM role `krm-demo-org-site-deploy`. No AWS keys are stored in GitHub.
3. **Sync** — `aws s3 sync dist/ s3://krm-demo.org --delete`. The bucket `krm-demo.org` (us-west-2) is an S3 static website; Route 53 points `krm-demo.org` at it.
4. **Smoke test** — fetches the live home page and checks it matches the build.

`--delete` means the bucket mirrors `dist/` exactly: a file removed from `site/` is removed from the live site.
