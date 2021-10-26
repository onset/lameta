const spawn = require("cross-spawn");
const path = require("path");

let pattern;

switch (process.argv[2]) {
  case "e2e":
    pattern = "test/e2e/.+\\.spec\\.tsx?";
    break;
  case "unit":
    pattern = "(?<!e2e).(spec|test)\\.tsx?";
    break;
  default:
    pattern = ".(spec|test)\\.tsx?";
}

let cliSwitch = undefined;
if (process.argv[2] && process.argv[2].startsWith("--")) {
  cliSwitch = process.argv[2];
} else if (process.argv[3] && process.argv[3].startsWith("--")) {
  cliSwitch = process.argv[3];
}

const result = spawn.sync(
  path.normalize("./node_modules/.bin/jest"),
  // process.argv[2] && process.argv[2].startsWith("--")
  //   ? [pattern, process.argv[2]]
  //   : [pattern],
  cliSwitch ? [pattern, cliSwitch] : [pattern],
  { stdio: "inherit" }
);

process.exit(result.status);
