import * as Path from "node:path";
import { getAppPath } from "./windowIpc";

// ffprobe is a binary that ships inside the ffmpeg-ffprobe-static package. electron-builder
// leaves it outside the asar archive (see asarUnpack in electron-builder.json5), because a
// file inside an asar cannot be spawned.
//
// The package's own index.js cannot tell us where that binary is: it builds its path from
// __dirname, and Vite bundles that code into dist/, so at runtime it answers
// "<app>/dist/ffprobe", which is nowhere. The path has to be derived from the app directory
// instead.
//
// When running from the dev server, app.getAppPath() is the repo root and node_modules is
// right there. When installed, it is ".../resources/app.asar", and the unpacked copy sits
// next to it in ".../resources/app.asar.unpacked".
//
// The main process imports this module too (src/mainProcess/launchTest.ts), so it must not
// import electron at the top level.
export function ffprobePathForAppPath(
  appPath: string,
  platform: string = process.platform,
): string {
  const binary = platform === "win32" ? "ffprobe.exe" : "ffprobe";
  const root = appPath.endsWith(".asar") ? `${appPath}.unpacked` : appPath;
  return Path.join(root, "node_modules", "ffmpeg-ffprobe-static", binary);
}

// Renderer only: windowIpc is how the renderer reaches the app path. The main process calls
// ffprobePathForAppPath directly with electron's own `app`.
export function getFfprobePath(): string {
  return ffprobePathForAppPath(getAppPath());
}
