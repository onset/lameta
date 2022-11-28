// NOTE: this is used by multiple processes, so check all these after making any changes
// 1. yarn dev, yarn build-production
// 2. yarn test (jest test running environment)
// 3. yarn lingui-extract

module.exports = function (api) {
  if (api) api.cache(true);
  return {
    presets: [
      "@babel/preset-typescript",

      [
        // allow ES2015, ES2016 stuff like import
        "@babel/preset-env",
        {
          targets: {
            // else we get regeneratorRuntime is not defined
            browsers: ["chrome 76"], // should be set to match whatever chromium electron is using. But at 106 (electron 22, babel with webpack 4 has compilation problems)
          },
        },
      ],
      "@babel/preset-react",
    ],
    plugins: [
      "babel-plugin-macros",
      "@babel/plugin-transform-modules-commonjs", //https://github.com/facebook/jest/issues/6913#issuecomment-421618932
      //playwright can't handle these ["@babel/plugin-proposal-decorators", { legacy: true }],
      ["@babel/plugin-proposal-class-properties", { loose: false }],
    ],
  };
};
