// Runs one ffmpeg conversion as a child process for the plugin API's `ffmpeg.run`.
//
// The binary is whichever one resolveFfmpegPath chose (usually the plugin's own), so this spawns
// it directly rather than through fluent-ffmpeg, whose ffmpeg path is one module-wide setting.

import { spawn as nodeSpawn, ChildProcess } from "child_process";

/** The argument list for converting `input` to `outputFile`: the plugin's input options before
 * `-i`, its output options after, `-y` so the (temporary) output may be overwritten. */
export function ffmpegArguments(
  input: string,
  inputArgs: readonly string[],
  outputArgs: readonly string[],
  outputFile: string,
): string[] {
  return ["-y", ...inputArgs, "-i", input, ...outputArgs, outputFile];
}

/** The last `time=HH:MM:SS.xx` that ffmpeg reported in a chunk of its stderr, in seconds, or
 * undefined when the chunk has none (or only `time=N/A`). */
export function lastProgressSeconds(stderrChunk: string): number | undefined {
  let seconds: number | undefined;
  for (const m of stderrChunk.matchAll(/time=\s*(-?)(\d+):(\d{2}):(\d{2}(?:\.\d+)?)/g)) {
    if (m[1] === "-") continue;
    seconds = Number(m[2]) * 3600 + Number(m[3]) * 60 + Number(m[4]);
  }
  return seconds;
}

export type SpawnProcess = (command: string, args: string[]) => ChildProcess;

/**
 * Run ffmpeg and resolve when it exits with code 0. `onProgress` gets the seconds of output
 * written so far. A failure, including a binary that cannot be spawned at all, rejects with an
 * error that names the binary and ends with the last lines of ffmpeg's stderr.
 */
export function runFfmpegProcess(
  ffmpegPath: string,
  args: string[],
  onProgress: (seconds: number) => void,
  // Only stderr is read. stdin and stdout are not connected: a pipe that nothing reads fills up,
  // and ffmpeg then blocks, e.g. when a plugin passes `-progress pipe:1`.
  spawn: SpawnProcess = (command, a) =>
    nodeSpawn(command, a, { windowsHide: true, stdio: ["ignore", "ignore", "pipe"] }),
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    let stderr = "";
    const fail = (reason: string) => {
      const tail = stderr
        .trim()
        .split(/\r?\n|\r/)
        .slice(-8)
        .join("\n");
      reject(new Error(`ffmpeg failed (${ffmpegPath}): ${reason}${tail ? "\n" + tail : ""}`));
    };
    let child: ChildProcess;
    try {
      // On Windows, a file that is not a valid executable makes spawn throw synchronously.
      child = spawn(ffmpegPath, args);
    } catch (e: any) {
      fail(e?.message || String(e));
      return;
    }
    child.stderr?.on("data", (d) => {
      const text = d.toString();
      // Keep only the end of stderr: it is what an error message needs, and a long conversion
      // writes a progress line many times a second.
      stderr = (stderr + text).slice(-16000);
      const seconds = lastProgressSeconds(text);
      if (seconds !== undefined) onProgress(seconds);
    });
    child.on("error", (e) => fail(e.message));
    child.on("close", (code, signal) => {
      if (code === 0) resolve();
      else fail(signal ? `stopped by ${signal}` : `exit code ${code}`);
    });
  });
}
