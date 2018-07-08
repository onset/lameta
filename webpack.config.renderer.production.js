/**
 * Build config for electron 'Renderer Process' file
 */

const path = require("path");
const webpack = require("webpack");
const merge = require("webpack-merge");
//const HtmlWebpackPlugin = require("html-webpack-plugin");
const baseConfig = require("./webpack.config.base");

// -----------------------------------------------------------------------------------------
// For debugging endless watch loops. I fixed the problem but if it come back I want this
// here to just turn on again.
class MonitorWatch {
  apply(compiler) {
    // listen to the "watchRun" event
    compiler.plugin("watchRun", compiler => {
      //from https://stackoverflow.com/questions/43140501/can-webpack-report-which-file-triggered-a-compilation-in-watch-mode
      const changedTimes = compiler.watchFileSystem.watcher.mtimes;
      const files = Object.keys(changedTimes)
        .map(file => `\n  ${file}`)
        .join("");
      if (files.length) {
        console.log("^^^^ Files changed:", files);
      }
    });
  }
}

module.exports = merge(baseConfig, {
  mode: "production",
  //devtool: "cheap-module-source-map",
  devtool: "inline-source-map",

  entry: ["./app/index"],

  output: {
    filename: "renderer-bundle.js",
    path: path.join(__dirname, "app/dist"),
    publicPath: "./dist/"
  },

  module: {
    rules: [
      // WOFF Font
      {
        test: /\.woff(\?v=\d+\.\d+\.\d+)?$/,
        use: {
          loader: "url-loader",
          options: {
            limit: 10000,
            mimetype: "application/font-woff"
          }
        }
      },
      // WOFF2 Font
      {
        test: /\.woff2(\?v=\d+\.\d+\.\d+)?$/,
        use: {
          loader: "url-loader",
          options: {
            limit: 10000,
            mimetype: "application/font-woff"
          }
        }
      },
      // TTF Font
      {
        test: /\.ttf(\?v=\d+\.\d+\.\d+)?$/,
        use: {
          loader: "url-loader",
          options: {
            limit: 10000,
            mimetype: "application/octet-stream"
          }
        }
      },
      // EOT Font
      {
        test: /\.eot(\?v=\d+\.\d+\.\d+)?$/,
        use: "file-loader"
      },
      // SVG Font
      {
        test: /\.svg(\?v=\d+\.\d+\.\d+)?$/,
        use: {
          loader: "url-loader",
          options: {
            limit: 10000,
            mimetype: "image/svg+xml"
          }
        }
      }
    ]
  },

  plugins: [
    new MonitorWatch(),

    // https://webpack.github.io/docs/list-of-plugins.html#occurrenceorderplugin
    // https://github.com/webpack/webpack/issues/864
    new webpack.optimize.OccurrenceOrderPlugin()

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
  ],

  // https://github.com/chentsulin/webpack-target-electron-renderer#how-this-module-works
  target: "electron-renderer"
});
