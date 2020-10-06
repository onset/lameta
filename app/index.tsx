import * as React from "react";
import { render } from "react-dom";
import { remote } from "electron";
import "./app.global.scss";
import App from "./containers/App";
import { setConfig } from "react-hot-loader";
import { initializeAnalytics, analyticsEvent } from "./analytics";
import { initializeSentry as initializeErrorReporting } from "./errorHandling";
import { initializeLocalization } from "./localization";

import * as mobx from "mobx";

//if (!process.env.HOT) {
// sentry kills hot reloading with react-hot-loader
// possibly it's trying to report some RHL error... you do see them if you turn on
// "Pause on caught exceptions" in the chrome debug tools
// (note: it is possible to work around this by going away from the screen being modified)
initializeErrorReporting(false);
//}

initializeLocalization();
initializeAnalytics(); //nb: this will report the current language, so should follow initializeLocalization()
analyticsEvent("Launch", "Launch");

setConfig({ logLevel: "debug" });

document.body.setAttribute("class", remote.process.platform);

mobx.configure({
  enforceActions: "never",
  computedRequiresReaction: false,
  reactionRequiresObservable: false,
  observableRequiresReaction: false,
  disableErrorBoundaries: false,
});

render(<App />, document.getElementById("root"));
