/*
    I chose electron-ga because it works with the mobile instead of web approach, which seems to
    fit the electron situation better. It's just a thin wrapper around the "Measurement Protocol"
*/
import Analytics from "electron-ga";
import uuid from "uuid";
import { userSettings } from "./settings";

// clientId  identifies the machine (or account, I suppose), not the actual person
// i.e., if this same person uses a different machine, we won't know it's the same person
const clientId = userSettings.get("clientId") || uuid();
userSettings.set("clientId", clientId);
const analytics = new Analytics("UA-131224630-1", {
  appName: "saymorex",
  appVersion: require("package.json").version,
  clientId
});

analytics.send("event", { ec: "launch", ea: "launch", an: "saymorex" });

export function analyticsLocation(name: string) {
  analytics
    .send("screenview", { cd: name })
    .then(() => console.log("Sent screen view" + name))
    .catch(error => console.error(error));
}
export function analyticsEvent(category: string, action: string) {
  analytics
    .send("event", { ec: category, ea: action })
    .then(() => console.log(`Sent event ${category}/${action}`))
    .catch(error => console.error(error));
}
