Currently using "@sentry/browser" instead of '@sentry/electron' because of bugs long ago, which could be fixed by now.

Note that "onset" was taken as an org, so our actual org id is "onset-org"

From Bash:
export SENTRY_ORG=onset-org
export SENTRY_PROJECT=lameta
export SENTRY_AUTH_TOKEN= (you can use the release only one, but then you can't do `sentry-cli info`, `sentry-cli projects list`, etc)
VERSION=0.8.5
sentry-cli releases new -p lameta $VERSION
sentry-cli releases set-commits $VERSION --commit "onset/lameta@<the commit SHA>" --log-level=info

This is just a guess:
sentry-cli releases files \$VERSION upload ./app/dist/render-bundle.js '~/render-bundle.js` --rewrite

--strip-prefix

sentry-cli releases files $VERSION upload-sourcemaps ./app/ --rewrite  --log-level=info
sentry-cli releases files $VERSION list
sentry-cli releases finalize \$VERSION

# my ongoing journey in search of stack traces in sentry:

I'm not getting stack traces yet. If I run with `yarn start` then throw an exception, Sentry's web site says

> Source code was not found : file:///C:/dev/lameta/app/dist/renderer-bundle.js

https://github.com/getsentry/sentry-javascript/issues/1785 recommends rewriteFrames, so I've added that, causing it to emit "~/dist/render-bundle.js". That seems to have helped maybe? at least the error changed:

---

Next problem:

I get "Invalid location in sourcemap with column 43, row 99". Thing is, my render-bundle.js.map only has 1 row! When I look at the http put that we sent, it says

> {colno: 17, filename: "~/dist/renderer-bundle.js", function: "click", in_app: true, lineno: 17304}

1. I don't know where I should be able to find something with 17304 lines and a column 17
2. I don't know why sentry's server seems to convert that to "column 43 row 99".

---

Next idea:

> source-map-support
> If you want to rely on Sentry's source map resolution, make sure that your code is not using the source-map-support package, as it overwrites the captured stack trace in a way that makes it impossible for our processors to correctly parse it.

https://github.com/getsentry/sentry-javascript/issues/2929 questions using "source-map-support" like we are using.

So I removed source-map-support, no change in the frame we're sending.

Next idea:

https://blog.sentry.io/2018/10/18/4-reasons-why-your-source-maps-are-broken

> If you’re using two or more JavaScript compilers invoked separately (e.g., Babel + UglifyJS), it’s possible to produce a source map that points to an intermediate transformed state of your code,

Hmmm that sounds plausible, but as far as I can tell I'm not using uglify. Still this smells like the kind of problem I have.

# older notes

Problem: sentry-cli seems to read AUTH from sentry.properties (which is committed and thus low permissions), rather than the key I give it in
`sentry-cli login`.

Currently the webpack plugin is commented out because it wants a higher permissions and I haven't worked out how to give it those safely.

By hand, we can do (after temporarily changing the auth in sentry.properties)
`sentry-cli releases files 0.8.0 upload-sourcemaps ./app/ --rewrite`

So far I have not seen this actually give me a source level stack trace. The docs say

> You don’t have to upload the source files (referenced by source maps), but without them the grouping algorithm will not be as strong, and the UI will not show any contextual source.

But those same docs only talk about uploading the map. And my source maps actually have the source embedded, so should that be enough?
