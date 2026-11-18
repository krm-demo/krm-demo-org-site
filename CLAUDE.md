# Notes for Claude Code

Read `README.md` first: it explains the publishing setup (main → GitHub Pages preview, `v*` tags → AWS S3 / krm-demo.org).

- Hand-written pages and assets are under `site/`; articles are Markdown under `docs/` and become pages during the build (never commit generated pages). `dist/` is build output (git-ignored). Build locally with `scripts/install-build-deps.sh` (once) and `scripts/build.sh local`.
- Articles: keep every language version (`<name>.en.md`, `<name>.ru.md`) in step, same sections and same formulas; run listings before quoting their output; end with a short reference list.
- Pushing to `main` updates the public preview. Pushing a `v*` tag updates the live site krm-demo.org — **ask the owner before creating or pushing any tag.**
- AWS (account 560574854768, profile from the owner's `aws` CLI): read-only commands are fine; ask before changing IAM, S3 bucket settings, CloudFront, ACM or Route 53.
- krm-demo.org is served over HTTPS by CloudFront `E3QPJMC44SZLZV` in front of the S3 bucket; see README "How it is configured". Never delete the ACM validation CNAME records in Route 53.
- Use relative links in pages (the preview lives under `/krm-demo-org-site/`).
- Commit messages: short imperative subject.
