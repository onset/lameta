const spawn = require("cross-spawn");
const path = require("path");

const s = `\\${path.sep}`;
const pattern =
  process.argv[2] === "e2e"
    ? `test${s}e2e${s}.+\\.spec\\.tsx?`
    : `test${s}(?!e2e${s})[^${s}]+${s}.+\\.spec\\.tsx?$`;
console.log("2:" + process.argv[2]);
const result = spawn.sync(
  path.normalize("./node_modules/.bin/jest"),
  process.argv[2].startsWith("--") ? [pattern, process.argv[2]] : [pattern],
  { stdio: "inherit" }
);

process.exit(result.status);
