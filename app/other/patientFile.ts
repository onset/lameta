import * as fs from "fs";
import * as child_process from "child_process";
import {
  getCannotRenameFileMsg,
  NotifyError,
  NotifyFileAccessProblem,
  NotifyNoBigDeal,
  NotifyRenameProblem,
  NotifyWarning,
} from "../components/Notify";
import { t } from "@lingui/macro";

/* Do what we can to co-exist with things like Dropbox that can temporarily lock files.
    To torture test this stuff, use https://github.com/hatton/filemeddler

    Note, I wrote this before discovering graceful-fs. I've added that, as it's more
    extensive. Keeping this around for now because there is some question about some 
    windows corner-cases in the graceful-fs system.

    But I'm reducing the number of retry attempts to just 1 for now.
 */

export class PatientFS {
  public static init() {
    // monkey-patch fs
    const realFs = require("fs");
    const gracefulFs = require("graceful-fs");
    gracefulFs.gracefulify(realFs);
  }
  public static readFileSyncWithNotifyAndRethrow(path: string): string {
    try {
      return PatientFS.patientFileOperationSync(() =>
        fs.readFileSync(path, "utf8")
      );
    } catch (err) {
      NotifyFileAccessProblem(`Could not read ${path}`, err);
      throw err;
    }
  }
  public static writeFileSyncWithNotifyThenRethrow(
    path: string,
    contents: string
  ) {
    try {
      return PatientFS.patientFileOperationSync(() =>
        fs.writeFileSync(path, contents, { encoding: "utf8" })
      );
    } catch (err) {
      NotifyFileAccessProblem(`Could not write ${path}`, err);
      throw err;
    }
  }

  public static assertWritePermissionWithNotification(
    path: string,
    thingWeWereTryingToDo: string
  ): boolean {
    try {
      // from https://stackoverflow.com/a/64386424/723299
      const UV_FS_O_EXLOCK = 0x10000000;
      const handle = fs.openSync(path, fs.constants.O_RDONLY | UV_FS_O_EXLOCK);
      fs.closeSync(handle);
    } catch (err) {
      NotifyFileAccessProblem(thingWeWereTryingToDo, err);
      return false;
    }
    return true;
  }

  public static copyFileSync(from: string, to: string) {
    PatientFS.patientFileOperationSync(() => fs.copyFileSync(from, to));
  }
  public static renameSync(from: string, to: string) {
    PatientFS.patientFileOperationSync(() => fs.renameSync(from, to));
  }
  public static renameSyncWithNotifyAndRethrow(
    from: string,
    to: string,
    fileType?: string
  ) {
    try {
      PatientFS.patientFileOperationSync(() => fs.renameSync(from, to));
    } catch (err) {
      if (
        err.code === "EBUSY" &&
        (fileType === "Video" || fileType === "Audio")
      ) {
        // this is a special case we've seen before.
        NotifyError(
          `${getCannotRenameFileMsg()} ` +
            t`Restart lameta and do the rename before playing the video again.`
        );
      } else {
        NotifyRenameProblem(err, from);
      }
      throw err;
    }
  }
  private static patientFileOperationSync(operation: () => any): any {
    // note, graceful-fs is already pausing up to 60 seconds on each attempt.
    // So even 2 attempts may be too much.
    const kattempts = 2;
    let attempt = 1;
    for (; attempt <= kattempts; attempt++) {
      try {
        const result = operation();
        if (attempt > 1) {
          // there is no way to asynchronously show any UI, but after a long wait in which we finally got through, it might help to tell people what caused the a delay.
          NotifyNoBigDeal(
            `There was a delay in reading a file... perhaps another program, file sync service, or antivirus is interfering.`
          );
        }
        return result;
      } catch (err) {
        if (err.code === "EBUSY") {
          if (attempt === kattempts) {
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
