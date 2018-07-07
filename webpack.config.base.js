/**
 * Base webpack config used for the electron (main) as well as both of the renderer (dev & production) configs
 */

const path = require("path");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const { dependencies: externals } = require("./app/package.json"); // must be package.json when building, but hatton changed because tslint once in awhile would look in ther for dependencies and break down in confusion

const devMode = process.env.NODE_ENV !== "production";

module.exports = {
  mode: "development",
  stats: {
    //turn off all the "Entrypoint mini-css-extract-plugin =" messages
    entrypoints: false,
    children: false
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        loaders: ["ts-loader"],
        exclude: /node_modules/
      },
      // Extract all .global.css to style.css as is
      {
        test: /\.(scss|sass)$/,
        use: [
          {
            // I'm not sure about this difference
            loader: devMode ? "style-loader" : MiniCssExtractPlugin.loader
          },
          {
            loader: "css-loader",
            options: {
              sourceMap: true, // could be dev only
              modules: false,
              importLoaders: 1,
              localIdentName: "[name]__[local]__[hash:base64:5]"
            }
          },
          {
            loader: "sass-loader"
          }
        ]
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
      },
      {
        test: /\.css$/i,
        use: [
          {
            loader: "style-loader" // creates style nodes from JS strings
          },
          {
            loader: "css-loader" // translates CSS into CommonJS
          }
        ]
      }
    ]
  },

  output: {
    path: path.join(__dirname, "app"),
    filename: "renderer-bundle.js",

    // https://github.com/webpack/webpack/issues/1114
    libraryTarget: "commonjs2"
  },

  // https://webpack.github.io/docs/configuration.html#resolve
  resolve: {
    extensions: [".js", ".ts", ".tsx", ".json"],
    modules: [path.join(__dirname, "app"), "node_modules"]
    // alias: {
    //   _assets: path.resolve(__dirname, "assets")
    // }
  },

  plugins: [
    new MiniCssExtractPlugin({
      filename: "style.css"
    })
  ],

  externals: Object.keys(externals || {})
};
