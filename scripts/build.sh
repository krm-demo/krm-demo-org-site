#!/usr/bin/env bash
# Builds the site into dist/ and stamps it with build information.
#
#   usage: scripts/build.sh <target>      target = gh-pages | aws-s3 | local
#
# Used by both workflows so the preview and the release are built the same way.
# Outside GitHub Actions the GITHUB_* variables are missing and "local" values are written instead.
set -euo pipefail

TARGET="${1:-local}"
cd "$(dirname "$0")/.."

rm -rf dist
cp -R site dist

# Version shown in the footer: the release tag (or, on a branch, the latest v* tag before it)
# plus the workflow run number, e.g. v0.3.0.3 for release run #3 or v0.3.0.47 for preview run #47.
REF="${GITHUB_REF_NAME:-$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo unknown)}"
if [[ "$REF" =~ ^v[0-9] ]]; then
  BASE_VERSION="$REF"
else
  # needs the tags in the checkout (pages.yml checks out with fetch-depth: 0)
  BASE_VERSION="$(git describe --tags --match 'v[0-9]*' --abbrev=0 2>/dev/null || echo v0.0.0)"
fi
if [ -n "${GITHUB_RUN_NUMBER:-}" ]; then
  VERSION="$BASE_VERSION.$GITHUB_RUN_NUMBER"
else
  VERSION="$BASE_VERSION-local"
fi

# Build information read by site/build-site-info.js and shown in the page footer.
jq -n \
  --arg version     "$VERSION" \
  --arg target      "$TARGET" \
  --arg repo        "${GITHUB_REPOSITORY:-}" \
  --arg ref         "$REF" \
  --arg sha         "${GITHUB_SHA:-$(git rev-parse HEAD 2>/dev/null || echo unknown)}" \
  --arg workflow    "${GITHUB_WORKFLOW:-}" \
  --arg run_id      "${GITHUB_RUN_ID:-}" \
  --arg run_number  "${GITHUB_RUN_NUMBER:-}" \
  --arg run_attempt "${GITHUB_RUN_ATTEMPT:-}" \
  --arg built_at    "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  '{version:$version, target:$target, repo:$repo, ref:$ref, sha:$sha, workflow:$workflow,
    run_id:$run_id, run_number:$run_number, run_attempt:$run_attempt, built_at:$built_at}' \
  > dist/build-site.json

# GitHub Pages only uses a custom error page named 404.html (S3 is configured to use error.html).
if [ "$TARGET" = "gh-pages" ] && [ -f dist/error.html ]; then
  cp dist/error.html dist/404.html
fi

echo "Built dist/ for target '$TARGET':"
cat dist/build-site.json
ls -la dist
