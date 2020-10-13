import * as Path from "path";
const util = require("util");
const sanitizeFilename = require("sanitize-filename");
const ASCIIFolder = require("fold-to-ascii");
import * as fs from "fs-extra";

export function sanitizeForArchive(
  name: string,
  allowOnlyImdiChars: boolean
): string {
  let n = name;
  if (allowOnlyImdiChars) {
    // first, get to ascii only
    n = ASCIIFolder.foldReplacing(n, "X");
    n = n.trim().replace(/\s/g, "_");
    // next, limit to a-z,A-Z,0-9, _ , -.
    // I added a period.
    const validChars =
      "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_.-";
    const regex = new RegExp("[^" + validChars + "]", "g");
    // ELAR would like to replace others with underline: https://trello.com/c/pPUR9Jj8/106-export-creates-files-with-prohibited-characters-only-permitted-characters-should-be-allowed
    n = n.replace(regex, "_");
  }
  // finally, make sure it is safe for filesystems
  n = sanitizeFilename(n);
  //console.log(`sanitizeForArchive(${name}) --> ${n}`);
  return n;
}
import * as child_process from "child_process";
import { sentryBreadCrumb, sentryException } from "./errorHandling";
import { NotifyError } from "./components/Notify";
import filesize from "filesize";

const execWithPromise = util.promisify(require("child_process").exec) as (
  s: string
) => Promise<{ stdout: string; stderr: string }>;

// copying large files on mac with node was very flaky. So we now use an external system command instead.
export function safeAsyncCopyFileWithErrorNotification(
  sourcePath: string,
  destPath: string
): Promise<string> {
  const size: string = filesize(fs.statSync(sourcePath).size);
  sentryBreadCrumb(`starting ${sourcePath} to  ${destPath}, ${size}`);

  const cmd =
    process.platform === "darwin"
      ? `cp "${sourcePath}", "${destPath}"`
      : `copy "${sourcePath}", "${destPath}" && echo "done"`;

  /* windows copy
     0      Files were copied without error.
    1      No files were found to copy.
    2      The user pressed CTRL+C to terminate xcopy.
    4      Initialization error occurred. There is not
           enough memory or disk space, or you entered
           an invalid drive name or invalid syntax on
           the command line.
    5      Disk write error occurred.

    there doesn't seem to be an equivalent on mac/linux
    */

  // See https://github.com/electron/electron/issues/25405
  let didCallback = false;
  const kTimeToWait = 1000;
  const encourageGettingACallback = () => {
    if (!didCallback) {
      window.setTimeout(() => {
        if (!didCallback) {
          console.log(`pinging ${destPath}`);
          child_process.exec("call");
          encourageGettingACallback();
        }
      }, kTimeToWait);
    }
  };

  encourageGettingACallback();

  return new Promise<string>((resolve, reject) => {
    console.log(`Starting copy ${destPath}`);
    child_process.exec(cmd, (error, stdout, stderr) => {
      didCallback = true;
      console.log(`done copy ${destPath}`);
      if (error) {
        sentryBreadCrumb(
          `error copying ${sourcePath} to  ${destPath}, ${size}`
        );
        sentryException(error);
        const msg = error.message;
        // if (error.code === "ENOSPC") {
        //   msg = "This hard drive does not have enough room to fit that file.";
        // }
        NotifyError(`${msg}`);
        reject(error);
      } else {
        sentryBreadCrumb(`finished copying ${sourcePath} to  ${destPath}`);
        resolve(destPath);
      }
    });
  });

  /*.then(({ stdout, stderr }) => {
        /* there was a report that mac were sometimes failing to copy the file in, and the user wasn't seeing an error.
        I cannot verify the last part of that. But these error reports came when we were doing copying in a very different way.
        Still, let's verify. 
        if (!fs.existsSync(dest)) {
          const msg =
            `Copy of ${path} to ${dest} failed: ` +
            "After copying, the file is not actually in the destination folder.";
          sentryErrorFromString(msg);
          NotifyError(msg);
          return null;
        }
        const f = new OtherFile(dest, this.customFieldRegistry);
        this.files.push(f);
        return f;
      })
      .catch((err) => {
        sentryException(err);
        let msg = err.message;
        if (err.code === "ENOSPC") {
          msg = "This hard drive does not have enough room to fit that file.";
        }
        NotifyError(`Copy of ${path} to ${dest} failed: ` + msg);
      });*/
}

export function getExtension(path: string) {
  return Path.extname(path).toLowerCase().replace(/\./g, "");
}
