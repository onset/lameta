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

/* Do what we can to co-exist with things like Dropbox that can temporarily lock files.
    To torture test this stuff, use https://github.com/hatton/filemeddler

    Note, I wrote this before discovering graceful-fs. I've added that, as it's more
    extensive. Keeping this around for now because there is some question about some 
    windows corner-cases in the graceful-fs system.

    UPDATE: It turns out that graceful-fs is only prevents contention between threads,
    not with other processes.

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
  public static readFileSyncNoNotify(path: string): string {
    return PatientFS.patientFileOperationSync(() =>
      fs.readFileSync(path, "utf8")
    );
  }
  // Writing a file in place truncates it first, so a save that is cut off (power
  // loss, a drive pulled out, an I/O error) leaves it empty. Instead, write a
  // temporary file beside it, flush that to disk, and rename it over the file, so
  // that an interruption leaves either the old contents or the new ones.
  public static writeFileSyncWithNotifyThenRethrow(
    path: string,
    contents: string
  ) {
    const tempPath = PatientFS.temporaryPathForSaving(path);
    try {
      // A rename ignores the file's own permissions on macOS and Linux, so refuse
      // here, as writing in place did, when the file is read-only.
      const existingMode = fs.existsSync(path)
        ? PatientFS.patientFileOperationSync(() => {
            fs.accessSync(path, fs.constants.W_OK);
            return fs.statSync(path).mode;
          })
        : undefined;
      PatientFS.patientFileOperationSync(() =>
        PatientFS.writeAndFlush(tempPath, contents)
      );
      if (existingMode !== undefined && process.platform !== "win32") {
        fs.chmodSync(tempPath, existingMode);
      }
      PatientFS.patientFileOperationSync(() => fs.renameSync(tempPath, path));
    } catch (err) {
      try {
        fs.rmSync(tempPath, { force: true });
      } catch {
        // the next save of this file overwrites it
      }
      NotifyFileAccessProblem(`Could not write ${path}`, err);
      throw err;
    }
  }

  // Ends in ".meta" so that a folder's list of files skips one that a crash left
  // behind, and the next save of the same file overwrites it. A name ending in
  // ".meta" is also the metadata file of the file named without it, so skip any
  // name whose such file exists, rather than overwrite or delete its metadata.
  private static temporaryPathForSaving(path: string): string {
    for (let n = 1; ; n++) {
      const stem = `${path}.lameta-saving${n === 1 ? "" : "-" + n}`;
      if (!fs.existsSync(stem)) return stem + ".meta";
    }
  }

  private static writeAndFlush(path: string, contents: string) {
    const bytes = Buffer.from(contents, "utf8");
    const fd = fs.openSync(path, "w");
    try {
      let written = 0;
      while (written < bytes.length) {
        written += fs.writeSync(fd, bytes, written, bytes.length - written);
      }
      fs.fsyncSync(fd);
    } finally {
      fs.closeSync(fd);
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
