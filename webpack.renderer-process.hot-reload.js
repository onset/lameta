/* eslint-disable max-len */
/**
 * Build config for development process that uses Hot-Module-Replacement
 * https://webpack.github.io/docs/hot-module-replacement-with-webpack.html
 */

const webpack = require("webpack");
const merge = require("webpack-merge");
const baseConfig = require("./webpack.common");
const rendererProcessHotLoadConfig = require("./webpack.renderer-process.hot-reload.core");
const path = require("path");
const port = process.env.PORT || 3000;

module.exports = merge(baseConfig, rendererProcessHotLoadConfig);
