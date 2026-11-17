# Notes for Claude Code

Read `README.md` first: it explains the publishing setup (main → GitHub Pages preview, `v*` tags → AWS S3 / krm-demo.org).

- Edit pages under `site/` only; `dist/` is build output (git-ignored). Build locally with `scripts/build.sh local`.
- Pushing to `main` updates the public preview. Pushing a `v*` tag updates the live site krm-demo.org — **ask the owner before creating or pushing any tag.**
- AWS (account 560574854768, profile from the owner's `aws` CLI): read-only commands are fine; ask before changing IAM, S3 bucket settings, CloudFront, ACM or Route 53.
- krm-demo.org is served over HTTPS by CloudFront `E3QPJMC44SZLZV` in front of the S3 bucket; see README "How it is configured". Never delete the ACM validation CNAME records in Route 53.
- Use relative links in pages (the preview lives under `/krm-demo-org-site/`).
- Commit messages: short imperative subject.
