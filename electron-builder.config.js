// electron-builder reads this file (see the "package" script and .github/workflows/main.yml).
// The settings themselves are in electron-builder.json5; this adds what differs by channel.
//
// Alpha, beta and release builds must be able to sit side by side on one computer, so each
// channel gets its own product name and appId. The product name is also written into the
// packaged package.json, because Electron names the settings folder (userData) after it,
// which keeps each channel's settings, and its single-instance lock, apart.
//
// The channel comes from the version in package.json: 4.0.53-beta is beta, 4.0.2 is release.

const fs = require("fs");
const path = require("path");
const JSON5 = require("json5");

const base = JSON5.parse(
  fs.readFileSync(path.join(__dirname, "electron-builder.json5"), "utf8")
);
const { name, version } = require("./package.json");

const channel = version.includes("-alpha")
  ? "alpha"
  : version.includes("-beta")
    ? "beta"
    : "release";

const productName =
  channel === "release" ? base.productName : `${base.productName} ${channel}`;
const appId = channel === "release" ? base.appId : `${base.appId}.${channel}`;
// The Windows installer names the install folder after the package name, not the product name,
// so without this every channel would install over the others in Programs\lameta.
const packageName = channel === "release" ? name : `${name}-${channel}`;

module.exports = {
  ...base,
  productName,
  appId,
  extraMetadata: { ...base.extraMetadata, name: packageName, productName }
};
