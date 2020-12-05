#!/bin/bash

# you must have LAMETA_SENTRY_AUTH_TOKEN in environment that has 
# permissions org:read, project:read, project:releases
# These Auth Tokens are found under the user settings in Sentry, not the project settings.

export SENTRY_ORG=onset
export SENTRY_PROJECT=lameta
export SENTRY_URL=https://sentry.keyman.com/
export SENTRY_AUTH_TOKEN=$LAMETA_SENTRY_AUTH_TOKEN

commitSHA=$(sentry-cli releases propose-version)
# notice that we keep the current version in a different package.json, on under app/
VERSION=$(grep version app/package.json | sed 's/.*"version": "\(.*\)".*/\1/')

sentry-cli releases new -p lameta $VERSION
sentry-cli releases set-commits $VERSION --commit "onset/lameta"@$commitSHA

# We need render-bundle.js, render-bundle.js.map, and all source code:

sentry-cli releases files $VERSION upload-sourcemaps ./app/ --rewrite --ext map --ext js --ext ts --ext tsx --ignore *.spec.ts --ignore *.css.map --ignore **/*Icon.tsx