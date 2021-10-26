module.exports = function (wallaby) {
  return {
    files: [
      "app/**/*.{ts,tsx,xml,json,json5}",
      "!app/**/*.spec.ts",
      "locale/**/*.csv",
      "sample data/**/*.*", 
      {pattern: 'package.json', load: false, instrument: false},
      // Most of the time, just saying binary:true was enough
      // but then sometimes the reading of the xlsx would fail
      // anyways for some file, as if the cached version was corrupt.
      // For now, this essentially stops wallaby from caching.
      // Later... problem came back, so maybe this wasn't really the answer?
      {pattern: "sample data/*.xlsx", load: false, instrument: false, binary:true}

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
