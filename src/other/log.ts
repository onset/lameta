import * as Winston from "winston";
import * as fs from "fs-extra";

const name = process.env.log ? process.env.log : "lameta.log";

if (fs.existsSync(name)) {
  // no: removing it makes vscode close the window: fs.removeSync(name);
  fs.writeFileSync(name, "");
}

const log = Winston.createLogger({
  transports: [
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
