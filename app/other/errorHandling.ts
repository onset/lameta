// NB: started by using @sentry/electron, but it was buggy and unsupported in Fall 2018.
// Switched to the Browser SDK

import * as Sentry from "@sentry/browser";
import userSettingsSingleton from "./UserSettings";

export function initializeSentry(evenIfDevelopmentBuild: boolean = false) {
  if (evenIfDevelopmentBuild || process.env.NODE_ENV === "production") {
    Sentry.init({
      dsn: "https://46f4099f6a80454c9e9b4c7f4ed00020@sentry.io/3369701",
      release: `${require("../package.json").version}`,

      beforeSend(event) {
        try {
          console.log("Sending " + JSON.stringify(event));
        } catch (err) {}
        return event;
      },
      /* This works, but I have it turned off for now because we don't really have a support
            plan in place.
            
      beforeSend(event) {
        // Check if it is an exception, if so, show the report dialog
        // Note that this only will work in the renderer process, it's a noop on the main process
            if (event.exception) {
          showReportDialog({
            title: "We're sorry, lameta had a problem.",
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
    setUserInfoForErrorReporting(
      userSettingsSingleton.Email,
      userSettingsSingleton.HowUsing
    );
  }
}
export function setUserInfoForErrorReporting(email: string, howUsing: string) {
  Sentry.configureScope((scope) => {
    console.log("setUserInfoForErrorReporting");
    scope.setUser({ email });
    scope.setExtra("how_using", howUsing);
  });
}
export function sentryBreadCrumb(msg: string) {
  Sentry.addBreadcrumb({ message: msg });
}
export function sentryExceptionBreadCrumb(err: Error) {
  Sentry.addBreadcrumb({ message: err.message, level: Sentry.Severity.Error });
}
export function sentryException(err: Error) {
  if (userSettingsSingleton.SendErrors) {
    Sentry.captureException(err);
  } else {
    console.log(`Skipping sending error: ${err.message}`);
  }
}
export function sentryErrorFromString(message: string) {
  if (userSettingsSingleton.SendErrors) {
    try {
      throw new Error(message);
    } catch (err) {
      Sentry.captureException(err);
    }
  } else {
    console.log(`Skipping sending error: ${message}`);
  }
}
