import * as fs from "fs";
import * as child_process from "child_process";
import { NotifyNoBigDeal, NotifyWarning } from "../components/Notify";

/* Do what we can to co-exist with things like Dropbox that can temporarily lock files.
    To torture test this stuff, use https://github.com/hatton/filemeddler
 */

export class PatientFS {
  public static readFileSync(path: string): string {
    return PatientFS.patientFileOperationSync(() =>
      fs.readFileSync(path, "utf8")
    );
  }
  public static writeFileSync(path: string, contents: string): string {
    return PatientFS.patientFileOperationSync(() =>
      fs.writeFileSync(path, contents, { encoding: "utf8" })
    );
  }
  public static renameSync(from: string, to: string) {
    PatientFS.patientFileOperationSync(() => fs.renameSync(from, to));
  }
  private static patientFileOperationSync(operation: () => any): any {
    const kattempts = 5;
    for (let attempt = 0; attempt < kattempts; attempt++) {
      try {
        const result = operation();
        if (attempt > 0) {
          console.log("patientReadFileSync: OK, got the file");
        }
        return result;
      } catch (err) {
        if (err.code === "EBUSY") {
          // there is no way to asynchronously show any UI, but after a long wait it might help to tell people what caused the a delay
          if (attempt === 0) {
            NotifyNoBigDeal(
              `There was a delay in reading a file... perhaps Dropbox or antivirus is interfering.`
            );
          }

          if (attempt === kattempts - 1) {
            throw err; // give up
          }
          console.log("patientReadFileSync: Sleeping...");
          PatientFS.sleepForShortWhile();
        } else throw err; // some other problem
      }
    }
    throw Error("should never get to this point");
  }

  private static sleepForShortWhile() {
    //"sleep" would probably work on mac/linux. But the equivalent "timeout" on windows fails when there is no keyboad input.
    // So we're doing a ping. Note tha a pint of "-n 1" is 0ms on windows, oddly, while "-n 2" takes about a second
    child_process.spawnSync("ping", ["-n 2 127.0.0.1"], {
      shell: true,
    });
  }
}
