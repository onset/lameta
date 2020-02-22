// NB: started by using @sentry/electron, but it was buggy and unsupported in Fall 2018.
// Switched to the Browser SDK

import * as Sentry from "@sentry/browser";
import { showReportDialog } from "@sentry/browser";
import userSettingsSingleton from "./UserSettings";

export function initializeSentry(evenIfDevelopmentBuild: boolean = false) {
  if (evenIfDevelopmentBuild || process.env.NODE_ENV === "production") {
    Sentry.init({
      dsn: "https://14749f18cf3c4d828e341593bc1b568e@sentry.io/1300542",
      release: require("./package.json").version
      /* This works, but I have it turned off for now because we don't really have a support
            plan in place.
            
      beforeSend(event) {
        // Check if it is an exception, if so, show the report dialog
        // Note that this only will work in the renderer process, it's a noop on the main process
            if (event.exception) {
          showReportDialog({
            title: "We're sorry, laMeta had a problem.",
            subtitle:
              "If you'd like to help us get rid of this bug, tell us what happened below.",
            subtitle2: "",
            user: { email: userSettingsSingleton?.Email || "", name: "" }
          });
        }
        return event;
      }
        */
    });
  }
}
export function setUserInfoForErrorReporting(email: string, howUsing: string) {
  Sentry.configureScope(scope => {
    scope.setUser({ email });
    scope.setExtra("how_using", howUsing);
  });
}
export function sentryBreadCrumb(msg: string) {
  Sentry.addBreadcrumb({ message: msg });
}
