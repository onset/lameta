import bugsnag from "bugsnag-js";
import createPlugin from "bugsnag-react";
import * as React from "react";
import { render } from "react-dom";
import { remote } from "electron";
import "./app.global.scss";
import App from "./containers/App";
import { setConfig } from "react-hot-loader";
setConfig({ logLevel: "debug" });

export const bugsnagClient = bugsnag({
  apiKey: "f8b144863f4723ebb4bdd6c747c5d7b6",
  appVersion: require("./package.json").version,
  notifyReleaseStages: ["production"],
  releaseStage: process.env.NODE_ENV // so we'll only send bugsnag notices if this matches those listed above in notifyReleaseStages
});
console.log("bugsnag set to appVersion: " + bugsnagClient.config.appVersion);
// bugsnagClient.notify(
//   new Error("Test notify from index.tsx for installed version")
// );

document.body.setAttribute("class", remote.process.platform);
const ErrorBoundary = bugsnagClient.use(createPlugin(React));
render(<App />, document.getElementById("root"));

// if ((module as any).hot) {

//   render(
//     <ErrorBoundary>
//       <App />
//     </ErrorBoundary>,

//     document.getElementById("root")
//   );
// }

// const base = document.createElement("base");
// console.log("Setting base to " + locate("app"));
// base.setAttribute("href", locate("app"));
// document.getElementsByTagName("head")[0].appendChild(base);
