import * as Winston from "winston";
import * as fs from "fs-extra";
import * as Path from "path";
import { format } from "date-fns";
import pkg from "package.json";
import { getPath } from "./windowIpc";

// lameta.log keeps several runs, so that a user who restarted after an error can
// still report it. Each run starts with a line giving the date and version. The file
// is in Electron's logs folder for lameta: on Windows,
// %APPDATA%\lameta\logs\lameta.log. Help > Show Log File opens that folder.

// Unit tests must not write to the log of a lameta that is running
const inUnitTest = !!process.env.VITEST;

// when the log passes this size at startup, its oldest part is dropped
const kMaxBytes = 2 * 1024 * 1024;
const kKeepBytes = 1024 * 1024;

function getLogPath(): string {
  if (process.env.log) return process.env.log;
  try {
    return Path.join(getPath("logs"), "lameta.log");
  } catch {
    // outside Electron's renderer
    return "lameta.log";
  }
}

export const logPath = inUnitTest ? "" : getLogPath();

// Keeps the newest part of the log, starting at a whole line
function trimOldest(path: string) {
  try {
    if (!fs.existsSync(path) || fs.statSync(path).size <= kMaxBytes) return;
    const text = fs.readFileSync(path, "utf8");
    const tail = text.slice(text.length - kKeepBytes);
    fs.writeFileSync(path, tail.slice(tail.indexOf("\n") + 1));
  } catch {
    // a log that cannot be trimmed is still worth writing to
  }
}

if (!inUnitTest) {
  try {
    fs.ensureDirSync(Path.dirname(logPath));
  } catch {}
  trimOldest(logPath);
}

const log = Winston.createLogger({
  silent: inUnitTest,
  transports: inUnitTest
    ? [new Winston.transports.Console()]
    : [
        new Winston.transports.File({
          filename: logPath,
          format: Winston.format.combine(
            Winston.format.timestamp({
              format: "HH:mm:ss",
            }),
            Winston.format.printf(
              (info) => `${String(info.timestamp)} ${info.level}: ${String(info.message)}`,
            ),
          ),
          handleExceptions: false, // "true" here kills react ErrorBoundary
        }),
      ],
});

// local date, to match the local time that starts each line
log.info(`---- lameta ${pkg.version} started ${format(new Date(), "yyyy-MM-dd")}`);

export default log;
