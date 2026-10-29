import { describe, it, expect, vi } from "vitest";

// the real module reaches for @electron/remote at import time, which is not available here
vi.mock("@electron/remote", () => ({ app: { getAppPath: () => "" } }));

import { ffprobePathForAppPath } from "./ffprobePath";

const slashes = (path: string) => path.replace(/\\/g, "/");

describe("ffprobePathForAppPath", () => {
  it("points at the unpacked copy for an installed Windows app", () => {
    const appPath =
      "C:\\Users\\Lektor\\AppData\\Local\\Programs\\lameta\\resources\\app.asar";
    expect(slashes(ffprobePathForAppPath(appPath, "win32"))).toBe(
      "C:/Users/Lektor/AppData/Local/Programs/lameta/resources/app.asar.unpacked/node_modules/ffmpeg-ffprobe-static/ffprobe.exe"
    );
  });

  it("points at the unpacked copy for an installed Mac app", () => {
    const appPath = "/Applications/lameta.app/Contents/Resources/app.asar";
    expect(slashes(ffprobePathForAppPath(appPath, "darwin"))).toBe(
      "/Applications/lameta.app/Contents/Resources/app.asar.unpacked/node_modules/ffmpeg-ffprobe-static/ffprobe"
    );
  });

  it("points into node_modules when running from the dev server", () => {
    expect(slashes(ffprobePathForAppPath("C:\\dev\\lameta", "win32"))).toBe(
      "C:/dev/lameta/node_modules/ffmpeg-ffprobe-static/ffprobe.exe"
    );
  });

  it("does not mangle an app path that merely contains the text app.asar", () => {
    const appPath = "/home/jo/app.asar-experiments/lameta";
    expect(slashes(ffprobePathForAppPath(appPath, "linux"))).toBe(
      "/home/jo/app.asar-experiments/lameta/node_modules/ffmpeg-ffprobe-static/ffprobe"
    );
  });
});
