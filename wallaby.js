module.exports = function (w) {
  return {
    files: [
      "app/**/*.{ts,tsx,xml,json,json5}",
      "!app/**/*.spec.ts",
      "locale/**/*.csv",
      "sample data/**/*.*",
    ],

    tests: ["app/**/*spec.ts"],
    env: {
      type: "node",
      params: {
        env: "NODE_ENV=test",
      },
    },
    testFramework: "jest",
  };
};
