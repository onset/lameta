/**
 * Base webpack config used for the electron (main) as well as both of the renderer (dev & production) configs
 */

const path = require("path");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const { dependencies: externals } = require("./app/package.json"); // must be package.json when building, but hatton changed because tslint once in awhile would look in ther for dependencies and break down in confusion

//test or development
const wantDevelopmentOptimizations = process.env.NODE_ENV !== "production";
// didn't help var HardSourceWebpackPlugin = require("hard-source-webpack-plugin");
const {
  BugsnagBuildReporterPlugin,
  BugsnagSourceMapUploaderPlugin
} = require("webpack-bugsnag-plugins");

module.exports = {
  mode: "development",
  devtool: "source-map", // <-- As of Sept 2018, really, this is the only one that works with typescript
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

      {
        test: /\.(scss|sass)$/,
        exclude: /node_modules/,
        use: [
          {
            // review: I don't know why we need to extract for production
            loader: wantDevelopmentOptimizations
              ? "style-loader"
              : MiniCssExtractPlugin.loader
          },
          {
            loader: "css-loader",
            options: {
              sourceMap: wantDevelopmentOptimizations,
              modules: false,
              importLoaders: 1, // Number of loaders applied before CSS loader.
              localIdentName: "[name]__[local]__[hash:base64:5]"
            }
          },
          {
            loader: "sass-loader",
            options: {
              sourceMap: wantDevelopmentOptimizations
            }
            //loader: "fast-sass-loader" // <-- no source maps
          }
        ]
      },

      // {
      //   test: /\.(html)$/,
      //   exclude: /app\.html/,
      //   use: {
      //     loader: "html-loader"
      //   }
      // },
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
        exclude: /node_modules/,
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
      },
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

  output: {
    path: path.join(__dirname, "app"),
    //filename: "renderer-bundle.js",

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
    // slowed both initial and incremental "watch" builds by a factor of 2-4: new HardSourceWebpackPlugin(),
    new MiniCssExtractPlugin({
      filename: "style.css"
    })
  ],

  optimization: {
    splitChunks: {}
  },

  externals: Object.keys(externals || {})
};

if (process.env.NODE_ENV === "production") {
  //Bugsnag says: "It's a good idea to only run this plugin when you're building a bundle
  // that will be released, rather than for every development build"

  module.exports.plugins.push(
    new BugsnagSourceMapUploaderPlugin({
      apiKey: "f8b144863f4723ebb4bdd6c747c5d7b6",
      appVersion: require("./app/package.json").version,

      overwrite: true
    })
  );
}
