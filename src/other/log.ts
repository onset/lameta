import * as Winston from "winston";
import * as fs from "fs-extra";

const name = process.env.log ? process.env.log : "lameta.log";

// Unit tests must not write to the log of a lameta that is running, and must be able
// to import this module without it touching the filesystem: it is reached from
// modules most of the app imports, and specs that mock "fs-extra" only partially
// would break on the calls below. Same guard as on master.
const inUnitTest = !!process.env.VITEST;

if (!inUnitTest && fs.existsSync(name)) {
  // no: removing it makes vscode close the window: fs.removeSync(name);
  fs.writeFileSync(name, "");
}

const log = Winston.createLogger({
  silent: inUnitTest,
  transports: inUnitTest
    ? [new Winston.transports.Console()]
    : [
        new Winston.transports.File({
          filename: name,
          format: Winston.format.combine(
            Winston.format.timestamp({
              format: "hh:mm:ss"
            }),
            Winston.format.printf(
              (info) => `${info.timestamp} ${info.level}: ${info.message}`
            )
          ),
          handleExceptions: false // "true" here kills react ErrorBoundary
        })
      ]
});

log.info("starting log");

export default log;
