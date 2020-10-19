import * as fs from "fs";
import * as child_process from "child_process";
import { NotifyWarning } from "../components/Notify";

export function patientReadFileSync(path: string): string {
  const kattempts = 5;
  for (let attempt = 0; attempt < kattempts; attempt++) {
    try {
      const result = fs.readFileSync(path, "utf8");
      if (attempt > 0) {
        console.log("patientReadFileSync: OK, got the file");
      }
      return result;
    } catch (err) {
      if (err.code === "EBUSY") {
        // there is no way to asynchronously show any UI, but after a long wait it might help to tell people what caused the a delay
        if (attempt === 0) {
          NotifyWarning(
            `There was a delay in reading a file... perhaps Dropbox or antivirus is interfering?`
          );
        }

        if (attempt === kattempts - 1) {
          throw err; // give up
        }
        console.log("patientReadFileSync: Sleeping...");
        sleepForShortWhile();
      } else throw err; // some other problem
    }
  }
  throw Error("should never get to this point");
}

function sleepForShortWhile() {
  //"sleep" would probably work on mac/linux. But the equivalent "timeout" on windows fails when there is no keyboad input.
  // So we're doing a ping. Note tha a pint of "-n 1" is 0ms on windows, oddly, while "-n 2" takes about a second
  child_process.spawnSync("ping", ["-n 2 127.0.0.1"], {
    shell: true,
  });
}
