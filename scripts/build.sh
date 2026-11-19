#!/usr/bin/env bash
# Builds the site into dist/ and stamps it with build information.
#
#   usage: scripts/build.sh <target>      target = gh-pages | aws-s3 | local
#
# Used by both workflows so the preview and the release are built the same way.
# Outside GitHub Actions the GITHUB_* variables are missing and "local" values are written instead.
# Needs the packages installed by scripts/install-build-deps.sh.
set -euo pipefail

TARGET="${1:-local}"
cd "$(dirname "$0")/.."

rm -rf dist
cp -R site dist

# Articles: every docs/*.md becomes dist/<same name>.html (see scripts/md-to-html.py).
# Formulas are rendered here with KaTeX, so the pages need only its stylesheet and fonts, copied from the package.
KATEX_DIR="$(node -e "console.log(require('path').dirname(require.resolve('katex/package.json')))" 2>/dev/null || true)"
if [ -n "$KATEX_DIR" ]; then
  mkdir -p dist/vendor/katex/fonts
  cp "$KATEX_DIR/dist/katex.min.css" dist/vendor/katex/
  cp "$KATEX_DIR"/dist/fonts/*.woff2 dist/vendor/katex/fonts/
fi
for md in docs/*.md; do
  scripts/md-to-html.py "$md" "dist/$(basename "${md%.md}").html"
done

# Home page: category chips, Current Exhibition and The Collection, from the profiles docs/<id>.json.
scripts/build-home.py dist

# Version shown in the footer.
#   release (a v* tag):  the tag plus the run number of the release workflow, e.g. v0.3.0.3
#   preview (a branch):  the latest v* tag before it, marked as a preview build,  e.g. v0.3.0-preview.47
# The two workflows count their runs separately, so the suffix says which counter the number comes from.
REF="${GITHUB_REF_NAME:-$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo unknown)}"
if [[ "$REF" =~ ^v[0-9] ]]; then
  VERSION="$REF.${GITHUB_RUN_NUMBER:-0}"
else
  # needs the tags in the checkout (pages.yml checks out with fetch-depth: 0)
  BASE_VERSION="$(git describe --tags --match 'v[0-9]*' --abbrev=0 2>/dev/null || echo v0.0.0)"
  if [ -n "${GITHUB_RUN_NUMBER:-}" ]; then
    VERSION="$BASE_VERSION-preview.$GITHUB_RUN_NUMBER"
  else
    VERSION="$BASE_VERSION-local"
  fi
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
# The preview lives under /<repository name>/, so the error page's link to the home page is pointed there.
if [ "$TARGET" = "gh-pages" ] && [ -f dist/error.html ]; then
  BASE_PATH="/${GITHUB_REPOSITORY#*/}/"
  sed "s#href=\"/\"#href=\"${BASE_PATH}\"#" dist/error.html > dist/404.html
fi

echo "Built dist/ for target '$TARGET':"
cat dist/build-site.json
ls -la dist
