import fs from "fs";
import * as child_process from "child_process";
import {
  getCannotRenameFileMsg,
  NotifyError,
  NotifyFileAccessProblem,
  NotifyNoBigDeal,
  NotifyRenameProblem,
  NotifyWarning
} from "../components/Notify";
import { t } from "@lingui/macro";

/* Do what we can to co-exist with things like antivirus scanners and file-sync
    services that can temporarily lock files. On Windows (only), a process
    holding a file open without delete-sharing makes renaming that file fail
    with EBUSY and renaming any ancestor directory fail with EPERM; we retry
    those two codes for ~10 seconds. (On POSIX, open handles don't block
    renames, so this class of contention doesn't exist there.)

    To torture test this, run the RenameContention.stress.spec.ts suite
    (LAMETA_STRESS=1), or use https://github.com/hatton/filemeddler

    Note: we used to also monkey-patch fs with graceful-fs here, but its
    Windows rename retry only wraps the *async* fs.rename, and everything in
    this file is synchronous — it contributed nothing.
 */

export class PatientFS {
  public static readFileSyncWithNotifyAndRethrow(path: string): string {
    try {
      return PatientFS.readFileSyncNoNotify(path);
    } catch (err) {
      NotifyFileAccessProblem(`Could not read ${path}`, err);
      throw err;
    }
  }
  // Same patient retry behavior, but throws the raw error without showing any
  // notification. For callers that need to classify the error first (e.g. a
  // cloud-provider hydration failure that should fail softly rather than pop a
  // toast per file -- see cloudReadGuard).
  public static readFileSyncNoNotify(path: string): string {
    return PatientFS.patientFileOperationSync(() =>
      fs.readFileSync(path, "utf8")
    );
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
    const kretryAttempts = 10; // I wish i could visibly show something if we're going to wait...
    let attempt = 1;
    for (; attempt <= kretryAttempts; attempt++) {
      try {
        const result = operation(); // this can throw, causing us to loop
        if (attempt > 1) {
          // there is no way to asynchronously show any UI, but after a long wait in which we finally got through, it might help to tell people what caused the a delay.
          NotifyNoBigDeal(
            `There was a delay in accessing a file... perhaps a file-sync service, or antivirus is interfering.`
          );
        }
        return result;
      } catch (err) {
        if (err.code === "EBUSY" || err.code === "EPERM") {
          if (attempt === kretryAttempts) {
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
    console.error(
      "patientFile:sleepForShortWhile because file wasn't available..."
    );
    //"sleep" would probably work on mac/linux. But the equivalent "timeout" on windows fails when there is no keyboad input.
    // So we're doing a ping. Note that a ping of "-n 1" is 0ms on windows, oddly, while "-n 2" takes about a second
    // LAM-117: Fix - arguments must be passed as separate array elements, not a single string.
    // Previously was ["-n 2 127.0.0.1"] which caused ping to fail with "Bad parameter 2".
    // https://linear.app/lameta/issue/LAM-117
    child_process.spawnSync("ping", ["-n", "2", "127.0.0.1"], {
      shell: true
    });
  }
}
