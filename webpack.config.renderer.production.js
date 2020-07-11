/**
 * Build config for electron 'Renderer Process' file
 */

const path = require("path");
const webpack = require("webpack");
const merge = require("webpack-merge");
//const HtmlWebpackPlugin = require("html-webpack-plugin");
const baseConfig = require("./webpack.config.base");

const SpeedMeasurePlugin = require("speed-measure-webpack-plugin");
const speedMeasurePlugin = new SpeedMeasurePlugin();

//const UglifyJsPlugin = require("uglifyjs-webpack-plugin");

const port = process.env.PORT || 3000;
// -----------------------------------------------------------------------------------------
// For debugging endless watch loops. I fixed the problem but if it come back I want this
// here to just turn on again.
class MonitorWatch {
  apply(compiler) {
    // listen to the "watchRun" event
    compiler.plugin("watchRun", (compiler) => {
      //from https://stackoverflow.com/questions/43140501/can-webpack-report-which-file-triggered-a-compilation-in-watch-mode
      const changedTimes = compiler.watchFileSystem.watcher.mtimes;
      const files = Object.keys(changedTimes)
        .map((file) => `\n  ${file}`)
        .join("");
      if (files.length) {
        console.log("^^^^ Files changed:", files);
      }
    });
  }
}

module.exports = speedMeasurePlugin.wrap(
  // outputs timing each loader
  merge(baseConfig, {
    //https://github.com/stephencookdev/speed-measure-webpack-plugin
    mode: process.env.NODE_ENV === "production" ? "production" : "development",

    entry: ["./app/index"],

    output: {
      filename: "renderer-bundle.js",
      path: path.join(__dirname, "app/dist"),
      // this is what we get when running "yarn dev": publicPath: `http://localhost:${port}/dist/` // this is "as the browser will get it"
      // this is what we get when running "yarn start":
      publicPath: "file:///**/renderer-bundle.js",
    },

    // use the following if you're getting errors in the terminal, before source maps are available.
    // it will eave the code alone so you have a greater chance of making use of the line numbers in the errors.
    // optimization: {
    //   minimizer: [
    //     new UglifyJsPlugin({
    //       sourceMap: true,
    //       uglifyOptions: { mangle: false, compress: false }
    //     })
    //   ]
    // },

    module: {
      rules: [],
    },

    plugins: [
      new MonitorWatch(),

      // https://webpack.github.io/docs/list-of-plugins.html#occurrenceorderplugin
      // https://github.com/webpack/webpack/issues/864
      new webpack.optimize.OccurrenceOrderPlugin(),

      // NODE_ENV should be production so that modules do not perform certain development checks
      // new webpack.DefinePlugin({
      //   "process.env.NODE_ENV": JSON.stringify("production")
      // }),

      // I don't know why this was here originally, we don't need it. But it was
      // causing and endless watch loop as the app.html was being watched.
      // new HtmlWebpackPlugin({
      //   filename: "../app.html",
      //   template: "app/app.html",
      //   inject: false
      // })

      // as far as I know, we just need to report this once per build, so we don't need this done for main.
    ],

    // https://github.com/chentsulin/webpack-target-electron-renderer#how-this-module-works
    target: "electron-renderer",
  })
);
