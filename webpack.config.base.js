/**
 * Base webpack config used across other specific configs
 */

const path = require("path");
const { dependencies: externals } = require("./app/package.json"); // must be package.json when building, but hatton changed because tslint once in awhile would look in ther for dependencies and break down in confusion

module.exports = {
  mode: "development",
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        loaders: ["ts-loader"],
        exclude: /node_modules/
      },
      {
        test: /\.(html)$/,
        use: {
          loader: "html-loader"
        }
      },
      {
        test: /\.md$/,
        use: [
          {
            loader: "html-loader"
          },
          {
            loader: "markdown-loader"
          }
        ]
      },
      {
        test: /\.(xml)$/,
        use: [
          {
            loader: "raw-loader",
            options: {}
          }
        ]
      },
  
      // Common Image Formats
      {
        test: /\.(?:ico|gif|png|jpg|jpeg|webp)$/,
        use: "url-loader"
      }
    ]
  },

  output: {
    path: path.join(__dirname, "app"),
    filename: "bundle.js",

    // https://github.com/webpack/webpack/issues/1114
    libraryTarget: "commonjs2"
  },

  // https://webpack.github.io/docs/configuration.html#resolve
  resolve: {
    extensions: [".js", ".ts", ".tsx", ".json"],
    modules: [path.join(__dirname, "app"), "node_modules"]
  },

  plugins: [],

  externals: Object.keys(externals || {})
};
