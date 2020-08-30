/* eslint-disable max-len */
/**
 * Build config for development process that uses Hot-Module-Replacement
 * https://webpack.github.io/docs/hot-module-replacement-with-webpack.html
 */

const webpack = require("webpack");
const merge = require("webpack-merge");
const rendererProcessConfig = require("./webpack.renderer-process.hot-reload.core");
const x = require("./webpack.renderer-process.hot-reload");
const mainProcessConfig = require("./webpack.main-process");

module.exports = merge(rendererProcessConfig, mainProcessConfig);

/* August 2020... so, this doesn't actually work, but I'm leaving it here in case I find more info that could make it work.
What I'm trying to do is to include main process compiling in the standard "yarn dev" run. I got that to happen,
but I think only in-memory, while  the actual run of electron is still using the main-bundle.js that is sitting on disk. */
