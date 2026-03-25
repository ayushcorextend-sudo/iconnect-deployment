#!/usr/bin/env bash
# upload-sourcemaps.sh — Upload Vite build sourcemaps to Sentry after production build.
#
# Usage:
#   SENTRY_ORG=your-org SENTRY_PROJECT=iconnect SENTRY_AUTH_TOKEN=xxx npm run build:prod
#
# Prerequisites:
#   npm install --save-dev @sentry/cli
#   Set SENTRY_AUTH_TOKEN, SENTRY_ORG, SENTRY_PROJECT env vars (or .sentryclirc)

set -euo pipefail

DIST_DIR="dist"
RELEASE="${VITE_APP_VERSION:-$(git rev-parse --short HEAD 2>/dev/null || echo 'dev')}"

if [ -z "${SENTRY_AUTH_TOKEN:-}" ]; then
  echo "[sourcemaps] SENTRY_AUTH_TOKEN not set — skipping sourcemap upload."
  exit 0
fi

echo "[sourcemaps] Uploading release: $RELEASE"

# Create release
npx @sentry/cli releases new "$RELEASE"

# Upload sourcemaps
npx @sentry/cli releases files "$RELEASE" upload-sourcemaps "$DIST_DIR/assets" \
  --url-prefix "~/assets" \
  --rewrite

# Finalize release
npx @sentry/cli releases finalize "$RELEASE"

# Associate with a deploy
npx @sentry/cli releases deploys "$RELEASE" new -e production

# Delete sourcemaps from dist so they aren't publicly served
find "$DIST_DIR/assets" -name "*.map" -delete
echo "[sourcemaps] Done. Sourcemaps deleted from dist/."
