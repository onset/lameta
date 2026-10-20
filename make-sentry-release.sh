#!/bin/bash

# Makes the Sentry release for the version in package.json and uploads the source maps that
# `vp run build` left in dist/. CI runs this on each publish, once per platform; running it twice
# for one version is harmless.

# Needs SENTRY_AUTH_TOKEN, or LAMETA_SENTRY_AUTH_TOKEN, holding a Sentry auth token with
# permissions org:read, project:read, project:releases. These tokens are under the *user*
# settings in Sentry, not the project settings.

set -euo pipefail

export SENTRY_AUTH_TOKEN=${SENTRY_AUTH_TOKEN:-${LAMETA_SENTRY_AUTH_TOKEN:-}}
export SENTRY_ORG=onset-org
export SENTRY_PROJECT=lameta

VERSION=$(node -p "require('./package.json').version")
COMMIT=$(git rev-parse HEAD)
sentry() { npx --yes @sentry/cli@2.39.1 "$@"; }

echo "VERSION: $VERSION"
echo "COMMIT: $COMMIT"

sentry releases new "$VERSION"

# errorHandling.ts rewrites each stack frame's file name to start at "dist", as ~/dist/...
sentry sourcemaps upload --release "$VERSION" --url-prefix "~/dist" dist

sentry releases set-commits "$VERSION" --commit "onset/lameta@$COMMIT"

sentry releases finalize "$VERSION"
