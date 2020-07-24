/**
 * Build config for electron 'Main Process' file
 */

const webpack = require("webpack");
const merge = require("webpack-merge");
const baseConfig = require("./webpack.config.base");
const path = require("path");
const port = process.env.PORT || 3000;

module.exports = merge(baseConfig, {
  entry: ["./app/main"],

  mode: process.env.NODE_ENV === "production" ? "production" : "development",

  // 'main-bundle.js' in root
  output: {
    filename: "main-bundle.js",
    // Ideally the main-bundle.js should be in app/dist, but Electron
    // doesn't allow us to reach up a level for the app.html like this:
    // path: path.join(__dirname, "app/dist"),
    // publicPath: "./dist/" // needed by bugsnag sourcemap upload

    // so at the moment we're putting the main-bundle.js up in app and use this
    path: path.join(__dirname, "app"),
    publicPath: `http://localhost:${port}/`, // needed by bugsnag sourcemap upload
  },

  plugins: [
    // Add source map support for stack traces in node
    // https://github.com/evanw/node-source-map-support
    // new webpack.BannerPlugin(
    //   'require("source-map-support").install();',
    //   { raw: true, entryOnly: false }
    // ),
    // new webpack.DefinePlugin({
    //   "process.env": {
    //     NODE_ENV: JSON.stringify("production")
    //   }
    // })
  ],

  /**
   * Set target to Electron specific node.js env.
   * https://github.com/chentsulin/webpack-target-electron-renderer#how-this-module-works
   */
  target: "electron-main",

  /**
   * Disables webpack processing of __dirname and __filename.
   * If you run the bundle in node.js it falls back to these values of node.js.
   * https://github.com/webpack/webpack/issues/2010
   */
  node: {
    __dirname: false,
    __filename: false,
  },
});
