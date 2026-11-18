#!/usr/bin/env bash
# Installs what scripts/build.sh needs to turn docs/*.md into pages:
#   Python: markdown (Markdown -> HTML), pygments (code highlighting)
#   Node:   katex (formulas rendered at build time; also the source of the stylesheet and fonts)
# Both workflows run this before the build. Run it once on your own machine before "scripts/build.sh local".
set -euo pipefail
cd "$(dirname "$0")/.."

python3 -m pip install --quiet "markdown>=3.6" pygments
# Installed into ./node_modules (git-ignored); no package.json is kept in the repository.
npm install --no-save --no-package-lock --no-audit --no-fund --silent katex@0.16.47
