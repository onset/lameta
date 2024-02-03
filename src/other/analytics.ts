/*
    I was using electron-ga because it works with the mobile instead of web approach, which seems to
    fit the electron situation better. It's just a thin wrapper around the "Measurement Protocol".

    However 
    1) it was having trouble with remote.app on newer versions of electron, and
    2) it has not been updated to work with Google Analytics 4, and the Universal Analytics is being
    discontinued. So I switched to using Segment

    The project is at https://app.segment.com/lameta
*/

import userSettingsSingleton from "./UserSettings";
import { sentryBreadCrumb } from "./errorHandling";
import { currentUILanguage } from "./localization";

import fs from "fs";
import { Analytics } from "@segment/analytics-node";
import pkg from "package.json";
import { getTestEnvironment } from "../getTestEnvironment";
import { locateDependencyForFilesystemCall } from "./locateDependency";

let analytics: Analytics | undefined;

export async function initializeAnalytics() {
  try {
    let key: string | undefined = undefined;
    if (process.env.NODE_ENV === "test" || getTestEnvironment().E2E) {
      analytics = undefined; // don't spend segment.com quota on tests
    } else if (
      userSettingsSingleton.DeveloperMode ||
      process.env.NODE_ENV === "development"
    )
      key = getKey(0);
    // Will show up here: https://app.segment.com/lameta/sources/lameta-test/debugger
    else key = getKey(1);

    if (!key) {
      return;
    }
    const version = pkg.version;
    analytics = new Analytics({ writeKey: key });
    analytics.identify({
      userId: userSettingsSingleton.ClientId,
      traits: {
        appVersion: version,
        language: currentUILanguage || "",
        howUsing: userSettingsSingleton.HowUsing,
        email: userSettingsSingleton.Email
      }
    });
  } catch (e) {
    console.error(e);
  }
}

export function analyticsLocation(screenName: string) {
  if (analytics) {
    try {
      analytics.page({
        userId: userSettingsSingleton.ClientId,
        name: screenName
      });
    } catch (e) {
      console.error(e);
    }
    sentryBreadCrumb(screenName);
  }
}
export function analyticsEvent(
  category: string,
  event: string,
  details?: object
) {
  if (analytics) {
    try {
      analytics.track({
        userId: userSettingsSingleton.ClientId,
        event,
        properties: details
      });
    } catch (e) {
      console.error(e);
    }
  }
}
function getKey(index: number): string | undefined {
  // The github action saves this value in file, which is .gitIgnore'd, at runtime.
  const path = locateDependencyForFilesystemCall("assets/.segment");
  // this .gitignore'd file, if it exists, should contain a comma-separated list of keys: "testKey, productionKey"
  if (!fs.existsSync(path)) {
    console.log(
      `No "assets/.segment" file found at ${path}. Will not send analytics. This is expected in development mode.`
    );
    return undefined;
  }
  return fs.readFileSync(path, "utf8").split(",")[index].trim();
}
