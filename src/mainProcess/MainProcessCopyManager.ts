import * as Path from "path";
import * as child_process from "child_process";
import * as fs from "fs-extra";
import filesize from "filesize";

export interface ICopyProgress {
  destination: string;
  progress: string; // e.g., "75%"
  fileName: string;
}

export interface ICopyResult {
  success: boolean;
  destination: string;
  error?: string;
}

/**
 * Copy job tracking for the main process.
 * Unlike the renderer's CopyManager, this doesn't use window-specific APIs.
 */
interface ICopyJob {
  process: child_process.ChildProcess;
  destination: string;
  progress: string;
  cancelled: boolean;
}

const activeJobs: ICopyJob[] = [];

/**
 * Main-process version of CopyManager for robust large file handling.
 * Uses rsync (macOS/Linux) or copy (Windows) shell commands for reliability.
 *
 * This is designed to work in the main process without renderer-specific APIs
 * like window.setTimeout or NotifyError.
 */
export class MainProcessCopyManager {
  private constructor() {}

  /**
   * Check if there are any active copy operations
   */
  public static hasActiveCopyJobs(): boolean {
    return activeJobs.length > 0;
  }

  /**
   * Get count of active copy jobs
   */
  public static getActiveCopyJobCount(): number {
    return activeJobs.length;
  }

  /**
   * Cancel all active copy jobs
   */
  public static cancelAllCopyJobs(): void {
    console.log(
      `[MainProcessCopyManager] Cancelling ${activeJobs.length} active jobs`
    );
    for (const job of activeJobs) {
      job.cancelled = true;
      try {
        job.process.kill("SIGINT");
      } catch (err) {
        console.error(`Error killing copy process: ${err}`);
      }
    }

    // Clean up partial files after a short delay
    setTimeout(() => {
      for (const job of activeJobs) {
        try {
          if (fs.existsSync(job.destination)) {
            fs.removeSync(job.destination);
          }
        } catch (err) {
          console.error(`Error removing partial file ${job.destination}: ${err}`);
        }
      }
      activeJobs.splice(0, activeJobs.length);
    }, 100);
  }

  /**
   * Copy a file using robust shell commands (rsync on macOS/Linux, copy on Windows).
   * This is more reliable for large files than Node's fs.copyFile.
   *
   * @param sourcePath - Absolute path to source file
   * @param destPath - Absolute path to destination
   * @param onProgress - Optional callback for progress updates (only works on non-Windows)
   * @returns Promise that resolves to the destination path on success
   */
  public static copyFileRobust(
    sourcePath: string,
    destPath: string,
    onProgress?: (progress: ICopyProgress) => void
  ): Promise<ICopyResult> {
    // Ensure destination directory exists
    const destDir = Path.dirname(destPath);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    const fileName = Path.basename(sourcePath);
    let size = "0 B";
    try {
      size = filesize(fs.statSync(sourcePath).size);
    } catch (e) {
      // File might not exist or be inaccessible
    }

    console.log(`[MainProcessCopyManager] Starting copy: ${fileName} (${size})`);

    const cmd = process.platform === "win32" ? "copy" : "rsync";

    const args =
      process.platform === "win32"
        ? [`"${toWin32Path(sourcePath)}"`, `"${toWin32Path(destPath)}"`, "/z"]
        : [`"${sourcePath}"`, `"${destPath}"`, "-t", "--progress"];

    return new Promise<ICopyResult>((resolve) => {
      const proc = child_process.spawn(cmd, args, {
        shell: true,
        detached: true // Allow copy to continue if lameta quits
      });

      const job: ICopyJob = {
        process: proc,
        destination: destPath,
        progress: "0%",
        cancelled: false
      };
      activeJobs.push(job);

      const percentage = /(\d+%)/g;

      proc.stdout?.on("data", (data: Buffer) => {
        const messages = data.toString().trim();
        const matches = percentage.exec(messages);
        if (matches && matches.length) {
          job.progress = matches[0];
          if (onProgress) {
            onProgress({
              destination: destPath,
              progress: matches[0],
              fileName
            });
          }
        }
      });

      proc.stderr?.on("data", (data: Buffer) => {
        const errMsg = data.toString();
        console.error(`[MainProcessCopyManager] Error copying ${fileName}: ${errMsg}`);
      });

      proc.on("error", (err) => {
        console.error(`[MainProcessCopyManager] Process error for ${fileName}: ${err.message}`);
        removeJob(job);
        resolve({
          success: false,
          destination: destPath,
          error: err.message
        });
      });

      proc.on("close", (code) => {
        removeJob(job);

        if (job.cancelled) {
          resolve({
            success: false,
            destination: destPath,
            error: "Copy cancelled"
          });
          return;
        }

        if (code) {
          const msg = `Copy of ${fileName} exited with code ${code}`;
          console.error(`[MainProcessCopyManager] ${msg}`);
          resolve({
            success: false,
            destination: destPath,
            error: msg
          });
        } else {
          console.log(`[MainProcessCopyManager] Finished copying ${fileName}`);
          resolve({
            success: true,
            destination: destPath
          });
        }
      });
    });
  }

  /**
   * Copy a file, falling back to fs.copyFile if shell command fails or for small files.
   * This provides the robustness of shell commands for large files while still working
   * when shell commands might not be available.
   *
   * @param sourcePath - Absolute path to source file
   * @param destPath - Absolute path to destination
   * @param onProgress - Optional callback for progress updates
   * @param sizeThresholdBytes - Use shell commands only for files larger than this (default: 10MB)
   */
  public static async copyFileWithFallback(
    sourcePath: string,
    destPath: string,
    onProgress?: (progress: ICopyProgress) => void,
    sizeThresholdBytes: number = 10 * 1024 * 1024 // 10MB
  ): Promise<ICopyResult> {
    const fileName = Path.basename(sourcePath);

    // Check file size
    let fileSize = 0;
    try {
      const stat = fs.statSync(sourcePath);
      fileSize = stat.size;
    } catch (err) {
      return {
        success: false,
        destination: destPath,
        error: `Cannot access source file: ${err.message}`
      };
    }

    // For small files, use fs.copyFile directly (faster for small files)
    if (fileSize < sizeThresholdBytes) {
      try {
        // Ensure destination directory exists
        await fs.ensureDir(Path.dirname(destPath));
        await fs.copyFile(sourcePath, destPath);
        // Preserve modification time
        const stat = await fs.stat(sourcePath);
        await fs.utimes(destPath, stat.atime, stat.mtime);

        if (onProgress) {
          onProgress({
            destination: destPath,
            progress: "100%",
            fileName
          });
        }

        return { success: true, destination: destPath };
      } catch (err) {
        return {
          success: false,
          destination: destPath,
          error: err.message
        };
      }
    }

    // For large files, use robust shell commands
    return this.copyFileRobust(sourcePath, destPath, onProgress);
  }
}

/**
 * Remove a job from the active jobs list
 */
function removeJob(job: ICopyJob): void {
  const index = activeJobs.findIndex((j) => j === job);
  if (index > -1) {
    activeJobs.splice(index, 1);
  }
}

/**
 * Convert Unix-style path to Windows-style path
 */
function toWin32Path(path: string): string {
  return path.replace(/\//gi, "\\");
}
