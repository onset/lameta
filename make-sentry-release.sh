#!/bin/bash

# you must have LAMETA_SENTRY_AUTH_TOKEN in environment that has 
# permissions org:read, project:read, project:releases
# These Auth Tokens are found under the *user* settings in Sentry, not the project settings.

# Note: The commands also rely on .sentryclirc being in the same directory and configured appropriately.

export SENTRY_AUTH_TOKEN=$LAMETA_SENTRY_AUTH_TOKEN

commitSHA=$(sentry-cli releases propose-version)
VERSION=$(grep version package.json | sed 's/.*"version": "\(.*\)".*/\1/')
# I don't know if this works, suddenly started getting an error about a missing --org in the Action
ORG=onset-org

echo COMMIT: ${commitSHA}
echo VERSION: ${VERSION}

sentry-cli info

sentry-cli releases list

 sentry-cli releases new -p lameta $VERSION

 sentry-cli releases set-commits $VERSION --commit "onset/lameta"@$commitSHA

 sentry-cli releases finalize "$VERSION"

# We need render-bundle.js, render-bundle.js.map, and all source code:

sentry-cli releases files $VERSION upload-sourcemaps ./app/ --rewrite --ext map --ext js --ext ts --ext tsx --ignore *.spec.ts --ignore *.css.map --ignore **/*Icon.tsx