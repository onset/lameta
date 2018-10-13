import * as React from "react";
import { render } from "react-dom";
import { remote } from "electron";
import "./app.global.scss";
import App from "./containers/App";
import { setConfig } from "react-hot-loader";
setConfig({ logLevel: "debug" });

document.body.setAttribute("class", remote.process.platform);

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
