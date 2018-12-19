// NB: started by using @sentry/electron, but it was buggy and unsupported in Fall 2018.
// Switched to the Browser SDK

import Sentry from "@sentry/browser";

export function initializeSentry() {
  Sentry.init({
    dsn: "https://14749f18cf3c4d828e341593bc1b568e@sentry.io/1300542",
    release: require("./package.json").version
  });
}

export function breadcrumb(msg: string) {
  Sentry.addBreadcrumb({ message: msg });
}
