/*
    I was using electron-ga because it works with the mobile instead of web approach, which seems to
    fit the electron situation better. It's just a thin wrapper around the "Measurement Protocol".

    However 
    1) it was having trouble with remote.app on newer versions of electron, and
    2) it has not been updated to work with Google Analytics 4, and the Universal Analytics is being
    discontinued. So I switched to using Segment
*/

import userSettingsSingleton from "./UserSettings";
import { sentryBreadCrumb } from "./errorHandling";
import { currentUILanguage } from "./localization";
import { AnalyticsBrowser } from "@segment/analytics-next";
import * as fs from "fs";
import { locate } from "./crossPlatformUtilities";

let analytics: AnalyticsBrowser | undefined;

export async function initializeAnalytics() {
  try {
    let key = "";
    if (
      process.env.NODE_ENV === "test" ||
      process.env.NODE_ENV === "development" ||
      userSettingsSingleton.DeveloperMode
    ) {
      key = "O3C1FrbcFpPL8ZKCXwek4mEr6sqq40UB"; // "lameta-test"
    } else {
      // The github action saves the production in this file at runtime.
      // The key that is checked in is the "lameta-test" key, which doesn't go anywhere beyond segment debugger
      // The project is at https://app.segment.com/lameta
      key = fs.readFileSync(locate("assets/.segment"), "utf8").trim();
    }
    analytics = AnalyticsBrowser.load({ writeKey: key }); // review: this isn't async?
    await analytics.identify(userSettingsSingleton.ClientId, {
      appVersion: require("package.json").version,
      language: currentUILanguage || "",
      howUsing: userSettingsSingleton.HowUsing,
      email: userSettingsSingleton.Email,
    });
  } catch (e) {
    console.error(e);
  }
}

export function analyticsLocation(name: string) {
  if (analytics)
    analytics
      .screen(name)
      //.then(() => console.log("Sent screen view" + name))
      .catch((error) => console.error(error));
  // in case of an error later, also list this in the error log
  sentryBreadCrumb(name);
}
export function analyticsEvent(category: string, action: string) {
  if (analytics)
    analytics
      .track(action, {
        category,
      })
      //.then(() => console.log(`Sent event ${category}/${action}`))
      .catch((error) => console.error(error));
}
