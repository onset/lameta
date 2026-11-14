import { describe, it, expect } from "vitest";
import { EventEmitter } from "events";
import { ffmpegArguments, lastProgressSeconds, runFfmpegProcess } from "./ffmpegProcess";

describe("ffmpegArguments", () => {
  it("puts input options before -i and output options before the output file", () => {
    expect(ffmpegArguments("in.mp3", ["-ss", "5"], ["-vn", "-ac", "1"], "out.wav")).toEqual([
      "-y",
      "-ss",
      "5",
      "-i",
      "in.mp3",
      "-vn",
      "-ac",
      "1",
      "out.wav",
    ]);
  });
});

describe("lastProgressSeconds", () => {
  it("reads the last time= in a chunk", () => {
    const chunk =
      "size=  1024kB time=00:00:01.50 bitrate=...\rsize=  2048kB time=01:02:03.25 bitrate=...";
    expect(lastProgressSeconds(chunk)).toBeCloseTo(3723.25);
  });
  it("ignores N/A and negative times", () => {
    expect(lastProgressSeconds("time=N/A bitrate=N/A")).toBeUndefined();
    expect(lastProgressSeconds("time=-00:00:00.02")).toBeUndefined();
    expect(lastProgressSeconds("Stream #0:0: Audio: mp3")).toBeUndefined();
  });
});

// A stand-in for a spawned ffmpeg process that the test drives.
function fakeChild() {
  const child: any = new EventEmitter();
  child.stderr = new EventEmitter();
  return child;
}

describe("runFfmpegProcess", () => {
  it("spawns the given binary with the arguments and reports progress", async () => {
    const child = fakeChild();
    const calls: any[] = [];
    const progress: number[] = [];
    const done = runFfmpegProcess(
      "/plugin/bin/ffmpeg",
      ["-i", "a"],
      (s) => progress.push(s),
      (cmd, args) => {
        calls.push([cmd, args]);
        return child;
      },
    );
    child.stderr.emit("data", Buffer.from("time=00:00:02.00 "));
    child.emit("close", 0, null);
    await expect(done).resolves.toBeUndefined();
    expect(calls).toEqual([["/plugin/bin/ffmpeg", ["-i", "a"]]]);
    expect(progress).toEqual([2]);
  });

  it("rejects with the binary, the exit code and the end of stderr", async () => {
    const child = fakeChild();
    const done = runFfmpegProcess("/p/ffmpeg", [], () => {}, () => child);
    child.stderr.emit("data", Buffer.from("line 1\nInvalid data found when processing input\n"));
    child.emit("close", 1, null);
    await expect(done).rejects.toThrow(
      /ffmpeg failed \(\/p\/ffmpeg\): exit code 1\n.*Invalid data found/s,
    );
  });

  it("finishes when the process writes more to stdout than a pipe holds", async () => {
    // Node stands in for an ffmpeg that was given `-progress pipe:1`.
    const script =
      "process.stdout.write('x'.repeat(5e6)); process.stderr.write('time=00:00:01.00 ');";
    const progress: number[] = [];
    await runFfmpegProcess(process.execPath, ["-e", script], (s) => progress.push(s));
    expect(progress).toEqual([1]);
  }, 20000);

  it("rejects, naming the binary, when spawn throws or emits an error", async () => {
    await expect(
      runFfmpegProcess("/p/not-exe", [], () => {}, () => {
        throw new Error("spawn UNKNOWN");
      }),
    ).rejects.toThrow(/ffmpeg failed \(\/p\/not-exe\): spawn UNKNOWN/);

    const child = fakeChild();
    const done = runFfmpegProcess("/p/missing", [], () => {}, () => child);
    child.emit("error", new Error("spawn ENOENT"));
    await expect(done).rejects.toThrow(/ffmpeg failed \(\/p\/missing\): spawn ENOENT/);
  });
});
