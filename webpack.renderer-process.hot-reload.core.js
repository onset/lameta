/* eslint-disable max-len */
/**
 * Build config for development process that uses Hot-Module-Replacement
 * https://webpack.github.io/docs/hot-module-replacement-with-webpack.html
 */

const webpack = require("webpack");
const merge = require("webpack-merge");
const path = require("path");
const port = process.env.PORT || 3000;

module.exports = merge({
  mode: "development",

  entry: [
    "react-hot-loader/patch",
    `webpack-hot-middleware/client?path=http://localhost:${port}/__webpack_hmr&reload=true`,
    "./app/index",
  ],

  output: {
    publicPath: `http://localhost:${port}/dist/`, // this is "as the browser will get it"
    filename: "renderer-bundle.js",
  },

  module: {
    rules: [],
  },

  plugins: [
    // https://webpack.github.io/docs/hot-module-replacement-with-webpack.html
    new webpack.HotModuleReplacementPlugin(),

    new webpack.NoEmitOnErrorsPlugin(),

    // // NODE_ENV should be production so that modules do not perform certain development checks
    // new webpack.DefinePlugin({
    //   "process.env.NODE_ENV": JSON.stringify("development")
    // }),

    new webpack.LoaderOptionsPlugin({
      debug: true,
    }),
  ],

  // https://github.com/chentsulin/webpack-target-electron-renderer#how-this-module-works
  target: "electron-renderer",
});
