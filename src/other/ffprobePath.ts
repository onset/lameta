import * as Path from "node:path";
import { getAppPath } from "./windowIpc";

// ffmpeg and ffprobe are binaries that ship inside the ffmpeg-ffprobe-static package.
// electron-builder leaves them outside the asar archive (see asarUnpack in
// electron-builder.json5), because a file inside an asar cannot be spawned.
//
// The package's own index.js cannot tell us where those binaries are: it builds their paths
// from __dirname, and Vite bundles that code into dist/, so at runtime it answers
// "<app>/dist/ffprobe", which is nowhere. The paths have to be derived from the app directory
// instead.
//
// When running from the dev server, app.getAppPath() is the repo root and node_modules is
// right there. When installed, it is ".../resources/app.asar", and the unpacked copy sits
// next to it in ".../resources/app.asar.unpacked".
//
// The main process imports this module too (src/mainProcess/launchTest.ts), so it must not
// import electron at the top level.
function staticBinaryPath(appPath: string, name: "ffmpeg" | "ffprobe", platform: string): string {
  const binary = platform === "win32" ? `${name}.exe` : name;
  const root = appPath.endsWith(".asar") ? `${appPath}.unpacked` : appPath;
  return Path.join(root, "node_modules", "ffmpeg-ffprobe-static", binary);
}

export function ffprobePathForAppPath(
  appPath: string,
  platform: string = process.platform,
): string {
  return staticBinaryPath(appPath, "ffprobe", platform);
}

export function ffmpegPathForAppPath(appPath: string, platform: string = process.platform): string {
  return staticBinaryPath(appPath, "ffmpeg", platform);
}

// Renderer only: windowIpc is how the renderer reaches the app path. The main process calls
// ffprobePathForAppPath directly with electron's own `app`.
export function getFfprobePath(): string {
  return ffprobePathForAppPath(getAppPath());
}

export function getFfmpegPath(): string {
  return ffmpegPathForAppPath(getAppPath());
}
