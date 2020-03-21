Currently using "@sentry/browser" instead of '@sentry/electron' because of bugs long ago, which could be fixed by now.

Note that "onset" was taken as an org, so our actual org id is "onset-org"

From Bash:
export SENTRY_ORG=onset-org
export SENTRY_PROJECT=lameta
export SENTRY_AUTH_TOKEN= (you can use the release only one, but then you can't do `sentry-cli info`, `sentry-cli projects list`, etc)
VERSION=0.8.5
sentry-cli releases new -p lameta $VERSION
sentry-cli releases set-commits $VERSION --commit "onset/lameta@<the commit tag>" --log-level=info
sentry-cli releases files $VERSION upload-sourcemaps ./app/ --rewrite
sentry-cli releases finalize $VERSION

# older notes

Problem: sentry-cli seems to read AUTH from sentry.properties (which is committed and thus low permissions), rather than the key I give it in
`sentry-cli login`.

Currently the webpack plugin is commented out because it wants a higher permissions and I haven't worked out how to give it those safely.

By hand, we can do (after temporarily changing the auth in sentry.properties)
`sentry-cli releases files 0.8.0 upload-sourcemaps ./app/ --rewrite`

So far I have not seen this actually give me a source level stack trace. The docs say

> You don’t have to upload the source files (referenced by source maps), but without them the grouping algorithm will not be as strong, and the UI will not show any contextual source.

But those same docs only talk about uploading the map. And my source maps actually have the source embedded, so should that be enough?
