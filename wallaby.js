module.exports = function (wallaby) {
  return {
    files: [
      "app/**/*.{ts,tsx,xml,json,json5}",
      "!app/**/*.spec.ts",
      "locale/**/*.csv",
      "sample data/**/*.*", 
      {pattern: 'package.json', load: false, instrument: false},
      {pattern: "sample data/*.xlsx", binary:true}
    ],

    tests: ["app/**/*spec.ts"],
    env: {
      type: "node",
      params: {
        env: "NODE_ENV=test",
      },
    },
    testFramework: "jest",
    compilers: {
      "**/*.ts?(x)": wallaby.compilers.babel(),
    },
  };
};
