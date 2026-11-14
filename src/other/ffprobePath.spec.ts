import { describe, it, expect } from "vitest";
import { ffmpegPathForAppPath, ffprobePathForAppPath } from "./ffprobePath";

const slashes = (path: string) => path.replace(/\\/g, "/");

describe("ffprobePathForAppPath", () => {
  it("points at the unpacked copy for an installed Windows app", () => {
    const appPath = "C:\\Users\\Lektor\\AppData\\Local\\Programs\\lameta\\resources\\app.asar";
    expect(slashes(ffprobePathForAppPath(appPath, "win32"))).toBe(
      "C:/Users/Lektor/AppData/Local/Programs/lameta/resources/app.asar.unpacked/node_modules/ffmpeg-ffprobe-static/ffprobe.exe",
    );
  });

  it("points at the unpacked copy for an installed Mac app", () => {
    const appPath = "/Applications/lameta.app/Contents/Resources/app.asar";
    expect(slashes(ffprobePathForAppPath(appPath, "darwin"))).toBe(
      "/Applications/lameta.app/Contents/Resources/app.asar.unpacked/node_modules/ffmpeg-ffprobe-static/ffprobe",
    );
  });

  it("points into node_modules when running from the dev server", () => {
    expect(slashes(ffprobePathForAppPath("C:\\dev\\lameta", "win32"))).toBe(
      "C:/dev/lameta/node_modules/ffmpeg-ffprobe-static/ffprobe.exe",
    );
  });

  it("does not mangle an app path that merely contains the text app.asar", () => {
    const appPath = "/home/jo/app.asar-experiments/lameta";
    expect(slashes(ffprobePathForAppPath(appPath, "linux"))).toBe(
      "/home/jo/app.asar-experiments/lameta/node_modules/ffmpeg-ffprobe-static/ffprobe",
    );
  });
});

describe("ffmpegPathForAppPath", () => {
  it("points at the unpacked copy for an installed Windows app", () => {
    const appPath = "C:\\Users\\Lektor\\AppData\\Local\\Programs\\lameta\\resources\\app.asar";
    expect(slashes(ffmpegPathForAppPath(appPath, "win32"))).toBe(
      "C:/Users/Lektor/AppData/Local/Programs/lameta/resources/app.asar.unpacked/node_modules/ffmpeg-ffprobe-static/ffmpeg.exe",
    );
  });

  it("points at the unpacked copy for an installed Mac app", () => {
    const appPath = "/Applications/lameta.app/Contents/Resources/app.asar";
    expect(slashes(ffmpegPathForAppPath(appPath, "darwin"))).toBe(
      "/Applications/lameta.app/Contents/Resources/app.asar.unpacked/node_modules/ffmpeg-ffprobe-static/ffmpeg",
    );
  });

  it("points into node_modules when running from the dev server", () => {
    expect(slashes(ffmpegPathForAppPath("C:\\dev\\lameta", "win32"))).toBe(
      "C:/dev/lameta/node_modules/ffmpeg-ffprobe-static/ffmpeg.exe",
    );
  });

  it("does not mangle an app path that merely contains the text app.asar", () => {
    const appPath = "/home/jo/app.asar-experiments/lameta";
    expect(slashes(ffmpegPathForAppPath(appPath, "linux"))).toBe(
      "/home/jo/app.asar-experiments/lameta/node_modules/ffmpeg-ffprobe-static/ffmpeg",
    );
  });
});
